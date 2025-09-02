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
  const CELEX = celex;
  const LANG  = 'eng';    // 'ita' | 'eng' | 'fra' ...
  const URL   = `http://publications.europa.eu/resource/celex/${CELEX}`;
  console.log(`Scarico ${URL} (lang=${LANG}) ...`);
  const res = await fetch(URL, {
    redirect: 'follow',
    headers: {
      'Accept': 'application/xhtml+xml',
      'Accept-Language': LANG
    }
  });
  /*
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(2);
  }
  const xhtml = await res.text();
  const url = `http://publications.europa.eu/resource/celex/${celex}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'Accept': 'application/xhtml+xml', 'Accept-Language': lang }
  });
  */
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

async function getEuLexJSONFromXHtml( celex ) {
  if (process.argv.length < 3) {
    console.error('Uso: node eurlex-xhtml-to-json.js <CELEX|file.xhtml> [lang]');
    process.exit(1);
  }
  const arg = process.argv[2];
  const lang = (process.argv[3] || 'eng');

  let xhtml = await fetchXHTML(celex, lang);

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

  return [xhtml, final];
  /*
  const outPath = `${celex}.${lang}.structure.json`;
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2), 'utf8');
  console.log(`Salvato: ${outPath}`);
  */
};

module.exports = { getEuLexJSONFromXHtml }
