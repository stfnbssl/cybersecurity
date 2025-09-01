import * as crypto from "crypto";
import MarkdownIt from "markdown-it";
import type { Block, Doc } from "./types.js";

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface MdOptions {
  sourceUrl?: string | null;
  lang?: string | null;
}

export function mdToBlocks(md: string, opts: MdOptions = {}): Doc {
  const { sourceUrl = null, lang = null } = opts;
  const mdParser = new MarkdownIt({
    html: false,     // niente HTML inline
    linkify: true,
    breaks: false
  });

  // Tokenizza il markdown (supporta GFM tables di default)
  const tokens = mdParser.parse(md, {});

  const blocks: Block[] = [];
  let pendingParagraph: string | null = null;

  const flushParagraph = () => {
    if (pendingParagraph && pendingParagraph.trim().length) {
      blocks.push({ type: "paragraph", text: normalizeWhitespace(pendingParagraph) });
    }
    pendingParagraph = null;
  };

  // Helpers per tabelle
  type TableRow = string[];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: TableRow[] = [];
  let collectingHeader = false;
  let collectingRow = false;
  let currentRow: string[] = [];

  // Helpers per liste
  let inList = false;
  let listOrdered = false;
  let listItems: string[] = [];

  const pushListIfAny = () => {
    if (inList) {
      const items = listItems.map(normalizeWhitespace).filter(Boolean);
      if (items.length) blocks.push({ type: "list", ordered: listOrdered, items });
    }
    inList = false;
    listItems = [];
    listOrdered = false;
  };

  // Walk dei token
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    switch (t.type) {
      // Heading
      case "heading_open": {
        flushParagraph();
        pushListIfAny();
        // livello da tag 'h1'..'h6'
        const raw = parseInt(t.tag.replace("h", ""), 10);
        const level = Math.min(6, Math.max(1, raw)) as 1 | 2 | 3 | 4 | 5 | 6;
        const inline = tokens[i + 1];
        const text = inline && inline.type === "inline" ? inline.content : "";
        blocks.push({ type: "heading", level, text: normalizeWhitespace(text) });
        // salta la coppia inline + heading_close
        break;
      }

      // Paragraph
      case "paragraph_open": {
        // accumuliamo il testo dell’inline successivo in pendingParagraph
        const inline = tokens[i + 1];
        if (inline && inline.type === "inline") {
          pendingParagraph = (pendingParagraph ? pendingParagraph + "\n" : "") + inline.content;
        }
        break;
      }
      case "paragraph_close": {
        flushParagraph();
        break;
      }

      // Liste
      case "bullet_list_open":
      case "ordered_list_open": {
        flushParagraph();
        pushListIfAny();
        inList = true;
        listOrdered = t.type === "ordered_list_open";
        break;
      }
      case "list_item_open": {
        const inline = tokens[i + 1];
        if (inline && inline.type === "inline") {
          listItems.push(inline.content);
        } else {
          listItems.push("");
        }
        break;
      }
      case "bullet_list_close":
      case "ordered_list_close": {
        pushListIfAny();
        break;
      }

      // Tabelle (GFM)
      case "table_open": {
        flushParagraph();
        pushListIfAny();
        inTable = true;
        tableHeaders = [];
        tableRows = [];
        break;
      }
      case "thead_open": {
        collectingHeader = true;
        break;
      }
      case "thead_close": {
        collectingHeader = false;
        break;
      }
      case "tbody_open": {
        // no-op
        break;
      }
      case "tr_open": {
        collectingRow = true;
        currentRow = [];
        break;
      }
      case "th_open":
      case "td_open": {
        // prendi l’inline interno come cella
        const inline = tokens[i + 1];
        const cell = inline && inline.type === "inline" ? inline.content : "";
        currentRow.push(cell);
        break;
      }
      case "tr_close": {
        collectingRow = false;
        if (collectingHeader) {
          tableHeaders = currentRow;
        } else {
          tableRows.push(currentRow);
        }
        currentRow = [];
        break;
      }
      case "table_close": {
        inTable = false;

        // normalizza header/rows
        const headers = tableHeaders.map(normalizeWhitespace);
        const rows = tableRows.map(r => r.map(normalizeWhitespace));

        const hasHeaders = headers.length > 0 && headers.some(h => h.length > 0);
        let finalHeaders = headers;
        let dataRows = rows;

        if (!hasHeaders && rows.length > 0 && rows[0].every(c => c.trim().length)) {
          finalHeaders = rows[0];
          dataRows = rows.slice(1);
        }

        const as_objects = finalHeaders.length
          ? dataRows.map(r => Object.fromEntries(finalHeaders.map((h, idx) => [h, r[idx] ?? ""])))
          : [];

        blocks.push({
          type: "table",
          caption: "", // Markdown standard non ha didascalie per le tabelle
          headers: finalHeaders,
          rows: dataRows,
          as_objects
        });

        // reset
        tableHeaders = [];
        tableRows = [];
        break;
      }

      default:
        break;
    }
  }

  // flush finali
  flushParagraph();
  pushListIfAny();

  // plain_text per FT index
  const plainParts: string[] = [];
  for (const b of blocks) {
    if (b.type === "heading" || b.type === "paragraph") plainParts.push(b.text);
    else if (b.type === "list") plainParts.push(...b.items);
    else if (b.type === "table") {
      if (b.headers.length) plainParts.push(...b.headers);
      for (const r of b.rows) plainParts.push(...r);
    }
  }
  const plain_text = plainParts.join("\n");
  const hash = crypto.createHash("sha256").update(plain_text).digest("hex");

  // Titolo: primo h1 se presente, altrimenti prima riga del markdown o “Documento”
  const firstH1 = blocks.find(b => b.type === "heading" && b.level === 1) as Extract<Block, {type:"heading"}> | undefined;
  const title = firstH1 ? firstH1.text : (md.split(/\r?\n/)[0]?.trim() || "Documento");

  const doc: Doc = {
    id: hash.slice(0, 16),
    source_url: sourceUrl ?? null,
    title,
    fetched_at: new Date().toISOString(),
    lang,
    blocks,
    tags: [],
    properties: {},
    plain_text,
    embeddings: null
  };

  return doc;
}
