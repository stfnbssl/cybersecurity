#!/usr/bin/env node
"use strict";
/**
 * Estrattore / normalizzatore / chunker per testi normativi e standard.
 * Obiettivo: produrre estratti atomici e tracciabili, pronti per
 *  - estrazione controlli via LLM
 *  - indicizzazione semantica
 *  - crosswalk
 *  - audit trail con provenienza verificabile
 *
 * Requisiti coperti (sintesi):
 *  - ETL testuale → Markdown canonico, con struttura preservata
 *  - Riconoscimento pattern per: IEC 62443 (SR/CR), ISO/IEC 27001-27002 (A.x.y), NIST 800-53 (AC-2, AC-2(1)...), Direttive/Regolamenti UE (Art. n(...)), CRA Allegati (Annex ...)
 *  - Chunking in clausole elementari (150–300 token target), con esclusione NOTE/EXAMPLES
 *  - Metadati minimi per chunk e ID deterministico
 *  - QC automatici (hash stability implicita, non-vuoto, unicità chiave, coerenza framework)
 *  - Output JSONL dei chunk + manifest YAML opzionale + file MD per sezione (convenzioni di path)
 *
 * v1.1.0 — aggiunto PARSING PROFONDO per testi UE: Articoli → (commi) → (lettere) → (romani)
 *          e per CRA Allegati: Annex I/II → numerazioni decimali → lettere/romani
 *
 * Uso di base:
 *  node estrattore_normativo.js input.pdf \
 *       --framework "IEC 62443-3-3" --edition 2013 --jurisdiction Global --lang en \
 *       --source "file://catalog/IEC_62443-3-3_2013/en.pdf" \
 *       --out ./out
 *
 * Dipendenze opzionali per l'estrazione testo (auto-rilevate se installate):
 *  - pdf-parse (PDF)
 *  - mammoth (DOCX)
 *  - jsdom + @mozilla/readability (HTML)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function tryRequire(name) {
  try { return require(name); } catch (_) { return null; }
}

// ----------------------------- CLI PARSER -----------------------------
function parseArgs(argv) {
  const out = {
    outDir: "./out",
    minTokens: 150,
    maxTokens: 300,
    emitMdSections: true,
    emitManifest: true,
    normativeDefault: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (!a) continue;
    switch (a) {
      case "-o":
      case "--out": out.outDir = next(); break;
      case "--framework": out.framework = next(); break;
      case "--edition": out.edition = next(); break;
      case "--jurisdiction": out.jurisdiction = next(); break;
      case "--lang": out.lang = next(); break;
      case "--source": out.source = next(); break;
      case "--min-tokens": out.minTokens = parseInt(next(), 10); break;
      case "--max-tokens": out.maxTokens = parseInt(next(), 10); break;
      case "--no-md": out.emitMdSections = false; break;
      case "--no-manifest": out.emitManifest = false; break;
      case "--dry-run": out.dryRun = true; break;
      case "--normative-default": out.normativeDefault = next() !== "false"; break;
      default:
        if (!out.input) out.input = a; else out.extra = (out.extra||[]).concat(a);
    }
  }
  return out;
}

// ----------------------------- TEXT EXTRACTION -----------------------------
async function extractPlainText(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === ".pdf") {
    const pdfParse = tryRequire("pdf-parse");
    if (!pdfParse) {
      warn("pdf-parse non installato: leggo il file come binario e provo fallback di testo grezzo.");
      const buf = fs.readFileSync(inputPath);
      return { text: buf.toString("latin1"), pages: [] };
    }
    const data = await pdfParse(fs.readFileSync(inputPath));
    return { text: data.text, pages: data.numpages ? Array.from({length:data.numpages}, (_,i)=>({index:i+1})) : [] };
  }
  if (ext === ".docx") {
    const mammoth = tryRequire("mammoth");
    if (!mammoth) throw new Error("Per DOCX installa 'mammoth'");
    const res = await mammoth.extractRawText({ path: inputPath });
    return { text: res.value, pages: [] };
  }
  if (ext === ".html" || ext === ".htm") {
    const jsdom = tryRequire("jsdom");
    const readability = tryRequire("@mozilla/readability");
    const raw = fs.readFileSync(inputPath, "utf8");
    if (jsdom && readability) {
      const { JSDOM } = jsdom;
      const dom = new JSDOM(raw);
      const reader = new readability.Readability(dom.window.document);
      const article = reader.parse();
      const text = article && article.textContent ? article.textContent : dom.window.document.body.textContent;
      return { text, pages: [] };
    }
    const text = raw.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "\n");
    return { text, pages: [] };
  }
  const text = fs.readFileSync(inputPath, "utf8");
  return { text, pages: [] };
}

// ----------------------------- NORMALIZATION → MD -----------------------------
function normalizeToMarkdown(rawText, lang) {
  let t = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");

  t = t.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");

  const lines = t.split(/\n/);
  const freq = new Map();
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    if (s.length > 80) continue;
    const k = s.replace(/\d+/g, "#");
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const toStrip = new Set(Array.from(freq.entries()).filter(([k,c]) => c > 5).map(([k]) => k));
  t = lines.map(l => toStrip.has(l.trim().replace(/\d+/g,"#")) ? "" : l).join("\n");

  t = t.replace(/^\s*[•·●◦▪▬■□–-]\s+/gm, "- ");
  return t.trim();
}

// ----------------------------- FRAMEWORK PATTERNS -----------------------------
const PAT = {
  ISO_2700x: /\bA\.(\d+)(?:\.(\d+))*(?!\S)/g,
  IEC_62443_SR: /\bSR\s?\d+(?:\.\d+)*/g,
  IEC_62443_CR: /\bCR\s?\d+(?:\.\d+)*/g,
  NIST_80053: /\b([A-Z]{2})-(\d+)(?:\((\d+)\))?/g,
  // EU_Article: /\b(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?)(?:\s*[—-]\s*([^\n]+))?/gi,
  // EU_Article: /(?:^|\n)\s*(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?)\s*(?:\n|$)/gi,
  // Sostituisci/aggiungi questi:
  EU_ArticleHdr: /(?:^|\n)\s*(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?\.?)\s*(?:[-–—:]\s*([^\n]+))?\s*(?:\n|$)/gi,
  EU_AnnexHdr: /(?:^|\n)\s*(?:Annex|ANNEX)\s*([IVXLC]+)\s*(?:[-–—:]\s*([^\n]+))?\s*(?:\n|$)/gi,
  // CRA_Annex: /\bAnnex\s?([IVXLC]+)(?:\s*([^\n]+))?/gi,
  CRA_Annex: /\b(Art\.?\s?\d+[a-z]?(?:\([^\)]*\))*|Article\s?\d+[a-z]?|Articolo\s?\d+[a-z]?|ANNEX\s?[IVXLC]+(?:\.\d+)*)/gi,
};

