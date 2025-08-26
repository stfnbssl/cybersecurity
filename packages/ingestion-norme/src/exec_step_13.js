#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Convertitore da testo strutturato a JSON
 * Converte un file di testo con marcatori || e | in un array JSON di oggetti
 */

// Funzione per parsare una singola voce del testo strutturato
function parseEntry(entry) {
    // Metodo corretto: divido per righe e uso | come separatore
    const lines = entry.split('\n');
    const fields = [];
    let currentField = '';
    
    for (let line of lines) {
        line = line.trim();
        if (line === '|') {
            // Quando trovo il separatore |, salvo il campo corrente
            if (currentField.trim() !== '') {
                fields.push(currentField.trim());
                currentField = '';
            }
        } else if (line !== '') {
            // Accumulo le righe del campo corrente
            if (currentField !== '') {
                currentField += '\n' + line;
            } else {
                currentField = line;
            }
        }
    }
    
    // Aggiungo l'ultimo campo se non vuoto
    if (currentField.trim() !== '') {
        fields.push(currentField.trim());
    }
    
    // Le 8 proprietà nell'ordine specificato
    const properties = [
        'Req_ID',
        'BR_RE', 
        'Functional_area',
        'Topic',
        'Subtopic',
        'Doc',
        'Requirement',
        'Rationale'
    ];
    
    const obj = {};
    
    // Assegno ogni campo alla proprietà corrispondente
    for (let i = 0; i < Math.min(fields.length, properties.length); i++) {
        obj[properties[i]] = fields[i];
    }
    
    // Se mancano alcuni campi, li lascio vuoti
    for (let i = fields.length; i < properties.length; i++) {
        obj[properties[i]] = '';
    }
    
    return obj;
}

// Funzione principale di conversione
function convertTextToJSON(inputText) {
    // Divido il contenuto per le voci separate da ||
    const entries = inputText.split('||').filter(entry => entry.trim() !== '');
    
    // Processo tutte le voci
    const jsonArray = [];
    entries.forEach((entry) => {
        if (entry.trim() !== '') {
            const parsedEntry = parseEntry(entry);
            jsonArray.push(parsedEntry);
        }
    });
    
    return jsonArray;
}

// Funzione per processare i file
function processFiles(configPath) {
    try {
        // Leggo il file di configurazione
        console.log(`📖 Lettura configurazione da: ${configPath}`);
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Verifico che esista la configurazione per iec_62443_2_4
        if (!config.iec_62443_2_4) {
            throw new Error('Configurazione "iec_62443_2_4" non trovata nel file di configurazione');
        }
        
        const { inputTextPath, outputJSONPath } = config.iec_62443_2_4;
        
        if (!inputTextPath || !outputJSONPath) {
            throw new Error('Proprietà "inputTextPath" e "outputJSONPath" sono obbligatorie');
        }
        
        // Risolvo i path relativi rispetto al file di configurazione
        const configDir = path.dirname(configPath);
        const resolvedInputPath = path.resolve(configDir, inputTextPath);
        const resolvedOutputPath = path.resolve(configDir, outputJSONPath);
        
        console.log(`📁 File input: ${resolvedInputPath}`);
        console.log(`📁 File output: ${resolvedOutputPath}`);
        
        // Verifico che il file input esista
        if (!fs.existsSync(resolvedInputPath)) {
            throw new Error(`File input non trovato: ${resolvedInputPath}`);
        }
        
        // Leggo il file di testo strutturato
        console.log(`📖 Lettura file di testo strutturato...`);
        const inputContent = fs.readFileSync(resolvedInputPath, 'utf8');
        
        // Converto il testo in JSON
        console.log(`⚙️  Conversione in corso...`);
        const jsonArray = convertTextToJSON(inputContent);
        
        // Creo la directory di output se non esiste
        const outputDir = path.dirname(resolvedOutputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Creata directory: ${outputDir}`);
        }
        
        // Scrivo il file JSON di output
        const jsonOutput = JSON.stringify(jsonArray, null, 2);
        fs.writeFileSync(resolvedOutputPath, jsonOutput, 'utf8');
        
        // Statistiche finali
        console.log(`✅ Conversione completata con successo!`);
        console.log(`📊 Statistiche:`);
        console.log(`   - Oggetti creati: ${jsonArray.length}`);
        console.log(`   - Dimensione JSON: ${jsonOutput.length} caratteri`);
        console.log(`   - File salvato in: ${resolvedOutputPath}`);
        
        // Mostro un'anteprima dei primi 3 oggetti
        if (jsonArray.length > 0) {
            console.log(`\n🔍 Anteprima primi oggetti:`);
            jsonArray.slice(0, 3).forEach((obj, index) => {
                console.log(`   ${index + 1}. ${obj.Req_ID} - ${obj.BR_RE} - ${obj.Topic}`);
            });
        }
        
    } catch (error) {
        console.error(`❌ Errore: ${error.message}`);
        process.exit(1);
    }
}

// Gestione argomenti da linea di comando
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔧 Convertitore da Testo Strutturato a JSON
==========================================

Uso: node converter.js <path-config.json>

Il file di configurazione deve contenere:
{
  "iec_62443_2_4": {
    "inputTextPath": "path/to/input.txt",
    "outputJSONPath": "path/to/output.json"
  }
}

Esempio:
node converter.js config.json
        `);
        process.exit(0);
    }
    
    const configPath = args[0];
    
    // Verifico che il file di configurazione esista
    if (!fs.existsSync(configPath)) {
        console.error(`❌ File di configurazione non trovato: ${configPath}`);
        process.exit(1);
    }
    
    processFiles(configPath);
}

// Eseguo lo script se chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = {
    convertTextToJSON,
    parseEntry,
    processFiles
};