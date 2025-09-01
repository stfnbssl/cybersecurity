const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');
const { createChunks } = require('./eu_lex_article_chunk');
function execute(params, metadata) {
    const chunksObj = readJSONSync(params.inputJSONPath);
    
    let newChunks = []
    chunksObj.result.chapters.forEach(chapter => {
        chapter.articles.result.forEach(article => {
            const articleChunks = createChunks(article, metadata);
            newChunks = newChunks.concat(articleChunks);
            console.log(`✅ Creati ${newChunks.length} chunks per articolo ${metadata.framework_code} / ${article.numero}.`);
        });
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
  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config[configProp]) {
    exitWithError('Configurazione non valida: proprietà radice "' + configProp + '" mancante.');
  }

  const metadata = config[configProp].metadata;
  const params = config[configProp][stepArg];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "' + configProp+ '.' + stepArg + '" mancante.');
  }
  console.log("params+metadata", params, metadata);
  execute(params, metadata);
}

if (require.main === module) {
  main();
}
