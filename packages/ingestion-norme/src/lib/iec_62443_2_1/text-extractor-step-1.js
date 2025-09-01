// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1
const fs = require('fs');
const path = require('path');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../utils');
const { analizeCategory } = require('./category_analizer');
const { parseCategorySections } = require('./single_category_parser');

const isDebug = false;

function parseStep0(lines) {
  const retval = {
    linesOutOfCATEGORYs: [],
    categories: []
  };
  let page = 1;
  let currentCATEGORY = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine1 = lines[i+1];  
    let skip = false;
    skip = skip || line.trim() == "62443-2-1 Ó IEC:2010(E)";
    skip = skip || line.trim() == "Description";
    skip = skip || line.trim() == "Requirement";
    const pageMatch = line.match(/–\s*(\d+)\s*–/);
    if (pageMatch) {
      
      page = parseInt(pageMatch[1]);
      if (isDebug) console.log("pageMatch", pageMatch, page);
      skip = true;
    }
    if (!skip) {
      const CATEGORY = line.match(/^\s*(\d+)\.(\d+)\s*$/);
      if (isDebug) console.log("CATEGORY", CATEGORY);
      let categoryNumber = -1;
      let categoryTitle = null;
      if (CATEGORY && CATEGORY[1] == '4' && !CATEGORY[3]) {
        categoryNumber = CATEGORY[2];
        categoryTitle = nextLine1 && nextLine1.trim();
        if (isDebug) console.log("categoryTitle", categoryTitle);
        i++
      }
      if (categoryNumber > -1) {
        if (currentCATEGORY) {
          analizeCategory(currentCATEGORY);
          retval.categories.push(parseCategorySections(currentCATEGORY.lines))
        }
        currentCATEGORY = {
          number: categoryNumber,
          categoryTitle: categoryTitle,
          page: page,
          lines: []
        }
      } else {
        if (currentCATEGORY) {
          currentCATEGORY.lines.push({
              page: page,
              indent: line.length - line.trimStart().length,
              text: line.trim()        
          })
        } else {
          retval.linesOutOfCATEGORYs.push({
              page: page,
              text: line
          })
        }
      }
    }
  };
  if (currentCATEGORY) {
    // analizeCATEGORY(currentCATEGORY);
    analizeCategory(currentCATEGORY);
    retval.categories.push(parseCategorySections(currentCATEGORY.lines))
  }
  return retval;
}

function extractRequirements(params) {
    const {
      inputTextPath,
      outputJSONPath,
    } = params;
    if (!inputTextPath || !outputJSONPath) {
      exitWithError('Parametri mancanti: servono "inputTextPath" e "outputJSONPath" dentro ' + __filename);
    }
    const rawText = readTextSync(inputTextPath);
    const allLines = rawText.split(/\r?\n/);
    if (isDebug) console.log("allLines", allLines.length);
    const parsedLines = parseStep0(allLines);
    if (isDebug) console.log("parsedLines.linesOutOfCATEGORYs", parsedLines.linesOutOfCATEGORYs.length);
    if (isDebug) console.log("parsedLines.categories", parsedLines.categories.length);
    parseCategorySections(parsedLines)
    // if (isDebug) console.log("parsedLines.categories", parsedLines.categories);
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, parsedLines);
    console.log(`✅ Creato file ${params.outputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node text-extractor-step-2 <config.json> <stepNumber>');
    process.exit(2);
  }
  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.iec_62443_4_2) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_2" mancante.');
  }
  const params = config.iec_62443_2_1["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_2.step"' + stepNumber + ' mancante.');
  }
  console.log("params", params);
  extractRequirements(params);
}
if (require.main === module) {
  main();
}
