const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

function extractRequirements(params) {
    const block = readJSONSync(params.inputJSONPath);
    const structure = {}
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, structure);
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
  if (!config || typeof config !== 'object' || !config.iec_62443_4_1) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_1" mancante.');
  }
  const params = config.iec_62443_4_1["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_4_1.step"' + stepNumber + ' mancante.');
  }
  console.log("params", params);
  extractRequirements(params);
}
if (require.main === module) {
  main();
}
