// extractor.js (CommonJS)
// Uso:
//   Step 1: node extractor.js /path/to/config.json 1
//   Step 2: node extractor.js /path/to/config.json 2

const fs = require('fs');
const path = require('path');

function exitWithError(msg, code = 1) {
  console.error(`[ERRORE] ${msg}`);
  process.exit(code);
}

function ensureDirSync(filePathOrDir) {
  const dir = fs.existsSync(filePathOrDir) && fs.lstatSync(filePathOrDir).isDirectory()
    ? filePathOrDir
    : path.dirname(filePathOrDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSONSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    exitWithError(`Impossibile leggere o parsare il JSON: ${err.message}`);
  }
}

function readTextSync(filePath) {
  try {
    let text = fs.readFileSync(filePath, 'utf8');
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM
    return text;
  } catch (err) {
    exitWithError(`Impossibile leggere il file di input: ${err.message}`);
  }
}

/* ------------------------------- STEP 1 ---------------------------------- */
/* (Invariato rispetto alla versione precedente, ometti se già ce l'hai)    */
function filterLines(lines, dirtyPrefixes) {
  if (!Array.isArray(dirtyPrefixes) || dirtyPrefixes.length === 0) return lines.slice();
  return lines.filter(line => {
    for (const prefix of dirtyPrefixes) {
      if (typeof prefix !== 'string') continue;
      if (line.startsWith(prefix)) return false;
    }
    return true;
  });
}

function splitIntoBlocks(cleanedLines, {
  blockHeaders = [],
  headersCaseSensitive = false,
  includeHeaderInBlock = true
} = {}) {
  const blocks = [];
  if (!Array.isArray(blockHeaders) || blockHeaders.length === 0) {
    blocks.push({ name: '', lines: cleanedLines.slice(), startIndex: 0 });
    return blocks;
  }

  const norm = s => (headersCaseSensitive ? s.trim() : s.trim().toLowerCase());
  const headerSet = new Set(blockHeaders.map(h => norm(h)));

  let current = null;
  const pushCurrent = () => { if (current) blocks.push(current); };

  cleanedLines.forEach((line, idx) => {
    const trimmed = line.trim();
    const key = norm(trimmed);

    if (headerSet.has(key)) {
      pushCurrent();
      current = { name: trimmed, lines: [], startIndex: idx };
      if (includeHeaderInBlock) current.lines.push(line);
    } else {
      if (!current) current = { name: '', lines: [], startIndex: 0 };
      current.lines.push(line);
    }
  });

  pushCurrent();
  if (blocks.length === 0) blocks.push({ name: '', lines: [], startIndex: 0 });
  return blocks;
}

function writeBlocksFiles(blocks, outputJSONPath, blocksOutputDir) {
  const baseDir = blocksOutputDir
    ? blocksOutputDir
    : path.join(path.dirname(outputJSONPath), 'blocks');

  ensureDirSync(baseDir);

  const files = [];
  blocks.forEach((b, i) => {
    const idx = i + 1; // progressivo 1-based
    const obj = {
      content: (b.lines || []).join('\n'),
      lines: b.lines || [],
      name: b.name || '',
      startIndex: typeof b.startIndex === 'number' ? b.startIndex : 0,
      index: idx
    };
    const filePath = path.join(baseDir, `${idx}.json`);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
    files.push(filePath);
  });

  return { baseDir, files };
}


function step1(params) {
  const {
    inputTextPath,
    outputJSONPath,
    dirtyLines,
    blockHeaders,
    headersCaseSensitive = false,
    includeHeaderInBlock = true,
    blocksOutputDir
  } = params;

  if (!inputTextPath || !outputJSONPath) {
    exitWithError('Parametri mancanti: servono "inputTextPath" e "outputJSONPath" dentro iec_27001.');
  }

  const rawText = readTextSync(inputTextPath);
  const allLines = rawText.split(/\r?\n/);

  const cleanedLines = filterLines(allLines, Array.isArray(dirtyLines) ? dirtyLines : []);
  const content = cleanedLines.join('\n');

  const blocks = splitIntoBlocks(cleanedLines, {
    blockHeaders,
    headersCaseSensitive,
    includeHeaderInBlock
  });

  const { baseDir: blocksDir, files: blockFiles } = writeBlocksFiles(blocks, outputJSONPath, blocksOutputDir);

  const outObj = { content, lines: cleanedLines, blocks, blockFiles };

  ensureDirSync(outputJSONPath);
  fs.writeFileSync(outputJSONPath, JSON.stringify(outObj, null, 2), 'utf8');

  console.log(`[OK] Step 1 completato. Output: ${outputJSONPath}`);
  console.log(`[OK] Scritti ${blockFiles.length} blocchi in: ${blocksDir}`);
}

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
    case 1:
      params = config.iec_27001;
      step1(params);
      break;
    case 2:
      params = config.iec_27001;
      step2(params);
      break;
    case 21:
      params = config.iec_27002;
      step1(params);
      break;
    case 22:
      params = config.iec_27002;
      step2(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Implementati step 1 e 2.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
