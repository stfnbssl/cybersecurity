const fs = require('fs');
const path = require('path');
const { extract27001StructureWithLines } = require('./doc-27001-structure-parser');

const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

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
