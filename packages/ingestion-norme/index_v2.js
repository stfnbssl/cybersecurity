#!/usr/bin/env node
"use strict";
/**
 * Estrattore / normalizzatore / chunker per testi normativi e standard.
 * (v1.3 — batch JSON, EU deep parsing + CRA fix)
 *
 * Novità v1.3
 *  - Modalità batch via manifest JSON: --batch manifest.json
 *  - Riconoscimento CRA migliorato (Articolo/Article + ANNEX in maiuscolo)
 *  - EU deep parsing (Art. → comma → lettera → punto romano)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function tryRequire(name) { try { return require(name); } catch { return null; } }

// ----------------------------- CLI PARSER -----------------------------
function parseArgs(argv) {
  const out = {
    outDir: "./out",
    minTokens: 150,
    maxTokens: 300,
    emitMdSections: true,
    emitManifest: true,
    normativeDefault: true,
    euDeep: true,
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
      case "--eu-deep": out.euDeep = next() !== "false"; break;
      case "--batch": out.batch = next(); break;
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
      warn("pdf-parse non installato: fallback a lettura binaria (accuratezza offset ridotta)");
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
  if (ext === ".html" || ext === ".htm" || ext === ".xml") {
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
function normalizeToMarkdown(rawText) {
  let t = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");

  // heuristic: strip repeated headers/footers (short lines repeated >5x)
  const lines = t.split(/\n/);
  const freq = new Map();
  for (const line of lines) {
    const s = line.trim();
    if (!s || s.length > 80) continue;
    const k = s.replace(/\d+/g, "#");
    freq.set(k, (freq.get(k)||0)+1);
  }
  const toStrip = new Set(Array.from(freq.entries()).filter(([k,c])=>c>5).map(([k])=>k));
  t = lines.map(l => toStrip.has(l.trim().replace(/\d+/g,"#")) ? "" : l).join("\n");

  // bullets normalization
  t = t.replace(/^\s*[•·●◦▪▬■□–-]\s+/gm, "- ");
  return t.trim();
}

// ----------------------------- FRAMEWORK PATTERNS -----------------------------
const PAT = {
  ISO_2700x: /\bA\.(\d+)(?:\.(\d+))*(?!\S)/g,
  IEC_62443_SR: /\bSR\s?\d+(?:\.\d+)*/g,
  IEC_62443_CR: /\bCR\s?\d+(?:\.\d+)*/g,
  NIST_80053: /\b([A-Z]{2})-(\d+)(?:\((\d+)\))?/g,
  // EU_ArticleHdr: /(?:^|\n)\s*(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?)(?:\s*[-–—]\s*([^\n]+))?\s*(?:\n|$)/gi,
  // EU_ArticleHdr: /(?:^|\n)\s*(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?)\s*(?:\n|$)/gi,
  EU_ArticleHdr: /(?:^|\n)\s*(?:Art\.?|Articolo|Article)\s*(\d+[a-z]?\.?)\s*(?:[-–—:]\s*([^\n]+))?\s*(?:\n|$)/gi,
  EU_Para: /^(?:\((\d+)\)|(\d+)[\.)])\s+/, // (1) or 1.
  EU_Letter: /^\(?([a-z])\)\s+/i,              // (a) or a)
  EU_RomanPoint: /^\(?([ivxlcdm]+)\)\s+/i,     // (i)
  CRA_Annex: /\b(Art\.?\s?\d+[a-z]?(?:\([^\)]*\))*|Article\s?\d+[a-z]?|Articolo\s?\d+[a-z]?|ANNEX\s?[IVXLC]+(?:\.\d+)*)/gi,
};

function detectFramework(code) {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c.includes("62443")) return "IEC_62443";
  if (c.includes("27001") || c.includes("27002")) return "ISO_2700x";
  if (c.includes("800-53")) return "NIST_80053";
  if (c.includes("NIS2") || c.includes("GDPR") || c.includes("REGOLAMENTO") || c.includes("DIRECTIVE") || c.includes("REGULATION") ) return "EU"; 
  if (c.includes("CYBER RESILIENCE ACT") || c.includes("CRA")) return "CRA";
  return null;
}

