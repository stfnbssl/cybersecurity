// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1
const fs = require('fs');
const path = require('path');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../utils');
const { analizeCONTROL } = require('./cr_analizer');
// const { parseCONTROLSubSections } = require('./single_cr_parser');

const isDebug = true;

function parseStep0(lines) {
  const retval = {
    linesOutOfCONTROLs: [],
    crs: []
  };
  let page = 1;
  let currentCONTROL = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let skip = false;
    skip = skip || line.indexOf("This publication is available free of charge") > - 1;
    skip = skip || line.indexOf("NIST SP 800-53, REV. 5") > - 1;
    skip = skip || line.indexOf("REV. 5 SECURITY AND PRIVACY CONTROLS") > - 1;
    skip = skip || line.indexOf("________________") > - 1;
    const pageMatch = line.match(/^\s*PAGE\s+(\d+)\s*$/);
    if (pageMatch) {
      if (isDebug) console.log("pageMatch", pageMatch);
      page = parseInt(pageMatch[0]);
      skip = true;
    }
    if (!skip) {


                "CHAPTER THREE",
                "REFERENCES",



      const CONTROL = line.match(/^\s*CONTROL\s+(\d+)\.(\d+)\s*$/);
      if (isDebug) console.log("CONTROL", CONTROL);
      let crNumber = -1;
      let crTitle = null;
      if (CONTROL) {
        crNumber = CONTROL[1];
        crSection = CONTROL[2];
      }
      if (crNumber > -1) {
        if (currentCONTROL) {
          analizeCONTROL(currentCONTROL);
          retval.crs.push(currentCONTROL);
        }
        currentCONTROL = {
          number: crNumber,
          crSection: crSection,
          page: page,
          lines: []
        }
      } else {
        if (currentCONTROL) {
          currentCONTROL.lines.push({
              page: page,
              indent: line.length - line.trimStart().length,
              text: line.trim()        
          })
        } else {
          retval.linesOutOfCONTROLs.push({
              page: page,
              text: line
          })
        }
      }
    }
  };
  if (currentCONTROL) {
    analizeCONTROL(currentCONTROL);
    retval.crs.push(currentCONTROL)
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
    if (isDebug) console.log("parsedLines.linesOutOfCONTROLs", parsedLines.linesOutOfCONTROLs.length);
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
  if (!config || typeof config !== 'object' || !config.nist_800_53) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53" mancante.');
  }
  const params = config.nist_800_53["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53.step"' + stepNumber + ' mancante.');
  }
  console.log("params", params);
  extractRequirements(params);
}
if (require.main === module) {
  main();
}
