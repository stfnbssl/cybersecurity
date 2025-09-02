// oscal-to-html.js
// CommonJS, nessuna dipendenza. Genera un HTML navigabile con ricerca per un catalogo OSCAL (NIST 800-53).
// Uso:
//   node oscal-to-html.js
//   node oscal-to-html.js "C:\\path\\to\\oscal_controls.json"

const fs = require("fs");
const path = require("path");

// === Config: percorso di default indicato dall'utente ===
const DEFAULT_INPUT =
  "C:\\My\\wizzi\\stfnbssl\\cybersecurity\\packages\\ingestion-norme\\extraction\\nist_800_53_2020\\step_11\\oscal_controls.json";

// === Helpers di base ===
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function htmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s = "") {
  return htmlEscape(s).replace(/\n/g, "<br>");
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function toDateStr(isoLike) {
  if (!isoLike) return "";
  try {
    const d = new Date(isoLike);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  } catch {}
  return String(isoLike);
}

// Raccoglie tutti i 'prose' (testi) dalle parts per un certo name (es. "statement", "guidance")
function collectProseByName(parts, name) {
  const out = [];
  (function walk(arr) {
    safeArray(arr).forEach((p) => {
      if (p && typeof p === "object") {
        if (p.name === name && p.prose) out.push(p.prose);
        if (p.parts) walk(p.parts);
      }
    });
  })(parts);
  return out;
}

// Render ricorsivo di tutte le parts (oltre a statement/guidance) come lista
function renderPartsList(parts) {
  if (!parts || !parts.length) return "";
  const items = parts
    .map((p) => {
      const title =
        (p.title ? `<strong>${htmlEscape(p.title)}</strong> — ` : "") +
        (p.name ? `<code>${htmlEscape(p.name)}</code>` : "");
      const prose = p.prose ? `<div class="prose">${nl2br(p.prose)}</div>` : "";
      const nested = p.parts ? renderPartsList(p.parts) : "";
      return `<li>${title}${prose}${nested}</li>`;
    })
    .join("");
  return `<ul class="parts-list">${items}</ul>`;
}

// Stringa "indice" per la ricerca client-side
function indexText({ id, title, groupId, groupTitle, statement, guidance }) {
  return [
    id || "",
    title || "",
    groupId || "",
    groupTitle || "",
    (statement || []).join(" "),
    (guidance || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

// Estrae info dal catalog JSON (robusto per varianti OSCAL)
function normalizeCatalog(json) {
  // La forma canonica è { catalog: { metadata, groups, controls? } }
  const cat = json.catalog || json;
  const metadata = cat.metadata || {};
  const groups = safeArray(cat.groups);

  // Alcuni cataloghi possono avere controlli a livello root
  const rootControls = safeArray(cat.controls);

  return { metadata, groups, rootControls };
}

function paramToHtml(param) {
  const label =
    (param.label ? `<strong>${htmlEscape(param.label)}</strong>` : "") ||
    `<strong>${htmlEscape(param.id || "")}</strong>`;
  const values = safeArray(param.values || param.select?.how_many ? param.values : param.values);
  const valuesText = values && values.length ? `: ${htmlEscape(values.join(", "))}` : "";
  const constraints = param.constraints
    ? `<div class="dim">Constraints: ${htmlEscape(JSON.stringify(param.constraints))}</div>`
    : "";
  const guidance = param.guidance ? `<div class="dim">${nl2br(param.guidance)}</div>` : "";
  return `<li>${label}${valuesText}${guidance}${constraints}</li>`;
}

function propsTable(props) {
  if (!props || !props.length) return "";
  const rows = props
    .map((p) => {
      const name = p.name || p.class || p.ns || "";
      const val = p.value || "";
      return `<tr><td>${htmlEscape(name)}</td><td>${htmlEscape(val)}</td></tr>`;
    })
    .join("");
  return `<table class="props"><thead><tr><th>Prop</th><th>Valore</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Render ricorsivo di un controllo + subcontrols
function renderControl(control, groupCtx, depth = 0) {
  if (!control) return "";

  const id = control.id || control["control-id"] || "";
  const title = control.title || "";
  const statement = collectProseByName(control.parts, "statement");
  const guidance = [
    ...collectProseByName(control.parts, "guidance"),
    ...collectProseByName(control.parts, "supplemental-guidance"),
  ];
  const params = safeArray(control.params);
  const props = safeArray(control.props);
  const others = (() => {
    // Parts non-statement/guidance per una resa completa ma leggera
    const filtered = safeArray(control.parts)?.filter(
      (p) => p.name !== "statement" && p.name !== "guidance" && p.name !== "supplemental-guidance"
    );
    return filtered && filtered.length ? renderPartsList(filtered) : "";
  })();

  const index = indexText({
    id,
    title,
    groupId: groupCtx.id,
    groupTitle: groupCtx.title,
    statement,
    guidance,
  });

  const paramsHtml = params.length
    ? `<details class="blk"><summary>Parametri (${params.length})</summary><ul class="params">${params
        .map(paramToHtml)
        .join("")}</ul></details>`
    : "";

  const propsHtml = props.length
    ? `<details class="blk"><summary>Proprietà (${props.length})</summary>${propsTable(props)}</details>`
    : "";

  const statementHtml = statement.length
    ? `<div class="blk"><div class="label">Statement</div><blockquote>${nl2br(
        statement.join("\n\n")
      )}</blockquote></div>`
    : "";

  const guidanceHtml = guidance.length
    ? `<details class="blk"><summary>Guidance</summary><div class="guidance">${nl2br(
        guidance.join("\n\n")
      )}</div></details>`
    : "";

  // Subcontrols/enhancements
  const subs = safeArray(control.controls);
  const subsHtml = subs.length
    ? `<details class="blk nested"><summary>Subcontrols / Enhancements (${subs.length})</summary>
         <div class="subcontrols">
           ${subs.map((sc) => renderControl(sc, groupCtx, depth + 1)).join("")}
         </div>
       </details>`
    : "";

  return `
  <article class="control depth-${depth}" data-index="${htmlEscape(index)}">
    <details open="${depth === 0 ? "open" : ""}">
      <summary>
        <span class="cid">${htmlEscape(id)}</span>
        <span class="ctitle">${htmlEscape(title)}</span>
        <span class="cgroup">${htmlEscape(groupCtx.title || groupCtx.id || "")}</span>
      </summary>
      ${statementHtml}
      ${guidanceHtml}
      ${paramsHtml}
      ${propsHtml}
      ${others}
      ${subsHtml}
    </details>
  </article>`;
}

function renderGroup(group) {
  const groupId = group.id || "";
  const groupTitle = group.title || group["class"] || groupId;
  const controls = safeArray(group.controls);
  const inner =
    controls.length > 0
      ? controls.map((c) => renderControl(c, { id: groupId, title: groupTitle }, 0)).join("\n")
      : `<div class="dim">Nessun controllo direttamente elencato in questo gruppo.</div>`;

  return `
  <section class="group" id="group-${htmlEscape(groupId)}">
    <h2>${htmlEscape(groupTitle)} <span class="gid">${htmlEscape(groupId)}</span></h2>
    ${inner}
  </section>`;
}

function buildHtml(doc) {
  const { metadata, groups, rootControls } = normalizeCatalog(doc);

  const catalogTitle =
    metadata.title ||
    (metadata["document-id"] && metadata["document-id"].identifier) ||
    "OSCAL Catalog";
  const version = metadata.version || "";
  const pubDate =
    (metadata.published || metadata.last_modified || metadata["last-modified"]) && toDateStr(metadata.published || metadata.last_modified || metadata["last-modified"]);

  const headerMeta = [
    version ? `<div><strong>Versione:</strong> ${htmlEscape(version)}</div>` : "",
    pubDate ? `<div><strong>Data:</strong> ${htmlEscape(pubDate)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  // Se il catalogo ha controlli a root, mostriamoli come un "gruppo" sintetico
  const syntheticGroup =
    rootControls.length > 0
      ? [
          {
            id: "root",
            title: "Root Controls",
            controls: rootControls,
          },
        ]
      : [];

  const allGroups = [...syntheticGroup, ...groups];

  const toc = allGroups
    .map(
      (g) =>
        `<li><a href="#group-${htmlEscape(g.id || "")}">${htmlEscape(
          g.title || g.id || "(senza titolo)"
        )}</a></li>`
    )
    .join("");

  const bodyGroups = allGroups.map(renderGroup).join("\n");

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>${htmlEscape(catalogTitle)} — Viewer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --bg:#0b0e12; --fg:#e7ecf3; --muted:#9aa4b2; --card:#11161d; --accent:#5aa7ff; --ring:#2a3350; }
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;background:var(--bg);color:var(--fg);line-height:1.5}
  header{position:sticky;top:0;background:linear-gradient(180deg,rgba(11,14,18,.95),rgba(11,14,18,.85));backdrop-filter: blur(6px);padding:16px 20px;border-bottom:1px solid var(--ring);z-index:10}
  .wrap{display:grid;grid-template-columns:280px 1fr;gap:18px;padding:18px}
  @media (max-width: 900px){ .wrap{grid-template-columns:1fr} aside{order:2} main{order:1} }
  h1{margin:0 0 6px;font-size:22px}
  .meta{display:flex;gap:16px;color:var(--muted);font-size:14px}
  .searchbar{margin-top:12px;display:flex;gap:10px;align-items:center}
  .searchbar input{flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--ring);background:#0f141b;color:var(--fg);outline:none}
  .counter{font-size:13px;color:var(--muted)}
  aside{position:sticky;top:86px;align-self:start;border:1px solid var(--ring);background:var(--card);border-radius:14px;padding:14px}
  aside h3{margin:4px 0 8px;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
  aside ul{list-style:none;padding:0;margin:0}
  aside li{margin:6px 0}
  aside a{color:var(--fg);text-decoration:none}
  aside a:hover{color:var(--accent)}
  section.group{margin-bottom:28px}
  section.group h2{font-size:20px;margin:10px 0 12px;border-bottom:1px dashed var(--ring);padding-bottom:6px}
  .gid{font-weight:400;color:var(--muted);font-size:14px;margin-left:8px}
  article.control{border:1px solid var(--ring);background:var(--card);border-radius:14px;margin:10px 0;padding:6px 10px}
  article.control details{padding:6px 2px}
  article.control summary{display:flex;gap:12px;align-items:baseline;cursor:pointer;list-style:none}
  article.control summary::-webkit-details-marker{display:none}
  .cid{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;background:#0e1624;border:1px solid #18243a;padding:2px 6px;border-radius:8px;color:#b0c8ff}
  .ctitle{font-weight:600}
  .cgroup{margin-left:auto;color:var(--muted);font-size:13px}
  .blk{margin:10px 0}
  .blk.nested{border-top:1px dashed var(--ring);padding-top:8px}
  .label{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
  blockquote{margin:0;padding:10px 12px;border-left:3px solid var(--accent);background:#0f141b;border-radius:6px}
  .guidance{font-size:14.5px;color:#d8deea}
  .dim{color:var(--muted)}
  table.props{width:100%;border-collapse:collapse;font-size:14px}
  table.props th, table.props td{border:1px dashed var(--ring);padding:6px 8px;text-align:left}
  ul.params{padding-left:18px}
  ul.params li{margin:6px 0}
  ul.parts-list{padding-left:18px}
  .subcontrols > article.control{margin-left:8px}
  .depth-1{border-style:dashed}
  .depth-2{opacity:.95}
  .hidden{display:none !important}
  footer{padding:30px;color:var(--muted);text-align:center}
</style>
</head>
<body>
  <header>
    <h1>${htmlEscape(catalogTitle)} — Viewer</h1>
    <div class="meta">${headerMeta}</div>
    <div class="searchbar">
      <input id="q" type="search" placeholder="Cerca per ID, titolo, gruppo, testo… (es. ac-2, audit, access control)" autocomplete="off" />
      <span class="counter" id="counter"></span>
    </div>
  </header>
  <div class="wrap">
    <aside>
      <h3>Gruppi</h3>
      <ul>${toc}</ul>
    </aside>
    <main id="content">
      ${bodyGroups}
    </main>
  </div>
  <footer>
    Generato localmente — nessun dato inviato all'esterno.
  </footer>
<script>
  (function(){
    const input = document.getElementById('q');
    const cards = Array.from(document.querySelectorAll('article.control'));
    const counter = document.getElementById('counter');

    function updateCounter(shown, total){ counter.textContent = shown + ' / ' + total; }

    function search(q){
      const term = (q||'').trim().toLowerCase();
      if (!term){
        cards.forEach(el => el.classList.remove('hidden'));
        updateCounter(cards.length, cards.length);
        return;
      }
      let shown = 0;
      for (const el of cards){
        const idx = el.getAttribute('data-index') || '';
        const match = idx.includes(term);
        el.classList.toggle('hidden', !match);
        if (match) shown++;
      }
      updateCounter(shown, cards.length);
    }
    input.addEventListener('input', () => search(input.value));
    updateCounter(cards.length, cards.length);
  })();
</script>
</body>
</html>`;
}

// === Main ===
(function main() {
  const inputPath = process.argv[2] ? String(process.argv[2]) : DEFAULT_INPUT;

  if (!fs.existsSync(inputPath)) {
    console.error("[ERRORE] File non trovato:", inputPath);
    process.exit(1);
  }

  let json;
  try {
    json = readJson(inputPath);
  } catch (e) {
    console.error("[ERRORE] Impossibile leggere/parsing JSON:", e.message);
    process.exit(1);
  }

  const html = buildHtml(json);

  // Percorso output: <basename>_viewer.html vicino al JSON, se scrivibile; altrimenti in cwd
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const outPathCandidate = path.join(dir, base + "_viewer.html");
  const outPath =
    (() => { try { fs.accessSync(dir, fs.constants.W_OK); return outPathCandidate; } catch { return path.join(process.cwd(), base + "_viewer.html"); } })();

  fs.writeFileSync(outPath, html, "utf8");
  console.log("[OK] HTML generato:", outPath);
})();
