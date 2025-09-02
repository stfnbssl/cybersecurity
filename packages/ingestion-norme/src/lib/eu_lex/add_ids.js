// CommonJS
const fetch = require('node-fetch'); // v2 (ESM-free)
const fs = require('fs');
const cheerio = require('cheerio');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync} = require('../utils');
const {getEuLexJSONFromXHtml} = require('./xhtml-to-json');

if (process.argv.length < 3) {
  console.error('Uso: node eurlex-add-ids.js <CELEX> [lingua]');
  process.exit(1);
}

async function getXHTML( celex ) {
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
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(2);
  }
  const xhtml = await res.text();
  // Nota: anche se è XHTML, cheerio in modalità HTML va bene per manipolare il DOM.
  const $ = cheerio.load(xhtml, { decodeEntities: false });
  // Pattern per titoli di articolo (IT/EN). Estendibile ad altre lingue.
  const patterns = [
    /^Articolo\s+(\d+)\b/i,
    /^Article\s+(\d+)\b/i
  ];
  // Aggiunge id="artN" all'elemento che contiene il titolo dell'articolo
  $('body *').each((_, el) => {
    const $el = $(el);
    if ($el.attr('id')) return; // non sovrascrivere id esistenti
    const text = $el.text().replace(/\u00A0/g, ' ').trim();

    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const id = `art${m[1]}`;
        $el.attr('id', id);
        break;
      }
    }
  });
  // De-duplica eventuali id uguali (capita se la struttura ripete il titolo)
  const seen = new Set();
  $('[id]').each((_, el) => {
    let id = $(el).attr('id');
    if (!seen.has(id)) {
      seen.add(id);
      return;
    }
    // genera suffissi -2, -3, ...
    let i = 2;
    while (seen.has(`${id}-${i}`)) i++;
    $(el).attr('id', `${id}-${i}`);
    seen.add($(el).attr('id'));
  });
  console.log($.html())
  return [xhtml, $.html()];
}

/*
  const outPath = `${CELEX}.${LANG}.with-ids.xhtml`;
  fs.writeFileSync(outPath, $.html(), 'utf8');
  console.log(`Salvato: ${outPath}`);
  console.log('Esempio link: apri il file e usa il frammento #art5 (es. ...with-ids.xhtml#art5)');
})().catch(err => {
  console.error(err);
  process.exit(3);
});
*/

async function executeExtraction(config) {
    if (!config.CELEX) {
        throw new Error(`Proprietà "CELEX" mancante nella configurazione`);
    }
    if (!config.outputXHTMLFile_pre) {
        throw new Error(`Proprietà "outputXHTMLFile_pre" mancante nella configurazione`);
    }
    if (!config.outputXHTMLFile_post) {
        throw new Error(`Proprietà "outputXHTMLFile_post" mancante nella configurazione`);
    }
    //const [xhtml_pre, xhtml_post] = await getXHTML(config.CELEX);
    const [xhtml_pre, json_post] = await getEuLexJSONFromXHtml(config.CELEX);
    ensureDirSync(config.outputXHTMLFile_pre);
    writeFileSync(config.outputXHTMLFile_pre, xhtml_pre);
    // ensureDirSync(config.outputXHTMLFile_post);
    // writeFileSync(config.outputXHTMLFile_post, xhtml_post);
    ensureDirSync(config.outputJSON_post);
    writeJSONSync(config.outputJSON_post, json_post);
    console.log(`📂 CELEX: ${config.CELEX}`);
    //console.log(`💾 File output: ${config.outputXHTMLFile}`);
    console.log(`💾 File output: ${config.outputJSON_post}`);
}

async function main() {
    const [, , configPath, configProp, stepArg] = process.argv;
    if (!configPath || !configProp || !stepArg) {
        console.log('Uso: node add_ids.js <config.json> <configProp> <stepNumber>');
        process.exit(2);
    }
    const stepProp = stepArg;

    const config = readJSONSync(configPath);
    if (!config || typeof config !== 'object' || !config[configProp]) {
        exitWithError('Configurazione non valida: proprietà radice "' + configProp + '" mancante.');
    }
    if (!config[configProp][stepProp]) {
        exitWithError('Configurazione non valida: step "' + stepProp + '" mancante.');
    }
    console.log("config." + configProp + '.' + stepProp, config[configProp][stepProp])
    await executeExtraction(config[configProp][stepProp]);
}

// Gestione segnali per chiusura pulita
process.on('SIGINT', () => {
    console.log('\n🛑 Interruzione richiesta dall\'utente');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Errore non gestito:', reason);
    process.exit(1);
});

// Avvia l'esecuzione se questo file viene eseguito direttamente
// Eseguo lo script se chiamato direttamente
if (require.main === module) {
    main();
}

// Esporta la funzione per uso programmatico
module.exports = { executeExtraction };

