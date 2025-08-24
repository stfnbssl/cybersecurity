import os
import re
import json
import csv
import hashlib
import argparse
from typing import List, Dict, Tuple, Optional

try:
    import fitz  # PyMuPDF
except Exception as e:
    raise SystemExit("PyMuPDF (fitz) is required. Install with: pip install pymupdf\nError: %s" % e)

def calculate_indent(x_position: float, base_margin: float = 50.0) -> str:
    """
    Calcola il rientro basandosi sulla posizione X.
    """
    if x_position <= base_margin:
        return ""
    
    indent_level = int((x_position - base_margin) / 20)
    return "  " * max(0, indent_level)

def load_pdf_with_indents_simple(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Versione semplice e affidabile che preserva i rientri usando get_text("blocks").
    """
    doc = fitz.open(path)
    pages = {}
    texts = []
    
    for page_num, page in enumerate(doc, 1):
        blocks = page.get_text("blocks")
        page_lines = []
        
        # Ordina i blocchi per posizione Y (dall'alto al basso)
        text_blocks = []
        for block in blocks:
            if len(block) >= 5 and block[4].strip():  # Ha testo
                text_blocks.append({
                    'x': block[0],
                    'y': block[1], 
                    'text': block[4].strip()
                })
        
        # Ordina per posizione Y
        text_blocks.sort(key=lambda b: b['y'])
        
        # Processa ogni blocco
        for block in text_blocks:
            block_lines = block['text'].split('\n')
            for line in block_lines:
                if line.strip():
                    indent = calculate_indent(block['x'])
                    page_lines.append(indent + line.strip())
        
        page_text = '\n'.join(page_lines)
        pages[page_num] = page_text
        texts.append(page_text)
    
    full_text = "\n".join(texts)
    return full_text, pages

def load_pdf_with_dict_method(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Usa get_text("dict") per maggiore controllo sui rientri.
    """
    doc = fitz.open(path)
    pages = {}
    texts = []
    
    for page_num, page in enumerate(doc, 1):
        text_dict = page.get_text("dict")
        page_lines = []
        
        for block in text_dict.get("blocks", []):
            if "lines" not in block:
                continue
                
            for line in block["lines"]:
                if not line.get("spans"):
                    continue
                    
                # Trova la posizione X minima della linea
                min_x = min(span["bbox"][0] for span in line["spans"])
                
                # Estrai tutto il testo della linea
                line_text = ""
                for span in line["spans"]:
                    line_text += span.get("text", "")
                
                if line_text.strip():
                    indent = calculate_indent(min_x)
                    page_lines.append(indent + line_text.strip())
        
        page_text = '\n'.join(page_lines)
        pages[page_num] = page_text
        texts.append(page_text)
    
    full_text = "\n".join(texts)
    return full_text, pages

def debug_pdf_structure(path: str):
    """
    Debug semplice per vedere la struttura del PDF.
    """
    doc = fitz.open(path)
    page = doc[0]
    
    print("=== ANALISI STRUTTURA PDF ===")
    
    # Metodo 1: blocks
    print("\n1. Analisi con get_text('blocks'):")
    blocks = page.get_text("blocks")
    print(f"   Numero blocchi: {len(blocks)}")
    for i, block in enumerate(blocks[:3]):  # Primi 3 blocchi
        if len(block) >= 5:
            print(f"   Blocco {i}: x={block[0]:.1f}, y={block[1]:.1f}")
            print(f"   Testo: {repr(block[4][:50])}")
    
    # Metodo 2: dict
    print("\n2. Analisi con get_text('dict'):")
    text_dict = page.get_text("dict")
    print(f"   Numero blocchi dict: {len(text_dict.get('blocks', []))}")
    
    text_blocks = [b for b in text_dict.get('blocks', []) if 'lines' in b]
    if text_blocks:
        first_block = text_blocks[0]
        print(f"   Prime linee del primo blocco:")
        for i, line in enumerate(first_block.get('lines', [])[:2]):
            if line.get('spans'):
                first_span = line['spans'][0]
                print(f"     Linea {i}: x={first_span['bbox'][0]:.1f}")
                print(f"     Testo: {repr(first_span.get('text', '')[:30])}")

def load_pdf_best_method(path: str) -> Tuple[str, Dict[int, str]]:
    """
    Prova il metodo migliore automaticamente.
    """
    try:
        print("Tentativo con metodo 'dict'...")
        return load_pdf_with_dict_method(path)
    except Exception as e:
        print(f"Errore con metodo dict: {e}")
        print("Fallback al metodo 'blocks'...")
        return load_pdf_with_indents_simple(path)

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

def dump_texts(input_pdf: str, outdir: str, text_mode: str = "text"):
    os.makedirs(outdir, exist_ok=True)
    for tag, path in [("pdf", input_pdf)]:
        # full, pages = load_pdf_text(path, mode=text_mode)
        full, pages = load_pdf_best_method(path)
        raw_path = os.path.join(outdir, f"{tag}-raw.txt")
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(full)
        cleaned = clean_text(full)
        clean_path = os.path.join(outdir, f"{tag}-clean.txt")
        with open(clean_path, "w", encoding="utf-8") as f:
            f.write(cleaned)
        if False:
            # Per-page dumps
            page_dir = os.path.join(outdir, f"{tag}-pages")
            os.makedirs(page_dir, exist_ok=True)
            for pno, txt in pages.items():
                with open(os.path.join(page_dir, f"{pno:03d}.txt"), "w", encoding="utf-8") as f:
                    f.write(txt)

def run(input_pdf: str, outdir: str, text_mode: str = 'text', debug_matches: bool = False, dump_text: bool = False):
    os.makedirs(outdir, exist_ok=True)

    # Optional debug outputs
    if dump_text:
        dump_texts(input_pdf, outdir, text_mode=text_mode)

    return {
    }

def load_config(config_path: str, config_property: str) -> dict:
    if not os.path.exists(config_path):
        raise SystemExit(f"Config file not found: {config_path}")
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception as e:
        raise SystemExit(f"Failed to read JSON config: {e}")
    if not isinstance(cfg, dict) or config_property not in cfg or not isinstance(cfg[config_property], dict):
        raise SystemExit("Config must be a JSON object with a root property " + config_property + " (object).")
    if not isinstance(cfg[config_property], dict) or "step0" not in cfg[config_property] or not isinstance(cfg[config_property]["step0"], dict):
        raise SystemExit("Config must be a JSON object with a root property 'iec_27001.step0' (object).")
    return cfg[config_property]["step0"]

def main():
    ap = argparse.ArgumentParser(
        description="Extract text from PDFs."
    )
    ap.add_argument("--config", help="Path to JSON config with root property [configProp] (inputPdfPath, outdir).")
    ap.add_argument("--configProp", help="Name of the property in JSON config.")
    ap.add_argument("--inputPdfPath", help="Path to PDF (overrides config)")
    ap.add_argument("--outdir", help="Output directory (overrides config)")
    ap.add_argument("--dump-text", action="store_true", help="Write raw/clean text and per-page text files for both PDFs")
    ap.add_argument("--debug-matches", action="store_true", help="Write CSVs with detected control titles and context")
    ap.add_argument("--text-mode", choices=["text","blocks"], default="text", help="PyMuPDF text mode")
    args = ap.parse_args()

    cfg = {"inputPdfPath": None, "outdir": None}
    if args.config and args.configProp:
        cfg_from_file = load_config(args.config, args.configProp)
        for k in ["inputPdfPath", "outdir"]:
            if k in cfg_from_file and cfg_from_file[k]:
                cfg[k] = cfg_from_file[k]

    if args.inputPdfPath:
        cfg["inputPdfPath"] = args.inputPdfPath
    if args.outdir:
        cfg["outdir"] = args.outdir

    missing = [k for k, v in cfg.items() if not v]
    if missing:
        example = {
            "yyy": {
                "inputPdfPath": "/path/to/xxx.pdf",
                "outdir": "./out"
            }
        }
        raise SystemExit(
            "Missing required settings: "
            + ", ".join(missing)
            + "\nProvide them via --config --configProp or CLI flags.\nExample JSON:\n"
            + json.dumps(example, indent=2)
        )

    for path in [cfg["inputPdfPath"]]:
        if not os.path.exists(path):
            raise SystemExit(f"File not found: {path}")

    res = run(
        cfg["inputPdfPath"],
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