// ----------------------------- SECTION SPLITTING (generic) -----------------------------
function splitSections(frameworkHint, mdText, forCode) {
  const sections = [];
  const F = detectFramework(forCode) || frameworkHint;
  const text = mdText;

  function push(sec) { if (sec && sec.body && sec.body.trim()) sections.push(sec); }

  if (F === "IEC_62443") {
    const re = new RegExp(`${PAT.IEC_62443_SR.source}|${PAT.IEC_62443_CR.source}`, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); last.end = m.index; push(last); }
      last = { section_path: m[0].trim(), title: "", body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); last.end = text.length; push(last); }
  } else if (F === "ISO_2700x") {
    const re = new RegExp(PAT.ISO_2700x.source, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); last.end = m.index; push(last); }
      last = { section_path: m[0].trim(), title: "", body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); last.end = text.length; push(last); }
  } else if (F === "NIST_80053") {
    const re = new RegExp(PAT.NIST_80053.source, "g");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); last.end = m.index; push(last); }
      last = { section_path: m[0].trim(), title: "", body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); last.end = text.length; push(last); }
  } else if (F === "EU") {
    // EU: articoli + annex
    const re = /(?:^|\n)\s*((?:Art\.?|Articolo|Article)\s*\d+[a-z]?|(?:Annex|ANNEX)\s?[IVXLC]+)(?:\s*[-–—]\s*([^\n]+))?\s*(?:\n|$)/gi;
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); last.end = m.index; push(last); }
      const head = m[1].trim();
      last = { section_path: head.replace(/\s+/g, ' ').replace(/Articol/gi, 'Art.'), title: (m[2]||'').trim(), body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); last.end = text.length; push(last); }
  } else if (F === "CRA") {
    const re = new RegExp(PAT.CRA_Annex.source, "gi");
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); push(last); }
      const rom = m[1];
      const title = (m[2] || "").trim();
      last = { section_path: `Annex ${rom}`, title, body: "" };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); push(last); }    
  } else {
    const re = /(\n|^)##?\s+([^\n]+)|(\n|^)\s*(?:Section|Sezione|Capo|Titolo)\s+[^\n]+/g;
    let m, lastIdx = 0, last = null;
    while ((m = re.exec(text)) !== null) {
      if (last) { last.body = text.slice(lastIdx, m.index).trim(); last.end = m.index; push(last); }
      const header = (m[2] || m[0]).replace(/^\s*#+\s*/, "").trim();
      last = { section_path: header, title: header, body: "", start: re.lastIndex };
      lastIdx = re.lastIndex;
    }
    if (last) { last.body = text.slice(lastIdx).trim(); last.end = text.length; push(last); }
  }

  return sections;
}

// ----------------------------- EU DEEP PARSER -----------------------------
function splitEUArticles(mdText) {
  const sections = [];
  const re = new RegExp(PAT.EU_ArticleHdr.source, "gi");
  let m, lastIdx = 0, last = null;
  while ((m = re.exec(mdText)) !== null) {
    console.error("DEBUG header trovato:", JSON.stringify(m[0]));    
    if (last) { last.body = mdText.slice(lastIdx, m.index).trim(); last.end = m.index; sections.push(last); }
    /*
    const artNum = m[1].trim();
    const title = (m[2] || "").trim();
    */
    // PRIMA (esempio tipico)
    // const artNum = m[1].trim();
    // const title = (m[2] || "").trim();
    // last = { section_path: `Art. ${artNum}`, article: artNum, title, body: "", start: re.lastIndex };
    // DOPO
    const rawNum = m[1].trim();
    const artNum = rawNum.replace(/\.$/, "");  // rimuove l'eventuale punto
    let title = (m[2] || "").trim();

    // fallback: se non abbiamo titolo sulla stessa riga, prova la riga successiva
    if (!title) {
    const after = mdText.slice(re.lastIndex);
    const nl = after.indexOf("\n");
    const nextLine = (nl >= 0 ? after.slice(0, nl) : after).trim();
    if (
        nextLine &&
        !/^(?:Art\.?|Articolo|Article)\s*\d+[a-z]?/i.test(nextLine) &&
        !/^(?:Annex|ANNEX)\s*[IVXLC]+/.test(nextLine)
    ) {
        title = nextLine;
    }
    }

    last = { section_path: `Art. ${artNum}`, article: artNum, title, body: "", start: re.lastIndex };
    lastIdx = re.lastIndex;
  }
  if (last) { last.body = mdText.slice(lastIdx).trim(); last.end = mdText.length; sections.push(last); }
  return sections;
}

