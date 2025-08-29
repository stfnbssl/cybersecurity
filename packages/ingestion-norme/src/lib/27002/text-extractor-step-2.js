const fs = require('fs');
const path = require('path');
const { extract27001StructureWithLines } = require('./doc-27002-structure-parser');

const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

/* ------------------------------- STEP 2 ---------------------------------- */
/**
 * Riconosce:
 *  - L1:  ^(\d+)(?!\.) [TAB o SPAZI]  Titolo
 *  - L2:  ^(\d+\.\d+)   [TAB o SPAZI]  Titolo
 * E costruisce:
 *  {
 *    prologue: { lines: [...] }, // eventuale testo prima del primo L1
 *    l1Sections: [
 *      {
 *        id: "5",
 *        title: "Organizational controls",
 *        headingRaw: "5\t Organizational controls",
 *        headingLineIndex: <indice nelle lines>,
 *        lines: [...],
 *        children: [
 *          {
 *            id: "5.1",
 *            title: "Policies for information security",
 *            headingRaw: "...",
 *            headingLineIndex: <indice>,
 *            lines: [...]
 *          }
 *        ]
 *      }
 *    ]
 *  }
 */
function step2(params) {
  const step2Cfg = params && params.step2;
  if (!step2Cfg || !step2Cfg.inputJSONPath || !step2Cfg.outputJSONPath) {
    exitWithError('Parametri mancanti per step 2: servono "iec_27001.step2.inputJSONPath" e "iec_27001.step2.outputJSONPath".');
  }

  const {
    inputJSONPath,
    outputJSONPath,
    includeHeadingInLines = false,   // opzionale
    l1Pattern,                       // opzionale: override regex string
    l2Pattern                        // opzionale: override regex string
  } = step2Cfg;

  // Regex di default
  const L1_RE = l1Pattern
    ? new RegExp(l1Pattern)
    : /^(?<id>\d+)(?!\.)[\t ]+(?<title>.+)$/;

  const L2_RE = l2Pattern
    ? new RegExp(l2Pattern)
    : /^(?<id>\d+\.\d+)[\t ]+(?<title>.+)$/;

  // Carica blocco: { content, lines }
  const block = readJSONSync(inputJSONPath);
  let lines = Array.isArray(block?.lines) ? block.lines.slice() : null;
  if (!lines) {
    if (typeof block?.content === 'string') {
      lines = block.content.split(/\r?\n/);
    } else {
      exitWithError('File di input step2 non valido: manca "lines" e "content".');
    }
  }

  // Risultato
  const result = {
    prologue: { lines: [] },
    l1Sections: []
  };

  // Stato corrente
  let currentL1 = null;
  let currentL2 = null;

  const pushL2 = () => {
    if (!currentL1 || !currentL2) return;
    currentL1.children.push(currentL2);
    currentL2 = null;
  };

  const pushL1 = () => {
    if (!currentL1) return;
    // Se c'è un L2 aperto, chiudilo prima
    pushL2();
    result.l1Sections.push(currentL1);
    currentL1 = null;
  };

  const makeL1 = (id, title, raw, idx) => ({
    id,
    title,
    headingRaw: raw,
    headingLineIndex: idx,
    lines: [],
    children: []
  });

  const makeL2 = (id, title, raw, idx) => ({
    id,
    title,
    headingRaw: raw,
    headingLineIndex: idx,
    lines: []
  });

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // L2?
    let m2 = trimmed.match(L2_RE);
    if (m2 && m2.groups && m2.groups.id) {
      const id = m2.groups.id;
      const title = (m2.groups.title || '').trim();

      // Se non c'è un L1 corrente o l'ID non combacia col prefisso, apri/chiudi L1 di conseguenza
      const l1prefix = id.split('.')[0];
      if (!currentL1 || currentL1.id !== l1prefix) {
        // chiudi eventuali l1/l2 aperti
        pushL2();
        pushL1();
        // crea L1 placeholder se necessario (titolo ignoto)
        currentL1 = makeL1(l1prefix, currentL1 && currentL1.id === l1prefix ? currentL1.title : '', '', idx);
      }

      // chiudi L2 precedente e apri nuovo
      pushL2();
      currentL2 = makeL2(id, title, line, idx);
      if (includeHeadingInLines) currentL2.lines.push(line);
      return;
    }

    // L1?
    let m1 = trimmed.match(L1_RE);
    if (m1 && m1.groups && m1.groups.id) {
      const id = m1.groups.id;
      const title = (m1.groups.title || '').trim();

      // chiudi l2 se aperto e chiudi l1 precedente
      pushL2();
      pushL1();

      // apri nuovo L1
      currentL1 = makeL1(id, title, line, idx);
      if (includeHeadingInLines) currentL1.lines.push(line);
      return;
    }

    // Contenuto "normale"
    if (currentL2) {
      currentL2.lines.push(line);
    } else if (currentL1) {
      currentL1.lines.push(line);
    } else {
      result.prologue.lines.push(line);
    }
  });

  // chiusure finali
  pushL2();
  pushL1();

  // Metadati utili
  const outObj = {
    meta: {
      source: inputJSONPath,
      extractedAt: new Date().toISOString(),
      patterns: {
        l1: L1_RE.source,
        l2: L2_RE.source
      },
      includeHeadingInLines: !!includeHeadingInLines
    },
    ...result
  };

  ensureDirSync(outputJSONPath);
  fs.writeFileSync(step2Cfg.outputJSONPath, JSON.stringify(outObj, null, 2), 'utf8');
  console.log(`[OK] Step 2 completato. Output: ${step2Cfg.outputJSONPath}`);
}

/* -------------------------------- MAIN ----------------------------------- */


function extractRequirements(params) {
    const block = readJSONSync(params.inputJSONPath);
    // const structure = extractStructureWithLines(block.lines);
    const structure = extract27001StructureWithLines(block.lines);
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, structure);
    console.log(`✅ Creato file ${params.outputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node extractor.js <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.iec_27001) {
    exitWithError('Configurazione non valida: proprietà radice "iec_27001" mancante.');
  }

  let params;

  switch (stepNumber) {
    case 2:
      params = config.iec_27001;
      console.log("params", params.step2);
      // step2(params);
      extractRequirements(params.step2);
      break;
    case 22:
      params = config.iec_27002;
      console.log("params", params.step2);
      // step2(params);
      extractRequirements(params.step2);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Implementati step 1 e 2.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