function detectFramework(code) {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c.includes("62443")) return "IEC_62443";
  if (c.includes("27001") || c.includes("27002")) return "ISO_2700x";
  if (c.includes("800-53")) return "NIST_80053";
  if (c.includes("NIS2") || c.includes("GDPR") || c.includes("REGOLAMENTO") || c.includes("DIRECTIVE") || c.includes("REGULATION")) return "EU";
  if (c.includes("CYBER RESILIENCE ACT") || c.includes("CRA")) return "CRA";
  return null;
}

// ----------------------------- SECTION SPLITTING -----------------------------
function splitSections(frameworkHint, mdText, forCode) {
  const sections = [];
  const F = detectFramework(forCode) || frameworkHint;
  const text = mdText;

  function push(sec) { if (sec && sec.body && sec.body.trim()) sections.push(sec); }

  if (F === "IEC_62443") {
    const re = new RegExp(`${PAT.IEC_62443_SR.source}|${PAT.IEC_62443_CR.source}`, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      last = { section_path: m[0].trim(), title: "", body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
    for (const s of sections) {
      const firstLine = s.body.split(/\n/)[0].trim();
      if (/^[-–—]/.test(firstLine)) s.title = firstLine.replace(/^[-–—]\s*/, "");
    }
  } else if (F === "ISO_2700x") {
    const re = new RegExp(PAT.ISO_2700x.source, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      last = { section_path: m[0].trim(), title: "", body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
  } else if (F === "NIST_80053") {
    const re = new RegExp(PAT.NIST_80053.source, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      last = { section_path: m[0].trim(), title: "", body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
  } else if (F === "EU") {
    const re = new RegExp(PAT.EU_Article.source, "gi");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      const artNum = m[1];
      const title = (m[2] || "").trim();
      last = { section_path: `Art. ${artNum}`, title, body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
  } else if (F === "CRA") {
    const re = new RegExp(PAT.CRA_Annex.source, "gi");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      /*
      const rom = m[1];
      const title = (m[2] || "").trim();
      last = { section_path: `Annex ${rom}`, title, body: "" };
      */
      // PRIMA (esempio tipico)
      // const artNum = m[1].trim();
      // const title = (m[2] || "").trim();
      // last = { section_path: `Art. ${artNum}`, article: artNum, title, body: "", start: re.lastIndex };
      // DOPO
      const artNum = m[1].trim();
      let title = "";
      // peek: prendi la riga subito dopo l'header, se non è un altro Art./Annex
      const after = mdText.slice(re.lastIndex);
      const nl = after.indexOf("\n");
      const nextLine = (nl >= 0 ? after.slice(0, nl) : after).trim();
      // se la nextLine NON è un altro header (Art./Articolo/Article/Annex) ed è non vuota, usala come titolo
      if (
        nextLine &&
        !/^(?:Art\.?|Articolo|Article)\s*\d+[a-z]?/i.test(nextLine) &&
        !/^(?:Annex|ANNEX)\s*[IVXLC]+/.test(nextLine)
      ) {
        title = nextLine;
      }
      last = { section_path: `Art. ${artNum}`, article: artNum, title, body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
  } else {
    const re = /(\n|^)##?\s+([^\n]+)|(\n|^)\s*(?:Section|Sezione|Capo|Titolo)\s+[^\n]+/g;
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      const header = (m[2] || m[0]).replace(/^\s*#+\s*/, "").trim();
      last = { section_path: header, title: header, body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }
  }

  return sections;
}

// ----------------------------- CLAUSE / CHUNKING -----------------------------
const PRESCRIPTIVE_RE = /\b(shall ensure|shall implement|shall apply|shall|must|shall not|must not|should|deve|devono|si deve|non deve|non devono|è tenut[oa] a|sono tenuti a|è obbligatorio|è necessario)\b/i;
const NOTE_RE = /^(note|nota|example|esempio)\b[:\-]?/i;

function atomizeTextToClauses(text, lang, maxTokens) {
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const blocks = [];
  for (const ln of lines) {
    if (NOTE_RE.test(ln)) blocks.push({ text: ln.replace(NOTE_RE, "").trim(), informative: true });
    else blocks.push({ text: ln, informative: false });
  }
  const fragments = [];
  for (const b of blocks) {
    const parts = b.text.split(/(?<=\))\s+(?=[a-z]\)|\d+\))/g).flatMap(p => p.split(/\s*;\s+/g));
    for (const p of parts) fragments.push({ text: p.trim(), informative: b.informative });
  }
  const sentences = [];
  for (const f of fragments) {
    const splits = f.text.split(/(?<=[\.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/);
    for (const s of splits) if (s.trim()) sentences.push({ text: s.trim(), informative: f.informative });
  }
  const clauses = [];
  let acc = [];
  let accTokens = 0;
  for (const s of sentences) {
    const tks = approxTokens(s.text, lang);
    if (accTokens + tks > maxTokens && acc.length) {
      clauses.push(mergeClause(acc));
      acc = []; accTokens = 0;
    }
    acc.push(s);
    accTokens += tks;
  }
  if (acc.length) clauses.push(mergeClause(acc));

  return clauses.map(c => ({
    text_md: c.text,
    informative: c.informative,
    normative: !c.informative && PRESCRIPTIVE_RE.test(c.text),
    context_note: c.context_note || null,
  })).filter(c => c.text_md && c.text_md.length >= 40);
}

function mergeClause(arr) {
  const first = arr[0]?.text || "";
  const definitional = /(this (section|control)|the objective|scopo|finalità|purpose|scope)\b/i.test(first);
  const text = arr.map(x => x.text).join(" ").trim();
  return { text, informative: arr.every(x => x.informative), context_note: definitional ? first : null };
}

function approxTokens(text, lang) {
  const words = (text.match(/\S+/g) || []).length;
  return Math.round(words * 1.3);
}

// ----------------------------- EU DEEP PARSER -----------------------------
const EU_RX = {
  LETTER: /\(\s*([a-z])\s*\)\s+/g,
  ROMAN: /\(\s*([ivxlcdm]+)\s*\)\s+/gi,
};

function splitByAnchors(text, anchorRe) {
  const out = [];
  let m, lastIdx = 0, lastTag = null;
  anchorRe.lastIndex = 0;
  while ((m = anchorRe.exec(text)) !== null) {
    if (lastTag) {
      out.push({ tag: lastTag, text: text.slice(lastIdx, m.index).trim() });
    }
    lastTag = m[1];
    lastIdx = anchorRe.lastIndex;
  }
  if (lastTag) out.push({ tag: lastTag, text: text.slice(lastIdx).trim() });
  return out.length ? out : [{ tag: null, text: text.trim() }];
}

function deepEUClauses(section, lang, maxTokens) {
  const clauses = [];
  const body = section.body.trim();
  const paraSegments = [];

  const lines = body.split(/\n+/);
  let current = null;
  for (const ln of lines) {
    const m = ln.match(/^\s*\((\d+)\)\s*(.*)$/);
    if (m) {
      if (current) paraSegments.push(current);
      current = { n: m[1], text: m[2] ? m[2] : "" };
    } else {
      if (!current) { current = { n: "0", text: ln.trim() }; }
      else current.text += (current.text ? "\n" : "") + ln.trim();
    }
  }
  if (current) paraSegments.push(current);

  for (const p of paraSegments) {
    const letterParts = splitByAnchors(p.text, new RegExp(EU_RX.LETTER.source, "g"));
    if (letterParts.length > 1 || letterParts[0].tag) {
      for (const L of letterParts) {
        const romanParts = splitByAnchors(L.text, new RegExp(EU_RX.ROMAN.source, "gi"));
        if (romanParts.length > 1 || romanParts[0].tag) {
          for (const R of romanParts) {
            const subClauses = atomizeTextToClauses(R.text, lang, maxTokens);
            for (const c of subClauses) {
              clauses.push({ ...c, section_path_suffix: `(${p.n})(${L.tag})(${R.tag.toLowerCase()})` });
            }
          }
        } else {
          const subClauses = atomizeTextToClauses(L.text, lang, maxTokens);
          for (const c of subClauses) {
            clauses.push({ ...c, section_path_suffix: `(${p.n})(${L.tag})` });
          }
        }
      }
    } else {
      const subClauses = atomizeTextToClauses(p.text, lang, maxTokens);
      for (const c of subClauses) {
        clauses.push({ ...c, section_path_suffix: `(${p.n})` });
      }
    }
  }
  return clauses;
}

// ----------------------------- CRA ANNEX DEEP PARSER -----------------------------
const CRA_RX = {
  DECIMAL: /^\s*(\d+(?:\.\d+)*)[\.)]?\s+(.*)$/,
  LETTER: /^\s*\(([a-z])\)\s+(.*)$/,
  ROMAN: /^\s*\(([ivxlcdm]+)\)\s+(.*)$/i,
};

function deepCRAClauses(section, lang, maxTokens) {
  const clauses = [];
  const lines = section.body.split(/\n+/).map(s => s.trim());

  const nodes = [];
  for (const ln of lines) {
    const m = ln.match(CRA_RX.DECIMAL);
    if (m) {
      nodes.push({ key: m[1], text: m[2] });
    } else if (nodes.length) {
      nodes[nodes.length - 1].text += (nodes[nodes.length - 1].text ? " \n" : "") + ln;
    }
  }
  if (!nodes.length) nodes.push({ key: "1", text: section.body.trim() });

  for (const n of nodes) {
    const chunks = [];
    let buf = "";
    const innerLines = n.text.split(/\n+/);
    for (const il of innerLines) {
      const ml = il.match(CRA_RX.LETTER);
      if (ml) {
        if (buf.trim()) chunks.push({ tag: null, text: buf.trim() });
        chunks.push({ tag: `(${ml[1]})`, text: ml[2] });
        buf = "";
      } else {
        buf += (buf ? " " : "") + il;
      }
    }
    if (buf.trim()) chunks.push({ tag: null, text: buf.trim() });

    for (const ch of chunks) {
      const romanParts = splitByAnchors(ch.text, /\(([ivxlcdm]+)\)\s+/gi);
      if (romanParts.length > 1 || romanParts[0].tag) {
        for (const r of romanParts) {
          const sub = atomizeTextToClauses(r.text, lang, maxTokens);
          for (const c of sub) {
            const suf = ` ${n.key}${ch.tag ? ch.tag : ""}(${(r.tag||"").toLowerCase()})`;
            clauses.push({ ...c, section_path_suffix: suf });
          }
        }
      } else {
        const sub = atomizeTextToClauses(ch.text, lang, maxTokens);
        for (const c of sub) {
          const suf = ` ${n.key}${ch.tag ? ch.tag : ""}`;
          clauses.push({ ...c, section_path_suffix: suf });
        }
      }
    }
  }
  return clauses;
}

// ----------------------------- METADATA & IDs -----------------------------
function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

function buildChunkMeta(base, section_path, text_md, opts) {
  const checksum = sha256(text_md);
  const key = `${base.framework_code}|${base.edition}|${section_path}|${base.lang}|${checksum}`;
  const chunk_id = sha256(key).slice(0, 16);
  const meta = {
    framework_code: base.framework_code,
    edition: base.edition,
    jurisdiction: base.jurisdiction,
    section_path,
    lang: base.lang,
    normative: base.normativeDefault,
    parent_section: null,
    text_md,
    checksum_sha256: checksum,
    source_locator: base.source_locator,
    imported_at: new Date().toISOString(),
    import_tool: "estrattore_normativo.js@1.1.0",
    chunk_id,
  };
  return meta;
}

function attachParentRelations(meta, section_path) {
  const m = section_path.match(/^([A-Z]{2}-\d+)\((\d+)\)$/);
  if (m) meta.parent_section = m[1];
  const srm = section_path.match(/^SR\s?(\d+)(?:\.(\d+))+$/i);
  if (srm) meta.parent_section = `SR ${srm[1]}`;
  const am = section_path.match(/^Annex\s?([IVXLC]+)\s?(\d+(?:\.\n+d+)+)/i);
  if (am) meta.parent_section = `Annex ${am[1]}`;
  const eu = section_path.match(/^Art\.\s*\d+[a-z]?\((\d+)\)/i);
  if (eu) meta.parent_section = section_path.replace(/\((?:[a-zivxlcdm]+)\).*$/i, "").replace(/\([^)]*\)$/, "");
}

// ----------------------------- QC CHECKS -----------------------------
function qcChecks(chunk, seenKeys, base) {
  const problems = [];
  if (!chunk.text_md || chunk.text_md.length < 40) problems.push("text_md troppo corto");
  const presc = PRESCRIPTIVE_RE.test(chunk.text_md);
  if (!chunk.informativo && !presc) problems.push("nessun verbo prescrittivo rilevato");
  const uniqueKey = `${chunk.framework_code}|${chunk.edition}|${chunk.section_path}|${chunk.lang}|${chunk.checksum_sha256}`;
  if (seenKeys.has(uniqueKey)) problems.push("duplicato (framework, edition, section_path, lang, checksum)");
  if (/62443/.test(chunk.framework_code) && /^(SR|CR)/.test(chunk.section_path)) {
    if (chunk.normative !== true) problems.push("coerenza: IEC 62443 SR/CR dovrebbero essere normative=true");
  }
  seenKeys.add(uniqueKey);
  return problems;
}

// ----------------------------- FILE PATHS -----------------------------
function sectionToFilePath(base, section_path) {
  const frameworkSlug = base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_");
  const root = path.join(base.outDir, "catalog", `${frameworkSlug}_${base.edition}`, base.lang);
  const norm = section_path.replace(/\s+/g, "_").replace(/\W+/g, "_");
  let fname = norm;
  if (/^SR_/.test(norm)) fname = `section_${norm}`;
  if (/^A_\d+/.test(norm)) fname = `${norm}`;
  if (/^Art_/.test(norm)) fname = `${norm}`;
  return { dir: root, file: path.join(root, `${fname}.md`) };
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

// ----------------------------- MAIN PIPELINE -----------------------------
async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.framework || !args.edition || !args.lang) {
    console.error("Uso: node estrattore_normativo.js <input.(pdf|docx|html|md|txt)> --framework <code> --edition <YYYY> --lang <it|en> [--jurisdiction EU|Global] [--source <locator>] [-o outdir]");
    process.exit(1);
  }

  const { text: raw } = await extractPlainText(args.input);
  const md = normalizeToMarkdown(raw, args.lang);
  fs.writeFileSync("__dump_1", raw, "utf8");
  fs.writeFileSync("__dump_2", md, "utf8");

  const base = {
    framework_code: args.framework,
    edition: String(args.edition),
    jurisdiction: args.jurisdiction || (args.framework.toUpperCase().includes("GDPR") || args.framework.toUpperCase().includes("NIS2") || args.framework.toUpperCase().includes("CRA") ? "EU" : "Global"),
    lang: args.lang,
    source_locator: `${args.source || `file://${path.resolve(args.input)}`}`,
    outDir: args.outDir,
    normativeDefault: args.normativeDefault,
  };

  const frameworkHint = detectFramework(args.framework);
  const sections = splitSections(frameworkHint, md, args.framework);

  const chunks = [];
  const seenKeys = new Set();

  for (const sec of sections) {
    let unitClauses = [];
    if (frameworkHint === "EU") {
      unitClauses = deepEUClauses(sec, args.lang, args.maxTokens);
    } else if (frameworkHint === "CRA") {
      unitClauses = deepCRAClauses(sec, args.lang, args.maxTokens);
    } else {
      unitClauses = atomizeTextToClauses(sec.body, args.lang, args.maxTokens).map(c => ({ ...c, section_path_suffix: "" }));
    }

    for (const c of unitClauses) {
      const sectionPath = c.section_path_suffix ? `${sec.section_path}${c.section_path_suffix}` : sec.section_path;
      const meta = buildChunkMeta(base, sectionPath, c.text_md, args);
      attachParentRelations(meta, sectionPath);
      meta.normative = c.normative;
      if (c.context_note) meta.context_note = c.context_note;
      if (c.informative) meta.informativo = true;

      const issues = qcChecks(meta, seenKeys, base);
      if (issues.length) meta._qc = issues;

      chunks.push(meta);
    }

    if (args.emitMdSections) {
      const loc = sectionToFilePath(base, sec.section_path.replace(/\./g, ".").replace(/\s+/g, " ").replace(/\(/g,"_").replace(/\)/g,""));
      ensureDir(loc.dir);
      const mdTitle = sec.title && sec.title.trim() ? ` — ${sec.title.trim()}` : "";
      const content = `## ${sec.section_path}${mdTitle}\n\n${sec.body}\n`;
      fs.writeFileSync(loc.file, content, "utf8");
    }
  }

  const outDir = path.join(base.outDir, "chunks");
  ensureDir(outDir);
  const jsonlPath = path.join(outDir, `${base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_")}_${base.edition}_${base.lang}.jsonl`);
  fs.writeFileSync(jsonlPath, chunks.map(j => JSON.stringify(j)).join("\n"), "utf8");
  console.log("Written to", jsonlPath);

  if (args.emitManifest) {
    const manifest = buildManifestYAML(base, chunks);
    const manDir = path.join(base.outDir, "manifest");
    ensureDir(manDir);
    const manPath = path.join(manDir, `${base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_")}_${base.edition}_${base.lang}.yaml`);
    fs.writeFileSync(manPath, manifest, "utf8");
  }

  if (!args.dryRun) console.log(`OK — sezioni: ${sections.length}, chunk: ${chunks.length}, file: ${jsonlPath}`);
}

function buildManifestYAML(base, chunks) {
  const lines = [];
  lines.push(`framework: "${base.framework_code}"`);
  lines.push(`edition: "${base.edition}"`);
  lines.push(`jurisdiction: "${base.jurisdiction}"`);
  lines.push(`language: "${base.lang}"`);
  lines.push(`source: "${base.source_locator}"`);
  lines.push(`ingest_date: "${new Date().toISOString().slice(0,10)}"`);
  lines.push(`chunks:`);
  for (const c of chunks.slice(0, 1000)) {
    lines.push(`  - section_path: "${c.section_path}"`);
    lines.push(`    normative: ${c.normative ? "true" : "false"}`);
    lines.push(`    checksum_sha256: "${c.checksum_sha256.slice(0,16)}..."`);
  }
  return lines.join("\n") + "\n";
}

function warn(msg) { console.warn("[warn] " + msg); }

// ----------------------------- START -----------------------------
if (require.main === module) {
  run().catch(err => { console.error(err.stack || String(err)); process.exit(1); });
}

// ----------------------------- NOTE TECNICHE -----------------------------
// - Indicizzazione semantica: genera embedding solo su text_md dei chunk con normative=true.
// - Filtri consigliati per ANN/BM25: { lang, framework_code, edition, normative }.
// - Differenze tra edizioni: confronta checksum per stesso section_path; se cambia, salva relazione supersedes (fuori da questo script).
// - L'ID deterministico (chunk_id) è calcolato come sha256(framework|edition|section_path|lang|checksum)[0:16].
// - Questo script non scrive su DB: produce JSONL facilmente importabile in tabelle framework/source_doc/text_index.
