// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1

const fs = require('fs');
const path = require('path');

const {ensureDirSync, readTextSync, readJSONSync, writeJSONSync, 
  isRegExp, parseRegExp} = require('../utils');

function cleanPdfText(text) {
  return text
    // Rimuovi caratteri invisibili problematici
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '')
    // Sostituisci non-breaking spaces con spazi normali
    .replace(/\u00A0/g, ' ')
    // Normalizza altri tipi di whitespace a spazi normali
    .replace(/[\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collassa spazi multipli in uno solo
    // .replace(/\s+/g, ' ')
    // Rimuovi spazi all'inizio e alla fine
    /*.trim()*/;
}

function cleanPdfLines(lines) {
  const retval = [];
  lines.forEach(line => {  
    retval.push(cleanPdfText(line));
  });
  // console.log("cleanPdfLines", retval);
  return retval;
}

function filterLines(lines, dirtyPrefixes) {
  if (!Array.isArray(dirtyPrefixes) || dirtyPrefixes.length === 0) return lines.slice();
  return lines.filter(line => {
    for (const prefix of dirtyPrefixes) {
      if (typeof prefix !== 'string') continue;
      if (isRegExp(prefix)) {
        const re = parseRegExp(prefix);
        if (re.test(line)) { return false}
      } else {
        // console.log(line, prefix, line.indexOf(prefix));
        if (line.indexOf(prefix) > - 1) return false;
      }
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

  const norm = s => (headersCaseSensitive 
    ? s.replace(/[\s\u00A0]+/g, ' ').trim() 
    : s.replace(/[\s\u00A0]+/g, ' ').trim().toLowerCase());
  
  let current = null;
  const pushCurrent = () => { if (current) blocks.push(current); };
  cleanedLines.forEach((line, idx) => {
    let isBlockHeader = false;
    let trimmed = null;
    blockHeaders.forEach((bh, idx) => {
      // console.log("isRegExp", bh, isRegExp(bh));
      if (isRegExp(bh)) {
        const re = parseRegExp(bh);
        const normLine = norm(line);
        // console.log('"' + normLine + '"', bh, re.test(normLine));
        // console.log("Char codes:", [...normLine].map(c => c.charCodeAt(0)));
        if (re.test(normLine)) { isBlockHeader = true; }
      } else {
        trimmed = norm(line);
        // console.log('"' + trimmed + '"', norm(bh));
        if (trimmed == norm(bh))  { isBlockHeader = true; }
      }
    });
    if (isBlockHeader) {
      pushCurrent();
      current = { name: trimmed, lines: [], startIndex: idx };
      if (includeHeaderInBlock) current.lines.push(line);
    } else {
      if (!current) current = { name: '', lines: [], startIndex: 0 };
      // console.log('before "' + line + '"');
      current.lines.push(cleanPdfText(line));
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

  console.log("baseDir", baseDir)
  ensureDirSync(path.join(baseDir,"dummy.txt"));

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
    blocksOutputDir // opzionale: dir dove salvare i file 1.json, 2.json, ...
  } = params;

  if (!inputTextPath || !outputJSONPath) {
    exitWithError('Parametri mancanti: servono "inputTextPath" e "outputJSONPath" dentro iec_27001.');
  }

  const rawText = readTextSync(inputTextPath);
  const allLines = rawText.split(/\r?\n/);

  // console.log("allLines", allLines);
  const cleanedLines = filterLines(cleanPdfLines(allLines), Array.isArray(dirtyLines) ? dirtyLines : []);
  const content = cleanedLines.join('\n');
  // console.log("cleanedLines", cleanedLines);

  const blocks = splitIntoBlocks(cleanedLines, {
    blockHeaders,
    headersCaseSensitive,
    includeHeaderInBlock
  });

  // Scrittura per-blocco
  const { baseDir: blocksDir, files: blockFiles } = writeBlocksFiles(blocks, outputJSONPath, blocksOutputDir);

  // Output globale
  const outObj = {
    content,
    lines: cleanedLines,
    blocks,
    blockFiles // percorsi dei file creati per i blocchi
  };

  ensureDirSync(outputJSONPath);
  try {
    fs.writeFileSync(outputJSONPath, JSON.stringify(outObj, null, 2), 'utf8');
  } catch (err) {
    exitWithError(`Impossibile scrivere il file di output: ${err.message}`);
  }

  console.log(`[OK] Step 1 completato. Output salvato in: ${outputJSONPath}`);
  console.log(`[OK] Scritti ${blockFiles.length} blocchi in: ${blocksDir}`);
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
    case 1:
      params = config.iec_27001.step1;
      step1(params);
      break;
    case 21:
      params = config.iec_27002.step1;
      step1(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Questo script implementa solo lo step 1.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
