// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1

const fs = require('fs');
const path = require('path');

const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../utils');


function testPageLastLine(lines, pos) {
    const chapterPattern = /^\s*CHAPTER(\s+.*)?$/i;
    const referencesPattern = /^\s*REFERENCES(\s+.*)?$/i;
    const appendixPattern = /^\s*APPENDIX(\s+.*)?$/i;
    const pagePattern = /^\s*PAGE\s+\d+(\s+.*)?$/i;
    if (lines[pos+2] && lines[pos+3]) {
        // console.log('"' + lines[pos].trim() + '"','"' + lines[pos+1].trim() + '"','"' + lines[pos+1].trim() + '"',
          // chapterPattern.test(lines[pos].trim()), pagePattern.test(lines[pos+1].trim()), pagePattern.test(lines[pos+2].trim()))
    }
    if (chapterPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+1].trim())) {
        return 2;
    }
    if (chapterPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+2].trim())) {
        return 3;
    }
    if (referencesPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+1].trim())) {
        return 2;
    }
    if (referencesPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+2].trim())) {
        return 3;
    }
    if (appendixPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+1].trim())) {
        return 2;
    }
    if (appendixPattern.test(lines[pos].trim()) && pagePattern.test(lines[pos+2].trim())) {
        return 3;
    }
    return 0;
}

function filterLines(lines) {
  const retval = [];
  for (var i=0; i<lines.length; i++) {
    const skip = testPageLastLine(lines, i);
    if (skip > 0) {
        i+=skip;
    } else {
        if (lines[i].indexOf("This publication is available free of charge") > -1) {}
        else if (lines[i].indexOf("NIST SP 800-53, REV. 5")> -1) {}
        else if (lines[i].indexOf("REV. 5 SECURITY AND PRIVACY CONTROLS")> -1) {}
        else if (lines[i].indexOf("________________")> -1) {}
        else retval.push(lines[i]);
    }
  }
  return retval;
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
    ensureDirSync(filePath);
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
    exitWithError('Parametri mancanti: servono "inputTextPath" e "outputJSONPath" dentro nist_800_53.');
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
  if (!config || typeof config !== 'object' || !config.nist_800_53) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53" mancante.');
  }

  let params;
  
  switch (stepNumber) {
    case 1:
      params = config.nist_800_53.step1;
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
