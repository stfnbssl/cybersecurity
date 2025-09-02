ottimo, grazie per il dettaglio — sì, con il CRA (e in vari OJ “Text/HTML”) capita di trovare **ID numerici puntati** tipo `002.001` invece dei canonici ELI (`art_2.par_1`). Quelli **non sono eID ELI**, ma ancore “di impaginazione” dell’OJ: utili, però **non standard**. Lo standard ELI per suddivisioni usa sempre **codici a 3 lettere** (`art`, `par`, `pnt`, `sub`, `idt`, ecc.) e consente di comporre eID gerarchici (`art_2/par_1/pnt_a`).&#x20;

Qui sotto ti lascio uno **script Node.js (CommonJS)** che gestisce **entrambe** le casistiche:

* se trova eID **ELI** (`art_2.par_1…`) li usa direttamente;
* se trova ID **numerici puntati** (`002.001`, `002.001.003`…) li **mappa** in eID ELI con una regola ragionevole:

  * 1° segmento → `art_<n>`
  * 2° segmento → `par_<n>`
  * 3° segmento → prova a capire dal testo se è un **punto** (`pnt_<lettera>`) o un **subparagrafo** (`sub_<n>`); se non riconosce, ripiega su `sub_<n>`
  * 4° segmento → di solito **indent** (`idt_<romano>`), altrimenti `sub_<n>`
    Queste scelte rispettano la gerarchia ELI (articolo → paragrafi numerati → sotto-paragrafi/punti → indentazioni).&#x20;

> Nota: la nomenclatura ELI è la **fonte autorevole**; gli ID numerici OJ possono cambiare tra atti/versioni. Per output stabile, convertili sempre in eID ELI.&#x20;

---

### `eurlex-xhtml-to-json.js`

Prerequisiti:

```bash
npm init -y
npm i node-fetch@2 cheerio
```

```js
// CommonJS
const fetch = require('node-fetch'); // v2
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// --- ELI known 3-letter codes (estratto essenziale) ---
const KNOWN = new Set(['tit','pbl','cit','rct','enc','prt','tis','cpt','sct','sbs','art','par','unp','sub','pnt','idt','anx','app','tab','fgr','img','toc','wrp','inp','lgd','llg','sfr']);

// Riconosce segmenti ELI: "art_2", "pnt_a", "art_212a"
function parseEliSeg(seg) {
  const m = seg.match(/^([a-z]{3})_(.+)$/i);
  if (!m) return null;
  const code = m[1].toLowerCase();
  if (!KNOWN.has(code)) return null;
  return { code, id: m[2] };
}

// Riconosce ID numerici OJ: "002", "002.001", "002.001.003", ...
function parseNumericId(id) {
  if (!/^\d{3}(?:\.\d{3}){0,3}$/.test(id)) return null;
  return id.split('.').map(s => parseInt(s, 10)); // [2,1,3,...]
}

// Heuristics per capire punto/indent da testo
function classifyByText(text, levelIndex /* 2=terzo livello, 3=quarto livello */) {
  const t = text.trim().replace(/\s+/g, ' ');
  // marker tipici all'inizio riga
  const starts = t.slice(0, 8);

  // (a) a) – lettere minuscole => point
  if (/^\(?[a-z]\)/.test(starts)) return 'pnt';               // en/it/de framm. tipo "a)"
  // (i), (ii) – numeri romani => indent
  if (/^\(?[ivxlcdm]+\)/i.test(starts)) return 'idt';
  // (1) 1. – numeri arabi in terzo livello: spesso sub-paragraph
  if (/^\(?\d+\)|^\d+\./.test(starts)) return (levelIndex === 2 ? 'sub' : 'par');

  // fallback: terzo livello=sub, quarto livello=idt
  return levelIndex === 2 ? 'sub' : 'idt';
}

function ensureNode(map, pathArr, docIndex, meta = {}) {
  let cursor = map;
  for (const seg of pathArr) {
    const key = `${seg.code}_${seg.id}`;
    if (!cursor.children) cursor.children = {};
    if (!cursor.children[key]) cursor.children[key] = { ...seg, key, _docIndex: docIndex, children: {} };
    cursor = cursor.children[key];
  }
  // arricchisci con meta (ancora, heading, text) se non presenti
  if (meta.anchor) cursor.anchor = meta.anchor;
  if (meta.heading && !cursor.heading) cursor.heading = meta.heading;
  if (meta.text && !cursor.text) cursor.text = meta.text;
  return cursor;
}

function treeToArray(node) {
  const out = { ...node };
  if (node.children) {
    const arr = Object.values(node.children)
      .sort((a, b) => (a._docIndex ?? 0) - (b._docIndex ?? 0))
      .map(treeToArray);
    out.children = arr;
  }
  return out;
}

async function fetchXHTML(celex, lang='eng') {
  const url = `http://publications.europa.eu/resource/celex/${celex}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'Accept': 'application/xhtml+xml', 'Accept-Language': lang }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

