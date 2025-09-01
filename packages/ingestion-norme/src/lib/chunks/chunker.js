const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

function finish(params, metadata) {
    const chunksObj = readJSONSync(params.inputJSONPath);
    
    const newChunks = []
    chunksObj.chunks.forEach(chunk => {
        const newChunk = Object.assign({}, metadata, chunk);
        newChunks.push(newChunk);
    });
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, {
      chunks: newChunks
    })
    console.log(`✅ ${newChunks.length} chunks in ${params.inputJSONPath} con successo!`);
    console.log(`✅ Creato file ${params.outputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, configProp, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node chunks/chunker.js <config.json> <configProp> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config[configProp]) {
    exitWithError('Configurazione non valida: proprietà radice "' + configProp + '" mancante.');
  }

  const metadata = config[configProp].metadata;
  const params = config[configProp]["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "' + configProp+ '.step"' + stepNumber + ' mancante.');
  }
  console.log("params+metadata", params, metadata);
  finish(params, metadata);
}

if (require.main === module) {
  main();
}
