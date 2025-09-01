import * as crypto from "crypto";
import { load, CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | {
      type: "table";
      caption: string;
      headers: string[];
      rows: string[][];
      as_objects: Record<string, string>[];
    };

export interface Doc {
  id: string;
  source_url?: string | null;
  title: string;
  fetched_at: string;
  lang: string | null;
  blocks: Block[];
  tags: string[];
  properties: Record<string, unknown>;
  plain_text: string;
  embeddings: unknown | null;
}

export interface ParseOptions {
  sourceUrl?: string | null;
  useReadability?: boolean;
  inferTableHeader?: boolean;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// overloads
export function htmlToBlocks(html: string, sourceUrl?: string | null): Doc;
export function htmlToBlocks(html: string, opts?: ParseOptions | string | null): Doc;
// implementazione
export function htmlToBlocks(html: string, opts?: ParseOptions | string | null): Doc {
  // normalizza gli argomenti in un oggetto options
  const options: ParseOptions =
    typeof opts === "string" || opts == null
      ? { sourceUrl: (opts as string | null) ?? null }
      : (opts as ParseOptions);

  const sourceUrl = options.sourceUrl ?? null;
  const useReadability = !!options.useReadability;
  const inferTableHeader = options.inferTableHeader !== false;

  const $: CheerioAPI = load(html);
  const title = normalizeWhitespace($("title").text() || "Documento");
  const $root: Cheerio<Element> = $("body").length ? $("body") : $(":root");

  const blocks: Block[] = [];

  const pushParagraph = (el: Element): void => {
    const text = normalizeWhitespace($(el).text());
    if (text) blocks.push({ type: "paragraph", text });
  };

  const pushList = (el: Element, ordered: boolean): void => {
    const $el = $(el);
    const items: string[] = $el
      .children("li")
      .map((_: number, li: Element) => normalizeWhitespace($(li).text()))
      .get()
      .filter((s: string) => !!s);
    if (items.length) blocks.push({ type: "list", ordered, items });
  };

  const pushTable = (el: Element): void => {
    const $el = $(el);
    const headers: string[] = $el
      .find("th")
      .map((_: number, th: Element) => normalizeWhitespace($(th).text()))
      .get();

    const hasHeaders = headers.length > 0;
    const dataRows: string[][] = [];

    $el.find("tr").each((_: number, tr: Element) => {
      const cells: string[] = $(tr)
        .children("td,th")
        .map((__: number, c: Element) => normalizeWhitespace($(c).text()))
        .get();
      if (!cells.length) return;
      if (hasHeaders && cells.join("|") === headers.join("|")) return; // skip header row duplicate
      dataRows.push(cells);
    });

    const finalHeaders: string[] = hasHeaders
      ? headers
      : dataRows.length
      ? dataRows[0]
      : [];

    const rows: string[][] =
      hasHeaders ? dataRows : dataRows.slice(1); // se i headers sono inferiti dalla prima riga, escludila dai dati

    const as_objects: Record<string, string>[] =
      finalHeaders.length
        ? rows.map((r: string[]) =>
            Object.fromEntries(
              finalHeaders.map((h: string, i: number) => [h, r[i] ?? ""])
            )
          )
        : [];

    const caption = normalizeWhitespace($el.find("caption").text() || "");

    blocks.push({
      type: "table",
      caption,
      headers: finalHeaders,
      rows,
      as_objects
    });
  };

  // Walk DOM in ordine e costruisci i blocchi
  $root.find("*").each((_: number, el: Element) => {
    const tag = (el.tagName || "").toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1] as string, 10);
      const text = normalizeWhitespace($(el).text());
      if (text) blocks.push({ type: "heading", level, text });
    } else if (tag === "p") {
      pushParagraph(el);
    } else if (tag === "ul") {
      pushList(el, false);
    } else if (tag === "ol") {
      pushList(el, true);
    } else if (tag === "table") {
      pushTable(el);
    }
  });

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

  const doc: Doc = {
    id: hash.slice(0, 16),
    source_url: sourceUrl ?? undefined,
    title,
    fetched_at: new Date().toISOString(),
    lang: null,
    blocks,
    tags: [],
    properties: {},
    plain_text,
    embeddings: null
  };
  return doc;
}
