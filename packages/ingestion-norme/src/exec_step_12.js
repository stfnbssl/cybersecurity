const { processFullPDF, exportToCSV } = require('./lib/doc-62443-2-4-parser');
const fs = require('fs');

const text = fs.readFileSync('C:/My/wizzi/stfnbssl/cybersecurity/packages/ingestion-norme/src/input/doc-62443-3-2-sample.txt', 'utf-8');
const structure = parseTextStructure(text);
console.log(JSON.stringify(structure, null, 2));




// Carica il contenuto del PDF (tutto il testo estratto)
const pdfContent = "..."; // Il tuo testo completo del PDF

// Processa tutto
const result = processFullPDF(pdfContent);

// Esporta in CSV per Excel
const csvData = exportToCSV(result);
console.log(csvData);

// Ottieni statistiche
console.log(result.statistics);