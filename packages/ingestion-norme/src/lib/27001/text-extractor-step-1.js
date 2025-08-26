// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1

const fs = require('fs');
const path = require('path');

const {ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

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

  const cleanedLines = filterLines(allLines, Array.isArray(dirtyLines) ? dirtyLines : []);
  const content = cleanedLines.join('\n');

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