(async () => {
  if (process.argv.length < 3) {
    console.error('Uso: node eurlex-xhtml-to-json.js <CELEX|file.xhtml> [lang]');
    process.exit(1);
  }
  const arg = process.argv[2];
  const lang = (process.argv[3] || 'eng');

  let xhtml, celex = null;
  if (fs.existsSync(arg)) {
    xhtml = fs.readFileSync(arg, 'utf8');
    celex = path.basename(arg).split('.')[0];
  } else {
    celex = arg;
    xhtml = await fetchXHTML(celex, lang);
  }

  const $ = cheerio.load(xhtml, { decodeEntities: false });

  const title = $('title').first().text().trim() || $('h1,h2').first().text().trim();

  const root = { celex, language: lang, title, children: {} };

  let docIndex = 0;

  // 1) passa su tutti gli elementi con id
  $('[id]').each((_, el) => {
    const $el = $(el);
    const rawId = String($el.attr('id') || '').trim();
    if (!rawId) return;

    const eliSegments = rawId.split('.').map(parseEliSeg);
    const isEli = eliSegments.every(s => s); // tutti segmenti validi ELI?

    let path = null;

    if (isEli) {
      // caso ELI standard
      path = eliSegments;
    } else {
      // prova con numerico OJ
      const nums = parseNumericId(rawId);
      if (nums) {
        // Costruisci percorso ELI equivalente con euristica
        // nums[0] => art
        const segs = [{ code: 'art', id: String(nums[0]) }];
        if (nums.length >= 2) segs.push({ code: 'par', id: String(nums[1]) });
        if (nums.length >= 3) {
          // prova a capire dal testo del nodo
          const text = $el.text() || '';
          const kind = classifyByText(text, 2); // terzo livello
          segs.push({ code: kind, id: String(nums[2]) });
        }
        if (nums.length >= 4) {
          const text = $el.text() || '';
          const kind = classifyByText(text, 3); // quarto livello
          segs.push({ code: kind, id: String(nums[3]) });
        }
        path = segs;
      } else {
        return; // ignora id non interpretabili
      }
    }

    const meta = {
      anchor: `#${rawId}`,
      heading: $el.find('h1,h2,h3,h4,h5,h6').first().text().trim(),
      text: $el.text().replace(/\s+/g, ' ').trim()
    };

    ensureNode(root, path, docIndex++, meta);
  });

  // 2) serializza in JSON “pulito”
  function toSimple(node) {
    const out = {
      type: node.code || 'root',
      id: node.id || null,
      anchor: node.anchor || null,
      heading: node.heading || null,
      text: node.text || null,
      children: []
    };
    if (node.children) {
      for (const ch of Object.values(node.children).sort((a,b)=>a._docIndex-b._docIndex)) {
        out.children.push(toSimple(ch));
      }
    }
    return out;
  }

  const final = {
    celex,
    language: lang,
    title,
    structure: toSimple(treeToArray(root))
  };

  const outPath = `${celex}.${lang}.structure.json`;
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2), 'utf8');
  console.log(`Salvato: ${outPath}`);
})();
```

**Come usarlo**

```bash
# CRA in inglese (OJ)
node eurlex-xhtml-to-json.js 32024R2847 eng

# o su un file XHTML salvato
node eurlex-xhtml-to-json.js 32024R2847.eng.xhtml eng
```

### Perché così?

* La **mappatura ELI ufficiale** richiede codici a 3 lettere e una gerarchia chiara; per questo lo script converte gli ID numerici in un percorso ELI coerente (`art_/par_/sub_|pnt_/idt_`).&#x20;
* Gli **ID numerici** che hai visto (es. `002.001`) sono pratici per il deep-linking dell’OJ, ma non sono garantiti come identificatori canonici; meglio **normalizzarli** in ELI per usarli nella tua webapp/API.&#x20;

Se vuoi, posso:

* tarare i rilevatori linguistici (IT/EN/FR/DE) per distinguere meglio **punti** vs **subparagrafi**;
* emettere direttamente **URI ELI completi** (es. `/eli/reg/2024/2847/oj/art_2/par_1`), come suggerito dalle specifiche.&#x20;

### sys_source https://chatgpt.com/c/68b5a4fe-0908-8326-b261-3b2282d2be87