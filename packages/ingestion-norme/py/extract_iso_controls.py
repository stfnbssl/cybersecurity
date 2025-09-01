#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Extract ISO/IEC 27001:2022 Annex A controls and ISO/IEC 27002:2022 details
from PDF files using PyMuPDF (fitz) + regex heuristics, then export as JSON/CSV
and populate a SQLite database with a canonical schema suitable for cross-standard mapping.

Usage:
  pip install pymupdf
  python extract_iso_controls.py --iso27001 path/to/ISOIEC-27001-2022.pdf --iso27002 path/to/ISOIEC-27002-2022.pdf --outdir ./out

Notes:
- This script works best on digital PDFs. For scans, run OCR first (e.g., with ocrmypdf) to get text.
- The ISO PDFs can vary in layout. You may need to adjust regex patterns for your specific copy.
- The script tries to be conservative and log warnings when it can't find sections.
"""

import os
import re
import json
import csv
import hashlib
import argparse
import datetime
import sqlite3
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple, Optional


NBSP = u"\xa0"
CTRL_TITLE_FALLBACK_RE = re.compile(r'(A\.(?:\d{1,2})\.(?:\d{1,2}))\s+([^\n]{1,160})')

def normalize_ws(s: str) -> str:
    # replace non-breaking spaces with regular spaces
    return s.replace(NBSP, " ")

def context_snippet(text: str, start: int, end: int, pad: int = 80) -> str:
    a = max(0, start - pad)
    b = min(len(text), end + pad)
    return text[a:b].replace("\n", " ")
try:
    import fitz  # PyMuPDF
except Exception as e:
    raise SystemExit("PyMuPDF (fitz) is required. Install with: pip install pymupdf\nError: %s" % e)


THEME_BY_PREFIX = {
    "A.5": "organizational",
    "A.6": "people",
    "A.7": "physical",
    "A.8": "technological",
}

CTRL_TITLE_RE = re.compile(r'^(A\.(?:\d{1,2})\.(?:\d{1,2}))\s+(.+)$', re.MULTILINE)
PURPOSE_RE = re.compile(r'^\s*(Purpose)\s*\n(.*?)(?=\n\s*(Guidance|Other information|A\.\d+\.\d+|\Z))', re.IGNORECASE | re.DOTALL | re.MULTILINE)
GUIDANCE_RE = re.compile(r'^\s*(Guidance)\s*\n(.*?)(?=\n\s*(Other information|A\.\d+\.\d+|\Z))', re.IGNORECASE | re.DOTALL | re.MULTILINE)
OTHER_INFO_RE = re.compile(r'^\s*(Other information)\s*\n(.*?)(?=\n\s*(A\.\d+\.\d+|\Z))', re.IGNORECASE | re.DOTALL | re.MULTILINE)

# Attributes seen in ISO/IEC 27002:2022 (names vary across editions/translations)
ATTR_PATTERNS = {
    "control_type": re.compile(r'Control type\s*[:\-]\s*(.+)', re.IGNORECASE),
    "information_security_properties": re.compile(r'Information security propert(?:y|ies)\s*[:\-]\s*(.+)', re.IGNORECASE),
    "cybersecurity_concepts": re.compile(r'Cybersecurity concepts?\s*[:\-]\s*(.+)', re.IGNORECASE),
    "operational_capabilities": re.compile(r'Operational capabilit(?:y|ies)\s*[:\-]\s*(.+)', re.IGNORECASE),
    "security_domains": re.compile(r'(Security domains?|Security domain)\s*[:\-]\s*(.+)', re.IGNORECASE),
    "platforms": re.compile(r'(Technology|Platform|Platforms)\s*[:\-]\s*(.+)', re.IGNORECASE),
}

HEADER_FOOTER_HINTS = [
    # add common strings that appear on every page to strip
    "ISO/IEC 27001:2022",
    "ISO/IEC 27002:2022",
    "©",
    "All rights reserved",
    "Annex A",
]


@dataclass
class Control27001:
    control_id: str
    control_name: str
    definition: str
    theme: str
    pages: str


@dataclass
class Control27002:
    control_id: str
    control_name: str
    purpose: str
    guidance: str
    other_info: str
    attributes: Dict[str, List[str]]
    pages: str


def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def load_pdf_text(path: str, mode: str = 'text') -> Tuple[str, Dict[int, str]]:
    """Extract text page-by-page and return concatenated text and a dict of page texts."""
    doc = fitz.open(path)
    pages = {}
    texts = []
    for i, page in enumerate(doc):
        t = page.get_text("text") if mode=="text" else "\n".join([b[4] for b in page.get_text("blocks")])
        pages[i+1] = t
        texts.append(t)
    full_text = "\n".join(texts)
    return full_text, pages


import re

def clean_text(text: str) -> str:
    """
    Pulisce un testo mantenendo line feed (\n) e tab (\t), compattando
    tutti gli altri whitespace (spazi, caratteri invisibili) in un singolo spazio.
    Rimuove caratteri di controllo come BOM e altri caratteri invisibili.
    
    Args:
        text (str): Il testo da pulire
        
    Returns:
        str: Il testo pulito
    """
    # Prima rimuoviamo BOM e altri caratteri di controllo invisibili
    # \ufeff = BOM, \u200b = zero-width space, \u200c = zero-width non-joiner, ecc.
    text = re.sub(r'[\ufeff\u200b\u200c\u200d\u2060\ufff9\ufffa\ufffb]', '', text)
    
    # Rimuoviamo anche altri caratteri di controllo Unicode (categorie Cc e Cf eccetto \n e \t)
    text = re.sub(r'[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u0600-\u0605\u061c\u06dd\u070f\u08e2\u180e\u200e\u200f\u202a-\u202e\u2066-\u2069\u206a-\u206f]', '', text)
    
    # Sostituiamo tutti i whitespace eccetto \n e \t con uno spazio singolo
    # [^\S\n\t] significa: qualsiasi whitespace eccetto newline e tab
    cleaned = re.sub(r'[^\S\n\t]+', ' ', text)
    
    return cleaned

def clean_text_old2(text: str) -> str:
    """
    Pulisce un testo mantenendo solo i line feed (\n) e compattando
    tutti gli altri whitespace (spazi, tab, caratteri invisibili) in un singolo spazio.
    Rimuove anche caratteri di controllo come BOM e altri caratteri invisibili.
    
    Args:
        text (str): Il testo da pulire
        
    Returns:
        str: Il testo pulito
    """
    # Prima rimuoviamo BOM e altri caratteri di controllo invisibili
    # \ufeff = BOM, \u200b = zero-width space, \u200c = zero-width non-joiner, ecc.
    text = re.sub(r'[\ufeff\u200b\u200c\u200d\u2060\ufff9\ufffa\ufffb]', '', text)
    
    # Rimuoviamo anche altri caratteri di controllo Unicode (categorie Cc e Cf eccetto \n)
    text = re.sub(r'[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u00ad\u0600-\u0605\u061c\u06dd\u070f\u08e2\u180e\u200e\u200f\u202a-\u202e\u2066-\u2069\u206a-\u206f]', '', text)
    
    # Poi sostituiamo tutti i whitespace eccetto \n con uno spazio singolo
    cleaned = re.sub(r'[^\S\n]+', ' ', text)
    
    return cleaned

def clean_text_old(text: str) -> str:
    # Remove common headers/footers and normalize spaces
    # You may refine this to detect repeated headers/footers across pages.
    text = normalize_ws(text)
    for hint in HEADER_FOOTER_HINTS:
        text = re.sub(re.escape(hint), "", text)
    # Fix hyphenation at EOL like "inform-\nation"
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    # Normalize multiple spaces/newlines
    # collapse runs of spaces but keep line breaks
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text.strip()


def slice_chunks_by_controls(text: str) -> List[Tuple[str, str, int, int]]:
    """
    Split the text into chunks per control using CTRL_TITLE_RE.
    Returns list of tuples: (control_id, control_name, start_idx, end_idx)
    """
    matches = list(CTRL_TITLE_RE.finditer(text))
    if not matches:
        # Fallback: non-line-anchored search
        matches = list(CTRL_TITLE_FALLBACK_RE.finditer(text))
    chunks = []
    for idx, m in enumerate(matches):
        cid, cname = m.group(1), m.group(2).strip()
        start = m.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        chunks.append((cid, cname, start, end))
    return chunks


def infer_theme(control_id: str) -> str:
    for prefix, theme in THEME_BY_PREFIX.items():
        if control_id.startswith(prefix):
            return theme
    return "unknown"


def page_span_for_indices(page_texts: Dict[int, str], full_text: str, start: int, end: int) -> str:
    """
    Heuristic: find which pages contain the segment by cumulative length mapping.
    """
    # Build cumulative offsets for pages
    offsets = []
    acc = 0
    for p in sorted(page_texts.keys()):
        t = page_texts[p]
        offsets.append((p, acc, acc + len(t)))
        acc += len(t) + 1  # +1 for the newline we inserted

    def idx_to_page(i: int) -> int:
        for p, s, e in offsets:
            if s <= i < e:
                return p
        return offsets[-1][0] if offsets else 1

    p1 = idx_to_page(start)
    p2 = idx_to_page(end)
    if p1 == p2:
        return f"{p1}"
    return f"{p1}-{p2}"


def extract_27001_controls(full_text: str, page_texts: Dict[int, str]) -> List[Control27001]:
    controls = []
    for cid, cname, s, e in slice_chunks_by_controls(full_text):
        # Definition: the paragraph(s) after the title up to next control
        body = full_text[s:e]
        # Remove the title line itself
        body_wo_title = body.split("\n", 1)[1] if "\n" in body else ""
        definition = body_wo_title.strip()
        # Often the definition is the first paragraph; to be conservative, take up to two blank lines or 600 chars
        definition = definition.split("\n\n")[0].strip()
        if len(definition) > 800:
            definition = definition[:800].rsplit(' ', 1)[0].strip() + " …"
        theme = infer_theme(cid)
        pages = page_span_for_indices(page_texts, full_text, s, e)
        controls.append(Control27001(
            control_id=cid,
            control_name=cname,
            definition=definition,
            theme=theme,
            pages=pages
        ))
    return controls


def split_attributes(raw_text: str) -> Dict[str, List[str]]:
    """
    Parse attributes from a control chunk. Each matched attribute is split by comma/semicolon and trimmed.
    """
    out = {}
    for key, pattern in ATTR_PATTERNS.items():
        m = pattern.search(raw_text)
        if not m:
            continue
        # Group 1/2 depending on pattern
        if key in ["security_domains", "platforms"]:
            val = m.group(2)
        else:
            val = m.group(1)
        parts = [p.strip(" ;,.") for p in re.split(r'[;,/]', val) if p.strip()]
        out[key] = parts
    return out


def extract_27002_controls(full_text: str, page_texts: Dict[int, str]) -> List[Control27002]:
    results = []
    for cid, cname, s, e in slice_chunks_by_controls(full_text):
        chunk = full_text[s:e]

        # Remove the title line from chunk when scanning sections
        chunk_wo_title = chunk.split("\n", 1)[1] if "\n" in chunk else ""

        purpose = ""
        guidance = ""
        other = ""

        m = PURPOSE_RE.search(chunk_wo_title)
        if m: purpose = m.group(2).strip()

        m = GUIDANCE_RE.search(chunk_wo_title)
        if m: guidance = m.group(2).strip()

        m = OTHER_INFO_RE.search(chunk_wo_title)
        if m: other = m.group(2).strip()

        attrs = split_attributes(chunk_wo_title)
        pages = page_span_for_indices(page_texts, full_text, s, e)

        results.append(Control27002(
            control_id=cid,
            control_name=cname,
            purpose=purpose,
            guidance=guidance,
            other_info=other,
            attributes=attrs,
            pages=pages
        ))
    return results


def merge_controls(c01: List[Control27001], c02: List[Control27002]) -> List[Dict]:
    m02 = {c.control_id: c for c in c02}
    merged = []
    for c in c01:
        c2 = m02.get(c.control_id)
        entry = {
            "control_id": c.control_id,
            "control_name": c.control_name,
            "theme": c.theme,
            "sources": []
        }
        entry["sources"].append({
            "standard_id": "ISO27001:2022",
            "definition": c.definition,
            "pages": c.pages
        })
        if c2:
            entry["sources"].append({
                "standard_id": "ISO27002:2022",
                "purpose": c2.purpose,
                "guidance": c2.guidance,
                "other_info": c2.other_info,
                "attributes": c2.attributes,
                "pages": c2.pages
            })
        merged.append(entry)
    # Add any 27002-only controls (shouldn't happen, but just in case)
    ids01 = set([c.control_id for c in c01])
    for c in c02:
        if c.control_id not in ids01:
            merged.append({
                "control_id": c.control_id,
                "control_name": c.control_name,
                "theme": "unknown",
                "sources": [{
                    "standard_id": "ISO27002:2022",
                    "purpose": c.purpose,
                    "guidance": c.guidance,
                    "other_info": c.other_info,
                    "attributes": c.attributes,
                    "pages": c.pages
                }]
            })
    return merged


def ensure_outdir(path: str):
    os.makedirs(path, exist_ok=True)


def export_json(data: List[Dict], out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def export_csv(data: List[Dict], out_path: str):
    # Flatten to a single row per control; include basic 27001/27002 fields
    fieldnames = [
        "control_id","control_name","theme",
        "def_27001","purpose_27002","guidance_27002","other_info_27002",
        "attributes_27002"
    ]
    with open(out_path, "w", encoding="utf-8", newline="") as csvfile:
        w = csv.DictWriter(csvfile, fieldnames=fieldnames)
        w.writeheader()
        for d in data:
            # Find sources by standard_id
            def01 = ""
            purp = ""
            guid = ""
            other = ""
            attrs = ""
            for s in d.get("sources", []):
                if s.get("standard_id") == "ISO27001:2022":
                    def01 = s.get("definition","")
                elif s.get("standard_id") == "ISO27002:2022":
                    purp = s.get("purpose","")
                    guid = s.get("guidance","")
                    other = s.get("other_info","")
                    attrs = json.dumps(s.get("attributes", {}), ensure_ascii=False)
            w.writerow({
                "control_id": d.get("control_id",""),
                "control_name": d.get("control_name",""),
                "theme": d.get("theme",""),
                "def_27001": def01,
                "purpose_27002": purp,
                "guidance_27002": guid,
                "other_info_27002": other,
                "attributes_27002": attrs
            })


def init_sqlite(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript("""
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS standards (
        standard_id TEXT PRIMARY KEY,
        edition_date TEXT,
        source_path TEXT,
        source_sha256 TEXT,
        license_note TEXT
    );

    CREATE TABLE IF NOT EXISTS controls (
        control_uid TEXT PRIMARY KEY,
        control_id TEXT NOT NULL,
        control_name TEXT NOT NULL,
        theme TEXT CHECK (theme in ('organizational','people','physical','technological','unknown'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_controls_control_id ON controls(control_id);

    CREATE TABLE IF NOT EXISTS control_texts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        control_uid TEXT NOT NULL,
        standard_id TEXT NOT NULL,
        definition TEXT,
        purpose TEXT,
        guidance TEXT,
        other_info TEXT,
        pages TEXT,
        extracted_at TEXT,
        extract_tool TEXT,
        page_span TEXT,
        FOREIGN KEY (control_uid) REFERENCES controls(control_uid) ON DELETE CASCADE,
        FOREIGN KEY (standard_id) REFERENCES standards(standard_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS control_attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        control_uid TEXT NOT NULL,
        attribute_name TEXT NOT NULL,
        attribute_value TEXT NOT NULL,
        FOREIGN KEY (control_uid) REFERENCES controls(control_uid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        control_uid_src TEXT NOT NULL,
        control_uid_dst TEXT NOT NULL,
        relationship TEXT CHECK (relationship in ('equivalent','broader','narrower','related')),
        confidence REAL,
        rationale TEXT,
        FOREIGN KEY (control_uid_src) REFERENCES controls(control_uid) ON DELETE CASCADE,
        FOREIGN KEY (control_uid_dst) REFERENCES controls(control_uid) ON DELETE CASCADE
    );
    """)
    conn.commit()
    return conn


def upsert_standard(conn, standard_id: str, source_path: str):
    cur = conn.cursor()
    sha = sha256_of_file(source_path) if os.path.exists(source_path) else ""
    edition_date = "2022-10-25" if "27001" in os.path.basename(source_path) else ""
    if "27002" in os.path.basename(source_path):
        edition_date = "2022-02-15"  # adjust if needed
    cur.execute("""
        INSERT OR REPLACE INTO standards (standard_id, edition_date, source_path, source_sha256, license_note)
        VALUES (?, ?, ?, ?, COALESCE((SELECT license_note FROM standards WHERE standard_id=?), ''))
    """, (standard_id, edition_date, source_path, sha, standard_id))
    conn.commit()


def uid(control_id: str) -> str:
    # deterministic UID from control_id
    h = hashlib.sha1(control_id.encode("utf-8")).hexdigest()
    return f"ISO-A-{h[:16]}"


def insert_controls(conn, merged: List[Dict]):
    cur = conn.cursor()
    now = datetime.datetime.utcnow().isoformat() + "Z"
    for d in merged:
        cu = uid(d["control_id"])
        cur.execute("""
            INSERT OR IGNORE INTO controls (control_uid, control_id, control_name, theme)
            VALUES (?, ?, ?, ?)
        """, (cu, d["control_id"], d.get("control_name",""), d.get("theme","unknown")))

        for s in d.get("sources", []):
            std = s.get("standard_id")
            definition = s.get("definition")
            purpose = s.get("purpose")
            guidance = s.get("guidance")
            other = s.get("other_info")
            pages = s.get("pages")

            cur.execute("""
                INSERT INTO control_texts (control_uid, standard_id, definition, purpose, guidance, other_info, pages, extracted_at, extract_tool, page_span)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cu, std, definition, purpose, guidance, other, pages, now, "PyMuPDF+regex", pages))

            if std == "ISO27002:2022":
                attrs = s.get("attributes", {})
                for k, vals in attrs.items():
                    for v in vals:
                        cur.execute("""
                            INSERT INTO control_attributes (control_uid, attribute_name, attribute_value)
                            VALUES (?, ?, ?)
                        """, (cu, k, v))

    conn.commit()



def dump_texts(iso27001_pdf: str, iso27002_pdf: str, outdir: str, text_mode: str = "text"):
    os.makedirs(outdir, exist_ok=True)
    for tag, path in [("27001", iso27001_pdf), ("27002", iso27002_pdf)]:
        full, pages = load_pdf_text(path, mode=text_mode)
        raw_path = os.path.join(outdir, f"{tag}-raw.txt")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(full)
        cleaned = clean_text(full)
        clean_path = os.path.join(outdir, f"{tag}-clean.txt")
        with open(clean_path, "w", encoding="utf-8") as f:
            f.write(cleaned)
        # Per-page dumps
        page_dir = os.path.join(outdir, f"{tag}-pages")
        os.makedirs(page_dir, exist_ok=True)
        for pno, txt in pages.items():
            with open(os.path.join(page_dir, f"{pno:03d}.txt"), "w", encoding="utf-8") as f:
                f.write(txt)

def write_match_debug(text: str, out_csv: str):
    rows = []
    matches = list(CTRL_TITLE_RE.finditer(text))
    used = "anchored"
    if not matches:
        matches = list(CTRL_TITLE_FALLBACK_RE.finditer(text))
        used = "fallback"
    for m in matches:
        cid, cname = m.group(1), m.group(2).strip()
        start, end = m.start(), m.end()
        rows.append({
            "regex_used": used,
            "start": start,
            "end": end,
            "control_id": cid,
            "control_name": cname,
            "context": context_snippet(text, start, end, 120)
        })
    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        import csv
        w = csv.DictWriter(f, fieldnames=["regex_used","start","end","control_id","control_name","context"])
        w.writeheader()
        for r in rows:
            w.writerow(r)


def run(iso27001_pdf: str, iso27002_pdf: str, outdir: str, text_mode: str = 'text', debug_matches: bool = False, dump_text: bool = False):
    os.makedirs(outdir, exist_ok=True)

    # 27001
    text01, pages01 = load_pdf_text(iso27001_pdf, mode=text_mode)
    text01 = clean_text(text01)

    # Focus on Annex A if possible: try to slice from "Annex A" to end
    m_annex = re.search(r'Annex\s*A\b.*', text01, re.IGNORECASE | re.DOTALL)
    if m_annex:
        text01_annex = m_annex.group(0)
    else:
        text01_annex = text01  # fallback

    controls01 = extract_27001_controls(text01_annex, pages01)

    # 27002
    text02, pages02 = load_pdf_text(iso27002_pdf, mode=text_mode)
    text02 = clean_text(text02)
    controls02 = extract_27002_controls(text02, pages02)

    # Optional debug outputs
    if dump_text:
        dump_texts(iso27001_pdf, iso27002_pdf, outdir, text_mode=text_mode)
    if debug_matches:
        write_match_debug(text01, os.path.join(outdir, '27001-matches.csv'))
        write_match_debug(text02, os.path.join(outdir, '27002-matches.csv'))

    # Merge 1:1 by control_id
    merged = merge_controls(controls01, controls02)

    # Write JSON
    json_path = os.path.join(outdir, "iso_controls_27001_27002.json")
    export_json(merged, json_path)

    # CSV
    csv_path = os.path.join(outdir, "iso_controls_27001_27002.csv")
    export_csv(merged, csv_path)

    # SQLite
    db_path = os.path.join(outdir, "iso_controls.db")
    conn = init_sqlite(db_path)
    # Upsert standards
    upsert_standard(conn, "ISO27001:2022", iso27001_pdf)
    upsert_standard(conn, "ISO27002:2022", iso27002_pdf)
    # Data
    insert_controls(conn, merged)
    conn.close()

    # Also emit a README with quick notes
    readme_path = os.path.join(outdir, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("# ISO 27001/27002 Controls Extraction Output\n\n")
        f.write("- `iso_controls_27001_27002.json`: merged JSON per control (27001+27002)\n")
        f.write("- `iso_controls_27001_27002.csv`: flattened CSV\n")
        f.write("- `iso_controls.db`: SQLite with tables `standards`, `controls`, `control_texts`, `control_attributes`, `mappings`\n")
        f.write("\n## How it works\n")
        f.write("Extraction uses PyMuPDF text + regex to find control titles like `A.5.1 Title` and sections in 27002 (`Purpose`, `Guidance`, `Other information`).\n")
        f.write("Attributes like `Control type` and `Information security properties` are parsed when present.\n")

    return {
        "json": json_path,
        "csv": csv_path,
        "db": db_path,
        "readme": readme_path
    }



def load_config(config_path: str) -> dict:
    if not os.path.exists(config_path):
        raise SystemExit(f"Config file not found: {config_path}")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception as e:
        raise SystemExit(f"Failed to read JSON config: {e}")
    if not isinstance(cfg, dict) or "iec_27001" not in cfg or not isinstance(cfg["iec_27001"], dict):
        raise SystemExit("Config must be a JSON object with a root property 'iec_27001' (object).")
    if not isinstance(cfg["iec_27001"], dict) or "step0" not in cfg["iec_27001"] or not isinstance(cfg["iec_27001"]["step0"], dict):
        raise SystemExit("Config must be a JSON object with a root property 'iec_27001.step0' (object).")
    return cfg["iec_27001"]["step0"]



def main():
    ap = argparse.ArgumentParser(
        description="Extract ISO/IEC 27001 Annex A and ISO/IEC 27002 control details from PDFs."
    )
    ap.add_argument("--config", help="Path to JSON config with root property 'iec_27001' (iso27001, iso27002, outdir).")
    ap.add_argument("--iso27001", help="Path to ISO/IEC 27001:2022 PDF (overrides config)")
    ap.add_argument("--iso27002", help="Path to ISO/IEC 27002:2022 PDF (overrides config)")
    ap.add_argument("--outdir", help="Output directory (overrides config)")
    ap.add_argument("--dump-text", action="store_true", help="Write raw/clean text and per-page text files for both PDFs")
    ap.add_argument("--debug-matches", action="store_true", help="Write CSVs with detected control titles and context")
    ap.add_argument("--text-mode", choices=["text","blocks"], default="text", help="PyMuPDF text mode")
    args = ap.parse_args()

    cfg = {"iso27001": None, "iso27002": None, "outdir": None}
    if args.config:
        cfg_from_file = load_config(args.config)
        for k in ["iso27001", "iso27002", "outdir"]:
            if k in cfg_from_file and cfg_from_file[k]:
                cfg[k] = cfg_from_file[k]

    if args.iso27001:
        cfg["iso27001"] = args.iso27001
    if args.iso27002:
        cfg["iso27002"] = args.iso27002
    if args.outdir:
        cfg["outdir"] = args.outdir

    missing = [k for k, v in cfg.items() if not v]
    if missing:
        example = {
            "iec_27001": {
                "iso27001": "/path/to/ISOIEC-27001-2022.pdf",
                "iso27002": "/path/to/ISOIEC-27002-2022.pdf",
                "outdir": "./out"
            }
        }
        raise SystemExit(
            "Missing required settings: "
            + ", ".join(missing)
            + "\nProvide them via --config or CLI flags.\nExample JSON:\n"
            + json.dumps(example, indent=2)
        )

    for path in [cfg["iso27001"], cfg["iso27002"]]:
        if not os.path.exists(path):
            raise SystemExit(f"File not found: {path}")

    res = run(
        cfg["iso27001"],
        cfg["iso27002"],
        cfg["outdir"],
        text_mode=args.text_mode,
        debug_matches=args.debug_matches,
        dump_text=args.dump_text
    )
    print("Done. Outputs:")
    for k, v in res.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
