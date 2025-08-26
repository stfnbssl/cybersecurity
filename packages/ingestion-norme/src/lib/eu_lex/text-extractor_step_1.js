#!/usr/bin/env node

const fs = require('fs')
const path = require('path');
const { parseCapiArticoli } = require('./parser_capi_articoli.js');

function exitWithError(msg, code = 1) {
  console.error(`[ERRORE] ${msg}`);
  process.exit(code);
}

function ensureDirSync(filePathOrDir) {
  const dir = fs.existsSync(filePathOrDir) && fs.lstatSync(filePathOrDir).isDirectory()
    ? filePathOrDir
    : path.dirname(filePathOrDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSONSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    exitWithError(`Impossibile leggere o parsare il JSON di configurazione: ${err.message}`);
  }
}

/**
 * Esegue il parsing dei capi e articoli usando un file di configurazione JSON
 * @param {string} configFilePath - Path del file JSON di configurazione
 */
async function executeExtraction(config) {
    try {
       
        // Valida ogni singola configurazione
        if (!config.sourceFile) {
            throw new Error(`Proprietà "sourceFile" mancante nella configurazione`);
        }
        
        if (!config.outJsonFile) {
            throw new Error(`Proprietà "outJsonFile" mancante nella configurazione`);
        }
        
        console.log(`📂 File sorgente: ${config.sourceFile}`);
        console.log(`💾 File output: ${config.outJsonFile}`);

        const risultatiTotali = [];
        
        // Crea la directory di output se non esiste
        const outputDir = path.dirname(config.outJsonFile);
        try {
            await fs.mkdir(outputDir, { recursive: true });
        } catch (error) {
            // Ignora errori se la directory esiste già
        }
        
        console.log(`\n🚀 Avvio parsing ...`);
        
        // Esegui il parsing
        let risultato = null;
        if (config.format == "EU") {
            risultato = await parseCapiArticoli({
                sourceFile: config.sourceFile,
                outJsonFile: config.outJsonFile,
                tipo: config.structure == "capo+article+letter+point" ? "con_capi" : "solo_articoli"
            });
        } else {
            throw new Error(`format non riconosciuto: ${config.format}, format validi: EU`);
        }
        risultatiTotali.push({
            sourceFile: config.sourceFile,
            outJsonFile: config.outJsonFile,
            risultato: risultato
        });
        
        // Mostra un riepilogo dettagliato di tutti i file processati
        console.log(`\n📋 RIEPILOGO GENERALE:`);
        console.log(`   • File processati: ${risultatiTotali.length}`);
        
        let totaleCapiGlobale = 0;
        let totaleArticoliGlobale = 0;
        
        risultatiTotali.forEach((item) => {
            const risultato = item.risultato;
            console.log('risultato', Object.keys(risultato));
            const totaleArticoli = risultato.capi ? 
                risultato.capi.reduce((acc, capo) => acc + capo.articoli.length, 0) :
                risultato.articoli.length;
            
            console.log(`\n`);
            console.log(`      • Input: ${path.basename(item.sourceFile)}`);
            console.log(`      • Output: ${path.basename(item.outJsonFile)}`);
            if (risultato.capi) {
                console.log(`      • Capi: ${risultato.capi.length}`);
            }
            console.log(`      • Articoli: ${totaleArticoli}`);
            totaleCapiGlobale += risultato.capi ? risultato.capi.length : 0;
            totaleArticoliGlobale += totaleArticoli;
        });
        
        console.log(`\n   🎯 TOTALI:`);
        console.log(`      • Capi totali: ${totaleCapiGlobale}`);
        console.log(`      • Articoli totali: ${totaleArticoliGlobale}`);
        
        return risultatiTotali;
        
    } catch (errore) {
        console.error(`\n❌ ERRORE: ${errore.message}`);
        process.exit(1);
    }
}

/**
 * Funzione principale - gestisce gli argomenti da command line
 */
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
