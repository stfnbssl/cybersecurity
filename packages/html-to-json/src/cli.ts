import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { htmlToBlocks } from "./htmlToBlocks.js";
import { mdToBlocks } from "./mdToBlocks.js";
import { pdfToBlocks } from "./pdfToBlocks.js";
import { docToRevealHtml } from "./toReveal.js";
import type { Doc } from "./types.js";
import { fetch } from "undici";

// https://chatgpt.com/c/68a01c9b-e954-8327-90f0-eece4c8c8276

const program = new Command();
program
  .name("html2blocks")
  .description("Parse HTML into ordered blocks JSON and render Reveal.js slides")
  .version("0.1.0");

program
  .command("parse")
  .argument("<input>", "HTML file path or URL")
  .option("-o, --out <file>", "Output JSON file path")
  .option("--readability", "Use Mozilla Readability to extract main content")
  .option("--no-infer-header", "Do not infer table header from first row")
  .action(async (input, opts) => {
    const isUrl = /^(https?:)?\/\//i.test(input);
    let html = "";
    let sourceUrl: string | null = null;

    if (isUrl) {
      sourceUrl = input;
      const res = await fetch(input);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${input}`);
      html = await res.text();
    } else {
      html = await readFile(input, "utf8");
      sourceUrl = `file://${basename(input)}`;
    }

    const doc = htmlToBlocks(html, {
      sourceUrl,
      useReadability: !!opts.readability,
      inferTableHeader: opts.inferHeader !== false,
    });

    const outPath = opts.out || `${doc.id}.json`;
    await writeFile(outPath, JSON.stringify(doc, null, 2), "utf8");
    console.log(`✅ Saved ${outPath}`);
  });

  program
  .command("parse-md")
  .argument("<input>", "Markdown file path or URL")
  .option("-o, --out <file>", "Output JSON file path")
  .action(async (input, opts) => {
    const isUrl = /^(https?:)?\/\//i.test(input);
    let md = "";
    let sourceUrl: string | null = null;

    if (isUrl) {
      sourceUrl = input;
      const res = await fetch(input);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${input}`);
      md = await res.text();
    } else {
      md = await readFile(input, "utf8");
      sourceUrl = input;
    }

    const doc = mdToBlocks(md, { sourceUrl });
    const outPath = opts.out || `${doc.id}.json`;
    await writeFile(outPath, JSON.stringify(doc, null, 2), "utf8");
    console.log(`✅ Saved ${outPath}`);
  });

// ...

program
  .command("parse-pdf")
  .argument("<file>", "PDF file path")
  .option("-o, --out <file>", "Output JSON file path")
  .action(async (file, opts) => {
    const buf = await readFile(file);           // <- Buffer/Uint8Array
 // ✅ converti in Uint8Array senza copia
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const doc = await pdfToBlocks(u8, { sourceUrl: `file://${file}` });
    const outPath = opts.out || `${doc.id}.json`;
    await writeFile(outPath, JSON.stringify(doc, null, 2), "utf8");
    console.log(`✅ Saved ${outPath}`);
  });

program
  .command("render")
  .argument("<json>", "Input JSON file (Doc)")
  .option("-o, --out <file>", "Output HTML path", "deck.html")
  .option("--title <title>", "Deck title")
  .option("--theme <theme>", "Reveal theme (simple, black, white, etc.)", "simple")
  .action(async (jsonPath, opts) => {
    const raw = await readFile(jsonPath, "utf8");



    const doc: Doc = JSON.parse(raw);
    const html = docToRevealHtml(doc, { title: opts.title, theme: opts.theme });
    await writeFile(opts.out, html, "utf8");
    console.log(`✅ Saved ${opts.out}`);
  });

program.parseAsync();
