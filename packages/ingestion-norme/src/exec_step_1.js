#!/usr/bin/env node

/**
 * exec_extraction.js
 * Script CLI per eseguire l'estrazione di testo da documenti
 * 
 * Utilizzo:
 * node exec_extraction.js <path_to_config.json>
 * 
 * Il file JSON può contenere:
 * - "single": oggetto con configurazione per un singolo documento
 * - "batch": array con configurazioni per più documenti
 */

const fs = require('fs').promises;
const path = require('path');
const { DocumentTextExtractor } = require('./lib/document-text-extractor'); // Assumi che la libreria sia in questo file

class ExtractionExecutor {
    constructor() {
        this.extractor = new DocumentTextExtractor();
        this.startTime = null;
    }

    /**
     * Punto di ingresso principale
     */
    async run() {
        try {
            // Verifica argomenti della riga di comando
            const configPath = this.parseArguments();
            
            // Carica e valida la configurazione
            const config = await this.loadConfig(configPath);
            
            // Avvia l'estrazione
            this.startTime = Date.now();
            console.log('='.repeat(60));
            console.log('🚀 AVVIO ESTRAZIONE DOCUMENTI');
            console.log('='.repeat(60));
            
            const results = await this.executeExtraction(config);
            
            // Mostra i risultati
            this.displayResults(results);
            
        } catch (error) {
            throw error;
            console.error('❌ ERRORE:', error.message);
            process.exit(1);
        }
    }

    /**
     * Analizza gli argomenti della riga di comando
     */
    parseArguments() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log(`
📋 UTILIZZO:
node exec_extraction.js <path_to_config.json>

📁 FORMATO FILE CONFIG:
{
  "single": {
    "source": "path/to/document.pdf",
    "output": "path/to/output.txt",
    "type": "pdf",
    "options": {}
  }
}

OPPURE

{
  "batch": [
    {
      "source": "path/to/doc1.pdf",
      "output": "path/to/out1.txt"
    },
    {
      "source": "https://example.com/doc2.html",
      "output": "path/to/out2.txt",
      "options": { "selector": "main" }
    }
  ]
}
            `);
            throw new Error('Percorso del file di configurazione mancante');
        }

        const configPath = args[0];
        
        if (!path.isAbsolute(configPath)) {
            return path.resolve(process.cwd(), configPath);
        }
        
        return configPath;
    }

    /**
     * Carica e valida il file di configurazione
     */
    async loadConfig(configPath) {
        try {
            console.log(`📖 Caricamento configurazione: ${configPath}`);
            
            // Verifica che il file esista
            await fs.access(configPath);
            
            // Leggi e analizza il JSON
            const configContent = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configContent);
            
            // Valida la struttura
            this.validateConfigStructure(config);
            
            console.log('✅ Configurazione caricata correttamente');
            return config;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File di configurazione non trovato: ${configPath}`);
            } else if (error instanceof SyntaxError) {
                throw new Error(`Errore nel parsing JSON: ${error.message}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Valida la struttura del file di configurazione
     */
    validateConfigStructure(config) {
        if (!config.single && !config.batch) {
            throw new Error('Il file di configurazione deve contenere "single" o "batch"');
        }
        
        if (config.single && config.batch) {
            throw new Error('Il file di configurazione non può contenere sia "single" che "batch"');
        }
        
        if (config.batch && !Array.isArray(config.batch)) {
            throw new Error('La proprietà "batch" deve essere un array');
        }
        
        if (config.single && typeof config.single !== 'object') {
            throw new Error('La proprietà "single" deve essere un oggetto');
        }
    }

    /**
     * Esegue l'estrazione in base alla configurazione
     */
    async executeExtraction(config) {
        if (config.single) {
            console.log('📄 Modalità: Documento singolo');
            return await this.executeSingle(config.single);
        } else {
            console.log(`📚 Modalità: Batch (${config.batch.length} documenti)`);
            return await this.executeBatch(config.batch);
        }
    }

    /**
     * Esegue l'estrazione per un singolo documento
     */
    async executeSingle(singleConfig) {
        console.log('\n' + '-'.repeat(40));
        console.log(`🔍 Elaborazione: ${singleConfig.source}`);
        console.log('-'.repeat(40));
        
        const result = await this.extractor.extractText(singleConfig);
        return [result]; // Ritorna un array per uniformità con batch
    }

    /**
     * Esegue l'estrazione per più documenti
     */
    async executeBatch(batchConfig) {
        const results = [];
        let completed = 0;
        
        for (let i = 0; i < batchConfig.length; i++) {
            const config = batchConfig[i];
            console.log(`\n${'-'.repeat(40)}`);
            console.log(`🔍 Elaborazione ${i + 1}/${batchConfig.length}: ${config.source}`);
            console.log('-'.repeat(40));
            
            const result = await this.extractor.extractText(config);
            results.push(result);
            completed++;
            
            // Mostra progresso
            const percentage = Math.round((completed / batchConfig.length) * 100);
            console.log(`📊 Progresso: ${percentage}% (${completed}/${batchConfig.length})`);
        }
        
        return results;
    }

    /**
     * Mostra i risultati dell'estrazione
     */
    displayResults(results) {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RISULTATI ESTRAZIONE');
        console.log('='.repeat(60));
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Successi: ${successful}`);
        console.log(`❌ Fallimenti: ${failed}`);
        console.log(`⏱️  Tempo totale: ${duration} secondi`);
        
        if (successful > 0) {
            console.log('\n📈 DOCUMENTI ELABORATI CON SUCCESSO:');
            results.filter(r => r.success).forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.source}`);
                console.log(`     → ${result.output} (${result.textLength} caratteri)`);
                console.log(`     📅 ${result.extractedAt}`);
            });
        }
        
        if (failed > 0) {
            console.log('\n⚠️  ERRORI:');
            results.filter(r => !r.success).forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.source}`);
                console.log(`     💥 ${result.error}`);
            });
        }
        
        // Salva un report dettagliato
        this.saveReport(results, duration);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ESTRAZIONE COMPLETATA');
        console.log('='.repeat(60));
    }

    /**
     * Salva un report dettagliato in JSON
     */
    async saveReport(results, duration) {
        const reportPath = `./reports/extraction_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const report = {
            summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                duration: `${duration}s`,
                timestamp: new Date().toISOString()
            },
            results: results
        };
        
        try {
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
            console.log(`📄 Report salvato: ${reportPath}`);
        } catch (error) {
            console.warn(`⚠️  Impossibile salvare il report: ${error.message}`);
        }
    }
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
if (require.main === module) {
    const executor = new ExtractionExecutor();
    executor.run().catch(error => {
        throw error;
        console.error('❌ ERRORE FATALE:', error.message);
        process.exit(1);
    });
}

module.exports = ExtractionExecutor;