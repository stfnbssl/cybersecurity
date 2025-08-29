const fs = require('fs');
const path = require('path');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');
const {parseChapterAnnexStructure} = require('./chapter_annex_parser');
const {parseArticlesFromText, parseArticles} = require('./articles_parser');
const {parseArticleSections} = require('./single_article_parser');
const {parseAnnexParts} = require('./annex_parts_parser');
const {parseAnnexContent} = require('./annex_parser');

const parsers = {
    
    parseArticles: parseArticles,
    parseArticleSections: parseArticleSections,
    parseAnnexParts: parseAnnexParts,
    parseAnnexContent: parseAnnexContent,
}

async function executeExtraction(config) {
    if (!config.sourceFile) {
        throw new Error(`Proprietà "sourceFile" mancante nella configurazione`);
    }
    if (!config.outJsonFile) {
        throw new Error(`Proprietà "outJsonFile" mancante nella configurazione`);
    }
    console.log(`📂 File sorgente: ${config.sourceFile}`);
    console.log(`💾 File output: ${config.outJsonFile}`);
    const risultatiTotali = [];
    const inputText = readTextSync(config.sourceFile);
    let parsed = parseChapterAnnexStructure(inputText, parsers);
    /* VIA
    if (config.structure == "capo+article+letter+point") {
        parsed = parseChapterAnnexStructure(inputText, parsers);
    } else {
        parsed = parseArticlesFromText(inputText, parsers);
    }
    */
    console.log(`✅ Parsing completato!`);
    ensureDirSync(config.outJsonFile);
    writeJSONSync(config.outJsonFile, parsed);
    console.log(`📁 File salvato: ${config.outJsonFile}`);
}

async function main() {
    const [, , configPath, configProp, stepArg] = process.argv;
    if (!configPath || !configProp || !stepArg) {
        console.log('Uso: node pdf-partitioner.js <config.json> <configProp> <stepNumber>');
        process.exit(2);
    }
    const stepProp = stepArg;

    const config = readJSONSync(configPath);
    if (!config || typeof config !== 'object' || !config[configProp]) {
        exitWithError('Configurazione non valida: proprietà radice "' + configProp + '" mancante.');
    }
    if (!config[configProp][stepProp]) {
        exitWithError('Configurazione non valida: step "' + stepProp + '" mancante.');
    }
    console.log("config." + configProp + '.' + stepProp, config[configProp][stepProp])
    await executeExtraction(config[configProp][stepProp]);
}

// Gestione segnali per chiusura pulita
process.on('SIGINT', () => {
    console.log('\n🛑 Interruzione richiesta dall\'utente');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Errore non gestito:', reason);
    process.exit(1);
});

// Avvia l'esecuzione se questo file viene eseguito direttamente
// Eseguo lo script se chiamato direttamente
if (require.main === module) {
    main();
}

// Esporta la funzione per uso programmatico
module.exports = { executeExtraction };
