const {exitWithError, ensureDirSync, readTextSync, readJSONSync, downloadFromUrlJSONSync,
    writeJSONSync, writeFileSync,
    isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../utils');

async function extractControls(params) {
    const data = await downloadFromUrlJSONSync(params.inputJSONUrl)
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, data);
    console.log(`✅ Creato file ${params.outputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node download-step-1 <config.json> <stepNumber>');
    process.exit(2);
  }
  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.nist_800_53) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53" mancante.');
  }
  const params = config.nist_800_53["step"+stepArg];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53.step"' + stepArg + ' mancante.');
  }
  console.log("params", params);
  extractControls(params);
}

if (require.main === module) {
  main();
}