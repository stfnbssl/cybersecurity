const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');
const { parseComplexStructure } = require('./doc-27001-details-parser');

function processJsonObject(obj) {
  obj.details = parseComplexStructure(obj.lines);
  return obj;
}

function step3(params) {
  const step3Cfg = params && params.step3;
  if (!step3Cfg || !step3Cfg.inputJSONPath || !step3Cfg.outputJSONPath) {
    exitWithError('Parametri mancanti per step 2: servono "iec_27001.step3.inputJSONPath" e "iec_27001.step3.outputJSONPath".');
  }
  const {
    inputJSONPath,
    outputJSONPath
  } = step3Cfg;
  // Carica blocco: { content, lines }
  const block = readJSONSync(inputJSONPath);

  block.structure.forEach(control => {
    processJsonObject(control);
  });
  ensureDirSync(outputJSONPath);
  writeJSONSync(outputJSONPath, block);
  console.log(`✅ Creato file ${outputJSONPath} con successo!`);
}

/* -------------------------------- MAIN ----------------------------------- */

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node text-extractor-step-3.js <config.json> <stepNumber>');
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
    case 3:
      params = config.iec_27001;
      step3(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Implementati step 3 e 23.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
