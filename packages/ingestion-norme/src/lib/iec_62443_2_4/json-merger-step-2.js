// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1

const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

function merge(params) {
    let mergedRequirements = [];
    params.sources.forEach(element => {
        const requirements = readJSONSync(element.outputJSONPath);
        mergedRequirements = mergedRequirements.concat(requirements);
        console.log(`✅ Merged ${requirements.length} requirements`);
    });
    ensureDirSync(params.mergedOutputJSONPath);
    writeJSONSync(params.mergedOutputJSONPath, {
      requirements: mergedRequirements
    })
    console.log(`✅ Creato file ${params.mergedOutputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node json-merge.step-2 <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.iec_62443_2_4) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_2_4" mancante.');
  }

  const params = config.iec_62443_2_4["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "iec_62443_2_4.step"' + stepNumber + ' mancante.');
  }
  console.log("params", params);
  merge(params);
}

if (require.main === module) {
  main();
}
