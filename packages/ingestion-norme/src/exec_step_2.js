#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { parseCapiArticoli } = require('./lib/parser_capi_articoli.js');

/**
 * Esegue il parsing dei capi e articoli usando un file di configurazione JSON
 * @param {string} configFilePath - Path del file JSON di configurazione
 */
async function executeStep2(configFilePath) {
    try {
        console.log(`🔧 Caricamento configurazione da: ${configFilePath}`);
        
        // Verifica che il file di configurazione esista
        try {
            await fs.access(configFilePath);
        } catch (error) {
            throw new Error(`File di configurazione non trovato: ${configFilePath}`);
        }
        
        // Carica il file di configurazione JSON
        const configData = await fs.readFile(configFilePath, 'utf-8');
        let configurazione;
        
        try {
            configurazione = JSON.parse(configData);
        } catch (error) {
            throw new Error(`Errore nel parsing del JSON di configurazione: ${error.message}`);
        }
        
        // Valida la struttura della configurazione
        if (!configurazione.step_2 || !Array.isArray(configurazione.step_2)) {
            throw new Error('Proprietà "step_2" mancante o non è un array nella configurazione');
        }
        
        if (configurazione.step_2.length === 0) {
            throw new Error('L\'array "step_2" è vuoto');
        }
        
        console.log(`📋 Trovate ${configurazione.step_2.length} configurazioni di parsing`);
        
        const risultatiTotali = [];
        
        // Processa ogni configurazione nell'array step_2
        for (let i = 0; i < configurazione.step_2.length; i++) {
            const opzioni = configurazione.step_2[i];
            const indice = i + 1;
            
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 ELABORAZIONE ${indice}/${configurazione.step_2.length}`);
            console.log(`${'='.repeat(60)}`);
            
            // Valida ogni singola configurazione
            if (!opzioni.sourceFile) {
                throw new Error(`Proprietà "sourceFile" mancante nella configurazione ${indice}`);
            }
            
            if (!opzioni.outJsonFile) {
                throw new Error(`Proprietà "outJsonFile" mancante nella configurazione ${indice}`);
            }
            
            console.log(`📂 File sorgente: ${opzioni.sourceFile}`);
            console.log(`💾 File output: ${opzioni.outJsonFile}`);
            
            // Verifica che il file sorgente esista
            try {
                await fs.access(opzioni.sourceFile);
            } catch (error) {
                throw new Error(`File sorgente non trovato: ${opzioni.sourceFile}`);
            }
            
            // Crea la directory di output se non esiste
            const outputDir = path.dirname(opzioni.outJsonFile);
            try {
                await fs.mkdir(outputDir, { recursive: true });
            } catch (error) {
                // Ignora errori se la directory esiste già
            }
            
            console.log(`\n🚀 Avvio parsing per il file ${indice}...`);
            
            // Esegui il parsing
            let risultato = null;
            if (opzioni.format == "EU") {
                risultato = await parseCapiArticoli({
                    sourceFile: opzioni.sourceFile,
                    outJsonFile: opzioni.outJsonFile,
                    tipo: opzioni.structure == "capo+article+letter+point" ? "con_capi" : "solo_articoli"
                });
            } else {
                throw new Error(`format non riconosciuto: ${opzioni.format}, format validi: EU`);
            }
            risultatiTotali.push({
                indice: indice,
                sourceFile: opzioni.sourceFile,
                outJsonFile: opzioni.outJsonFile,
                risultato: risultato
            });
            
            console.log(`✅ Completato file ${indice}/${configurazione.step_2.length}`);
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎉 TUTTE LE ELABORAZIONI COMPLETATE!`);
        console.log(`${'='.repeat(60)}`);
        
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
            
            console.log(`\n   📄 File ${item.indice}:`);
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
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔧 EXEC STEP 2 - Parser Capi e Articoli

Uso: node exec_step_2.js <file-configurazione.json>

Il file di configurazione deve contenere:
{
    "step_2": [
        {
            "sourceFile": "path/to/input1.txt",
            "outJsonFile": "path/to/output1.json"
        },
        {
            "sourceFile": "path/to/input2.txt",
            "outJsonFile": "path/to/output2.json"
        }
    ]
}

Esempio:
node exec_step_2.js config.json
        `);
        process.exit(1);
    }
    
    const configFilePath = args[0];
    
    console.log(`🎯 EXEC STEP 2 - Parser Capi e Articoli`);
    console.log(`${'='.repeat(50)}`);
    
    await executeStep2(configFilePath);
}

// Esporta la funzione per uso programmatico
module.exports = { executeStep2 };

// Se il file viene eseguito direttamente, avvia main()
if (require.main === module) {
    main().catch(console.error);
}