function parseEUParagraphs(articleBody, articleStartAbs) {
  const out = [];
  const lines = articleBody.split(/\n+/);
  let current = null;
  let cursor = 0; // position within articleBody

  function flush() {
    if (!current) return;
    current.text = current.buffer.join(" ").replace(/\s+/g, " ").trim();
    if (current.text) out.push(current);
    current = null;
  }

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(PAT.EU_Para);
    if (m) {
      flush();
      const num = (m[1] || m[2]).trim();
      const idx = articleBody.indexOf(line, cursor);
      const absStart = idx >= 0 ? articleStartAbs + idx : null;
      current = { num, buffer: [line.replace(PAT.EU_Para, "")], start: absStart };
      cursor = idx >= 0 ? idx + line.length : cursor;
    } else if (line) {
      if (!current) {
        const idx = articleBody.indexOf(line, cursor);
        const absStart = idx >= 0 ? articleStartAbs + idx : null;
        current = { num: "0", buffer: [line], start: absStart };
        cursor = idx >= 0 ? idx + line.length : cursor;
      } else {
        current.buffer.push(line);
        const idx = articleBody.indexOf(line, cursor);
        if (idx >= 0) cursor = idx + line.length;
      }
    }
  }
  flush();
  return out;
}

function parseEULettersAndPoints(paragraphText, paraStartAbs) {
  const out = [];
  const lines = paragraphText.split(/\n+/).map(s => s.trim()).filter(Boolean);
  let cursor = 0;
  const blocks = [];
  let current = null;
  for (const ln of lines) {
    const L = ln.match(PAT.EU_Letter);
    if (L) {
      if (current) blocks.push(current);
      const idx = paragraphText.indexOf(ln, cursor);
      const absStart = idx >= 0 ? paraStartAbs + idx : null;
      current = { letter: L[1].toLowerCase(), buffer: [ln.replace(PAT.EU_Letter, "")], start: absStart };
      cursor = idx >= 0 ? idx + ln.length : cursor;
    } else {
      if (!current) {
        const idx = paragraphText.indexOf(ln, cursor);
        const absStart = idx >= 0 ? paraStartAbs + idx : null;
        current = { buffer: [ln], start: absStart };
        cursor = idx >= 0 ? idx + ln.length : cursor;
      } else {
        current.buffer.push(ln);
        const idx = paragraphText.indexOf(ln, cursor);
        if (idx >= 0) cursor = idx + ln.length;
      }
    }
  }
  if (current) blocks.push(current);

  for (const b of blocks) {
    const joined = b.buffer.join(" ");
    const parts = splitByRomanPoints(joined);
    if (parts.length === 0) {
      out.push({ letter: b.letter || null, point: null, text: joined.trim(), start: b.start });
    } else {
      for (const p of parts) {
        const relIdx = joined.indexOf(p.text);
        const absStart = b.start != null && relIdx >= 0 ? b.start + relIdx : null;
        out.push({ letter: b.letter || null, point: p.numeral || null, text: p.text.trim(), start: absStart });
      }
    }
  }
  return out;
}

function splitByRomanPoints(text) {
  const matches = [];
  const re = /\(?([ivxlcdm]+)\)\s+/ig;
  let m;
  const indices = [];
  while ((m = re.exec(text)) !== null) {
    indices.push({ idx: m.index, numeral: m[1].toLowerCase(), len: m[0].length });
  }
  if (indices.length === 0) return [];
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    if (i > 0) {
      const prev = indices[i-1];
      const chunk = text.slice(prev.idx + prev.len, cur.idx);
      matches.push({ numeral: prev.numeral, text: chunk });
    }
    if (i === indices.length - 1) {
      const tail = text.slice(cur.idx + cur.len);
      matches.push({ numeral: cur.numeral, text: tail });
    }
  }
  return matches.filter(x => x.text.trim());
}

// ----------------------------- CLAUSE / CHUNKING -----------------------------
const PRESCRIPTIVE_RE = /\b(shall|must|is required to|are required to|shall not|must not|should|deve|devono|non deve|non devono|è richiesto|è vietato|si deve|si devono)\b/i;
const NOTE_RE = /^(note|nota|example|esempio)\b[:\-]?/i;

