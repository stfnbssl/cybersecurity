import * as crypto from "crypto";
import type { Block, Doc } from "./types.js";

// lazy import to avoid ESM/CJS friction
async function getPdfJs() {
  // legacy build has a stable API for text extraction in Node
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function looksLikeHeading(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (s.length > 70) return false;
  if (/[.:;!?]$/.test(s)) return false;

  const numbered = /^\s*\d+(\.\d+)*\s+.+$/.test(s);
  const allUpper = s === s.toUpperCase() && s.length >= 3;
  const titleCase = /\b[A-Z][a-z]+\b/.test(s) && /^[A-Z]/.test(s);
  return numbered || allUpper || titleCase;
}

export interface PdfOptions {
  sourceUrl?: string | null;
  treatFirstHeadingAsH1?: boolean;
}

export async function pdfToBlocks(buffer: Uint8Array, opts: PdfOptions = {}): Promise<Doc> {
  const { sourceUrl = null, treatFirstHeadingAsH1 = true } = opts;

  const pdfjs = await getPdfJs();
  // Node: disable worker to keep things simple
  // pdfjs.GlobalWorkerOptions.workerSrc = undefined as any;

  const loadingTask = (pdfjs as any).getDocument({
    data: buffer,
    disableWorker: true,
    isEvalSupported: false, // opzionale, evita eval in ambienti restrittivi
    } as any);
  const pdf = await loadingTask.promise;

  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Join items into lines by their 'str' sequence. This is simplistic but robust for a “linear” parser.
    const pageLines: string[] = [];
    let current = "";

    for (const item of content.items as Array<any>) {
      const text = (item.str as string) ?? "";
      if (!text) continue;

      // Heuristic: pdfjs text stream doesn’t have hard newlines; use big gaps or explicit spaces.
      // Here we keep it simple: append text; pdfjs already inserts spaces in 'str' where appropriate.
      if (current.length === 0) current = text;
      else current += text.length ? " " + text : "";
      // You can add smarter line breaking using item.transform positions if needed.
    }
    // Split long stream into pseudo-lines on occurrences of "  " or sentence ends; conservative for now:
    const split = current.split(/(?<=\.)\s{1,}|\n+/g).map(s => s.trim()).filter(Boolean);
    if (split.length) lines.push(...split);
  }

  // Build blocks linearly with simple heading detection
  const blocks: Block[] = [];
  let paraBuf: string[] = [];
  let firstHeadingSeen = false;

  const flushPara = () => {
    const text = normalize(paraBuf.join(" "));
    paraBuf = [];
    if (text) blocks.push({ type: "paragraph", text });
  };

  const pushHeading = (text: string) => {
    const level = treatFirstHeadingAsH1 && !firstHeadingSeen ? 1 : 2;
    blocks.push({ type: "heading", level, text: normalize(text) });
    firstHeadingSeen = true;
  };

  for (const l of lines) {
    const t = l.trim();
    if (!t) {
      if (paraBuf.length) flushPara();
      continue;
    }
    if (looksLikeHeading(t)) {
      if (paraBuf.length) flushPara();
      pushHeading(t);
    } else {
      paraBuf.push(t);
    }
  }
  if (paraBuf.length) flushPara();

  // plain_text + id
  const plainParts: string[] = [];
  for (const b of blocks) {
    if (b.type === "heading" || b.type === "paragraph") plainParts.push(b.text);
  }
  const plain_text = plainParts.join("\n");
  const id = crypto.createHash("sha256").update(plain_text).digest("hex").slice(0, 16);

  const title =
    (blocks.find(b => b.type === "heading" && (b as any).level === 1) as any)?.text ||
    (lines.find(x => x.trim().length) ?? "Documento PDF");

  const doc: Doc = {
    id,
    source_url: sourceUrl ?? null,
    title,
    fetched_at: new Date().toISOString(),
    lang: null,
    blocks,
    tags: [],
    properties: {},
    plain_text,
    embeddings: null,
  };
  return doc;
}
