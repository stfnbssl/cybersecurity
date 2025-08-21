import type { Block, Doc } from "./types.js";

export interface RevealOptions {
  title?: string;
  theme?: "black" | "white" | "league" | "beige" | "sky" | "night" | "serif" | "simple" | "solarized";
  highlightTheme?: string; // e.g., "monokai" (not used if no code blocks)
  splitOn?: (b: Block) => boolean; // default: h1/h2
}

function defaultSplitOn(b: Block): boolean {
  return b.type === "heading" && (b.level === 1 || b.level === 2);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function blockToHtml(b: Block): string {
  switch (b.type) {
    case "heading": {
      const tag = `h${b.level}`;
      return `<${tag}>${escapeHtml(b.text)}</${tag}>`;
    }
    case "paragraph":
      return `<p>${escapeHtml(b.text)}</p>`;
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      const items = b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "table": {
      const head = b.headers.length
        ? `<thead><tr>${b.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>`
        : "";
      const body = `<tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      const caption = b.caption ? `<caption>${escapeHtml(b.caption)}</caption>` : "";
      return `<table>${caption}${head}${body}</table>`;
    }
  }
}

export function docToRevealHtml(doc: Doc, opt: RevealOptions = {}): string {
  const title = opt.title ?? doc.title ?? "Presentazione";
  const theme = opt.theme ?? "simple";
  const splitOn = opt.splitOn ?? defaultSplitOn;

  const slides: string[] = [];
  let current: string[] = [];

  for (const b of doc.blocks) {
    if (splitOn(b)) {
      // Flush previous slide, if any
      if (current.length) {
        slides.push(`<section>\n${current.join("\n")}\n</section>`);
        current = [];
      }
    }
    current.push(blockToHtml(b));
  }
  if (current.length) slides.push(`<section>\n${current.join("\n")}\n</section>`);

  const deck = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/${theme}.css" id="theme" />
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 6px; }
      thead th { background: #f4f4f4; }
      caption { caption-side: top; font-weight: 600; margin-bottom: .5rem; }
    </style>
  </head>
  <body>
    <div class="reveal">
      <div class="slides">
        ${slides.join("\n")}    
      </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
    <script>
      const deck = new Reveal({ hash: true });
      deck.initialize();
    </script>
  </body>
</html>`;

  return deck;
}