function splitIntoAtomicClauses(sectionBody, lang, maxTokens) {
  const body = sectionBody.trim();
  const lines = body.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const blocks = [];
  for (const ln of lines) {
    if (NOTE_RE.test(ln)) blocks.push({ text: ln.replace(NOTE_RE, "").trim(), informative: true });
    else blocks.push({ text: ln, informative: false });
  }
  const fragments = [];
  for (const b of blocks) {
    const parts = b.text
      .split(/(?<=\))\s+(?=[a-z]\)|\d+\))/g)
      .flatMap(p => p.split(/\s*;\s+/g));
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
    if (accTokens + tks > maxTokens && acc.length) { clauses.push(mergeClause(acc)); acc = []; accTokens = 0; }
    acc.push(s); accTokens += tks;
  }
  if (acc.length) clauses.push(mergeClause(acc));
  return clauses
    .map(c => ({ text_md: c.text, informative: c.informative, normative: !c.informative && PRESCRIPTIVE_RE.test(c.text), context_note: c.context_note || null }))
    .filter(c => c.text_md && c.text_md.length >= 40);
}

function mergeClause(arr) {
  const first = arr[0]?.text || "";
  const definitional = /(this (section|control)|the objective|scopo|finalità|purpose|scope)\b/i.test(first);
  const text = arr.map(x => x.text).join(" ").trim();
  return { text, informative: arr.every(x => x.informative), context_note: definitional ? first : null };
}

function approxTokens(text) { const words = (text.match(/\S+/g) || []).length; return Math.round(words * 1.3); }

// ----------------------------- METADATA & IDs -----------------------------
function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

function buildChunkMeta(base, section_path, text_md) {
  const checksum = sha256(text_md);
  const key = `${base.framework_code}|${base.edition}|${section_path}|${base.lang}|${checksum}`;
  const chunk_id = sha256(key).slice(0, 16);
  return {
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
    import_tool: "estrattore_normativo.js@1.3.0",
    chunk_id,
  };
}

function attachParentRelations(meta, section_path) {
  const m = section_path.match(/^([A-Z]{2}-\d+)\((\d+)\)$/);
  if (m) meta.parent_section = m[1];
  const srm = section_path.match(/^SR\s?(\d+)(?:\.(\d+))+$/i);
  if (srm) meta.parent_section = `SR ${srm[1]}`;
  const am = section_path.match(/^Annex\s?([IVXLC]+)\s?(?:\.(\d+))+$/i);
  if (am) meta.parent_section = `Annex ${am[1]}`;
  const eu = section_path.match(/^Art\.\s?(\d+[a-z]?)(\([^\)]+\))+/i);
  if (eu) meta.parent_section = `Art. ${eu[1]}`;
}

// ----------------------------- QC CHECKS -----------------------------
function qcChecks(chunk, seenKeys) {
  const problems = [];
  if (!chunk.text_md || chunk.text_md.length < 40) problems.push("text_md troppo corto");
  const presc = PRESCRIPTIVE_RE.test(chunk.text_md);
  if (!chunk.informativo && !presc) problems.push("nessun verbo prescrittivo rilevato");
  const uniqueKey = `${chunk.framework_code}|${chunk.edition}|${chunk.section_path}|${chunk.lang}|${chunk.checksum_sha256}`;
  if (seenKeys.has(uniqueKey)) problems.push("duplicato (framework, edition, section_path, lang, checksum)");
  if (/62443/.test(chunk.framework_code) && /^(SR|CR)\b/.test(chunk.section_path)) {
    if (chunk.normative !== true) problems.push("coerenza: IEC 62443 SR/CR dovrebbero avere normative=true");
  }
  seenKeys.add(uniqueKey);
  return problems;
}

