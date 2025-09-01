// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1
const fs = require('fs');
const path = require('path');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../utils');
const { analizeCR } = require('./cr_analizer');
// const { parseCRSubSections } = require('./single_cr_parser');

const isDebug = true;

function parseStep0(lines) {
  const retval = {
    linesOutOfCRs: [],
    crs: []
  };
  let page = 1;
  let currentCR = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let skip = false;
    skip = skip || line.trim() == "TeleTrusT-Prüfschema nach IEC 62443-4-2 - 2019-05";
    const pageMatch = line.match(/^\s*(\d+)\s*$/);
    if (pageMatch) {
      if (isDebug) console.log("pageMatch", pageMatch);
      page = parseInt(pageMatch[0]);
      skip = true;
    }
    if (!skip) {
      const CR = line.match(/^\s*CR\s+(\d+)\.(\d+)\s*$/);
      if (isDebug) console.log("CR", CR);
      let crNumber = -1;
      let crTitle = null;
      if (CR) {
        crNumber = CR[1];
        crSection = CR[2];
      }
      if (crNumber > -1) {
        if (currentCR) {
          analizeCR(currentCR);
          retval.crs.push(currentCR);
        }
        currentCR = {
          number: crNumber,
          crSection: crSection,
          page: page,
          lines: []
        }
      } else {
        if (currentCR) {
          currentCR.lines.push({
              page: page,
              indent: line.length - line.trimStart().length,
              text: line.trim()        
          })
        } else {
          retval.linesOutOfCRs.push({
              page: page,
              text: line
          })
        }
      }
    }
  };
  if (currentCR) {
    analizeCR(currentCR);
    retval.crs.push(currentCR)
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
    if (isDebug) console.log("parsedLines.linesOutOfCRs", parsedLines.linesOutOfCRs.length);
    if (isDebug) console.log("parsedLines.crs", parsedLines.crs.length);
    if (isDebug) console.log("parsedLines.crs", parsedLines.crs);
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
  if (!config || typeof config !== 'object' || !config.iec_62443_4_2_bis) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_2_bis" mancante.');
  }
  const params = config.iec_62443_4_2_bis["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_2_bis.step"' + stepNumber + ' mancante.');
  }
  console.log("params", params);
  extractRequirements(params);
}
if (require.main === module) {
  main();
}