// ----------------------------- FILE PATHS -----------------------------
function sectionToFilePath(base, section_path) {
  const frameworkSlug = base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_");
  const root = path.join(base.outDir, "catalog", `${frameworkSlug}_${base.edition}`, base.lang);
  const norm = section_path.replace(/\s+/g, "_").replace(/\W+/g, "_");
  const fname = norm;
  return { dir: root, file: path.join(root, `${fname}.md`) };
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

// ----------------------------- EU PIPELINE -----------------------------
function buildEUPath(art, para, letter, point) {
  let p = `Art. ${art}`;
  if (para) p += `(${para})`;
  if (letter) p += `(${letter.toLowerCase()})`;
  if (point) p += `(${point.toLowerCase()})`;
  return p;
}

function processEUDeep(md, base, args) {
  const articles = splitEUArticles(md);
  const chunks = [];
  const seenKeys = new Set();

  for (const art of articles) {
    if (args.emitMdSections) {
      const loc = sectionToFilePath(base, art.section_path);
      ensureDir(loc.dir);
      const mdTitle = art.title && art.title.trim() ? ` — ${art.title.trim()}` : "";
      const content = `## ${art.section_path}${mdTitle}\n\n${art.body}\n`;
      fs.writeFileSync(loc.file, content, "utf8");
    }

    const paras = parseEUParagraphs(art.body, art.start);
    for (const p of paras) {
      const letterBlocks = parseEULettersAndPoints(p.text, p.start);
      if (letterBlocks.length === 0) {
        for (const c of splitIntoAtomicClauses(p.text, base.lang, args.maxTokens)) {
          const section_path = buildEUPath(art.article, p.num !== "0" ? p.num : null, null, null);
          const meta = buildChunkMeta(base, section_path, c.text_md);
          meta.normative = c.normative;
          meta.eu_locator = { article: art.article, paragraph: p.num !== "0" ? p.num : null, letter: null, point: null };
          if (c.context_note) meta.context_note = c.context_note;
          attachParentRelations(meta, section_path);
          if (p.start != null) meta.source_locator = `${base.source_locator}#offset=${p.start}`;
          const issues = qcChecks(meta, seenKeys); if (issues.length) meta._qc = issues;
          chunks.push(meta);
        }
      } else {
        for (const b of letterBlocks) {
          for (const c of splitIntoAtomicClauses(b.text, base.lang, args.maxTokens)) {
            const section_path = buildEUPath(art.article, p.num !== "0" ? p.num : null, b.letter || null, b.point || null);
            const meta = buildChunkMeta(base, section_path, c.text_md);
            meta.normative = c.normative;
            meta.eu_locator = { article: art.article, paragraph: p.num !== "0" ? p.num : null, letter: b.letter || null, point: b.point || null };
            if (c.context_note) meta.context_note = c.context_note;
            attachParentRelations(meta, section_path);
            if (b.start != null) meta.source_locator = `${base.source_locator}#offset=${b.start}`;
            const issues = qcChecks(meta, seenKeys); if (issues.length) meta._qc = issues;
            chunks.push(meta);
          }
        }
      }
    }
  }

  return { articlesCount: articles.length, chunks };
}

// ----------------------------- RUN ONE -----------------------------
async function runOne(opts) {
  const input = opts.input;
  if (!input || !opts.framework || !opts.edition || !opts.lang) {
    throw new Error("Parametri mancanti: input, framework, edition, lang");
  }

  const { text: raw } = await extractPlainText(input);
  var md = normalizeToMarkdown(raw);
  if (detectFramework(opts.framework) === "EU") {
    md = anchorizeEuHeaders(md);
  }  
  const base = {
    framework_code: opts.framework,
    edition: String(opts.edition),
    jurisdiction: opts.jurisdiction || (opts.framework.toUpperCase().includes("GDPR") || opts.framework.toUpperCase().includes("NIS2") || opts.framework.toUpperCase().includes("CRA") ? "EU" : "Global"),
    lang: opts.lang,
    source_locator: `${opts.source || `file://${path.resolve(input)}`}`,
    outDir: opts.outDir || opts.out || "./out",
    normativeDefault: opts.normativeDefault !== undefined ? opts.normativeDefault : true,
  };
  function anchorizeEuHeaders(t) {
    // 1) Vai a capo PRIMA di ogni nuovo header se non è già a inizio riga
    t = t.replace(/([^\n])(?=(?:\s)*(?:Art\.?|Articolo|Article)\s*\d+[a-z]?\.?\b)/gi, '$1\n');
    t = t.replace(/([^\n])(?=(?:\s)*(?:Annex|ANNEX|Allegato)\s*[IVXLC]+\b)/g, '$1\n');

    // 2) Normalizza trattini dopo il numero: "Articolo 5—" -> "Articolo 5 — "
    t = t.replace(/((?:Art\.?|Articolo|Article)\s*\d+[a-z]?\.?)\s*[–—-]\s*(?=\n|$)/gi, '$1 — ');

    // 3) Se un header è “appiccicato” al testo successivo (es. "… punto 1Articolo 11 …"), inserisci newline
    t = t.replace(/(Allegato\s*[IVXLC]+[^]*?\d)\s*(?=(?:Art\.?|Articolo|Article)\s*\d+)/gi, '$1\n');

    return t;
  }

  const frameworkHint = detectFramework(opts.framework);
  let chunks = [];
  let sectionsCount = 0;

  if (frameworkHint === "EU" && (opts.euDeep ?? true)) {
    const { articlesCount, chunks: euChunks } = processEUDeep(md, base, { maxTokens: opts.maxTokens || 300, emitMdSections: opts.emitMdSections ?? true });
    sectionsCount = articlesCount; chunks = euChunks;
  } else {
    const sections = splitSections(frameworkHint, md, opts.framework);
    sectionsCount = sections.length;
    const seenKeys = new Set();
    for (const sec of sections) {
      if (opts.emitMdSections ?? true) {
        const loc = sectionToFilePath(base, sec.section_path);
        ensureDir(loc.dir);
        const mdTitle = sec.title && sec.title.trim() ? ` — ${sec.title.trim()}` : "";
        fs.writeFileSync(loc.file, `## ${sec.section_path}${mdTitle}\n\n${sec.body}\n`, "utf8");
      }
      const unitClauses = splitIntoAtomicClauses(sec.body, base.lang, opts.maxTokens || 300);
      for (const c of unitClauses) {
        const meta = buildChunkMeta(base, sec.section_path, c.text_md);
        attachParentRelations(meta, sec.section_path);
        meta.normative = c.normative;
        if (c.context_note) meta.context_note = c.context_note;
        const issues = qcChecks(meta, seenKeys); if (issues.length) meta._qc = issues;
        chunks.push(meta);
      }
    }
  }

  const outDir = path.join(base.outDir, "chunks");
  ensureDir(outDir);
  const jsonlPath = path.join(outDir, `${base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_")}_${base.edition}_${base.lang}.jsonl`);
  fs.writeFileSync(jsonlPath, chunks.map(j => JSON.stringify(j)).join("\n"), "utf8");

  if (opts.emitManifest ?? true) {
    const manifest = buildManifestYAML(base, chunks);
    const manDir = path.join(base.outDir, "manifest"); ensureDir(manDir);
    const manPath = path.join(manDir, `${base.framework_code.replace(/\s+/g, "_").replace(/[\/]/g, "_")}_${base.edition}_${base.lang}.yaml`);
    fs.writeFileSync(manPath, manifest, "utf8");
  }

  return { sectionsCount, chunksCount: chunks.length, out: jsonlPath };
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
  for (const c of chunks.slice(0, 5000)) {
    lines.push(`  - section_path: "${c.section_path}"`);
    lines.push(`    normative: ${c.normative ? "true" : "false"}`);
    lines.push(`    checksum_sha256: "${c.checksum_sha256.slice(0,16)}..."`);
  }
  return lines.join("\n") + "\n";
}

function warn(msg) { console.warn("[warn] " + msg); }

// ----------------------------- MAIN -----------------------------
(async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.batch) {
    // Batch mode: read manifest JSON
    const raw = fs.readFileSync(args.batch, "utf8");
    const manifest = JSON.parse(raw);
    const defaults = manifest.defaults || {};
    const jobs = manifest.jobs || manifest || [];
    if (!Array.isArray(jobs)) throw new Error("Manifest JSON non valido: manca 'jobs' array");

    const results = [];
    for (let i = 0; i < jobs.length; i++) {
      const job = { ...defaults, ...jobs[i] };
      try {
        const r = await runOne(job);
        console.log(`✔ [${i+1}/${jobs.length}] ${job.framework} ${job.edition} ${job.lang} → sezioni:${r.sectionsCount}, chunk:${r.chunksCount}`);
        results.push({ ok: true, job, ...r });
      } catch (err) {
        console.error(`✖ [${i+1}/${jobs.length}] ${job.framework} ${job.edition} ${job.lang} → ERROR: ${err.message}`);
        results.push({ ok: false, job, error: String(err) });
      }
    }
    const summaryPath = path.join(args.outDir || defaults.out || "./out", `batch_summary_${Date.now()}.json`);
    ensureDir(path.dirname(summaryPath));
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`\nBatch completato. Report: ${summaryPath}`);
    return;
  }

  // Single run
  if (!args.input || !args.framework || !args.edition || !args.lang) {
    console.error("Uso: node estrattore_normativo_v1.3.js <input> --framework <code> --edition <YYYY> --lang <it|en> [--jurisdiction EU|Global] [--source <locator>] [-o outdir] | --batch manifest.json");
    process.exit(1);
  }
  try {
    const r = await runOne(args);
    console.log(`OK — sezioni: ${r.sectionsCount}, chunk: ${r.chunksCount}, file: ${r.out}`);
  } catch (e) {
    console.error(e.stack || String(e)); process.exit(1);
  }
})();
