// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('./utils');

async function partitionPDFEveryPage(pdfConfig, item, originalPdf) {
    for ( i=item.startPage; i <= item.endPage; i++) {
        // Crea nuovo PDF
        const newPdf = await PDFDocument.create();
        // Copia le pagine specificate (converti da 1-based a 0-based)
        const pageIndices = [i-1];
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        const newPdfBytes = await newPdf.save();
        ensureDirSync(item.output);
        writeFileSync(item.output + '_' + (i-item.pageShift) + '.pdf', newPdfBytes);
        console.log(`   ✅ Creato: ${item.output + '_' + (i-item.pageShift) + '.pdf'}`);        
    }
}

async function partitionPDF(pdfConfig) {
    try {
        if (!fs.existsSync(pdfConfig.source)) {
            console.error(`❌ File non trovato: ${pdfConfig.source}`);
            return;
        }
        let totalErrors = 0;
        try {
            // Carica il PDF originale
            const pdfBytes = fs.readFileSync(pdfConfig.source);
            const originalPdf = await PDFDocument.load(pdfBytes);
            const totalPages = originalPdf.getPageCount();
            
            console.log(`   📊 ${totalPages} pagine totali`);
            
            let pdfProcessedRanges = 0;
            
            // Processa ogni range definito per questo PDF
            for (const item of pdfConfig.ranges) {
                console.log(`   🔨 Creando: ${item.output}`);
                
                // Valida il range
                if (item.startPage < 1 || item.endPage > totalPages) {
                    console.warn(`   ⚠️  Range non valido per ${item.output}: pagine ${item.startPage}-${item.endPage} (max: ${totalPages})`);
                    return;
                }
                
                if (item.startPage > item.endPage) {
                    console.warn(`   ⚠️  Range non valido per ${item.output}: startPage (${item.startPage}) > endPage (${item.endPage})`);
                    return;
                }
                
                if (item.everyPage) {
                    return partitionPDFEveryPage(pdfConfig, item, originalPdf);
                } else {
                    // Crea nuovo PDF
                    const newPdf = await PDFDocument.create();
                    // Copia le pagine specificate (converti da 1-based a 0-based)
                    const pageIndices = [];
                    for (let i = item.startPage - 1; i < item.endPage; i++) {
                        pageIndices.push(i);
                    }
                    const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
                    copiedPages.forEach(page => newPdf.addPage(page));
                    // Crea la directory se non esiste
                    const outputDir = path.dirname(item.output);
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    // Salva il nuovo PDF
                    const newPdfBytes = await newPdf.save();
                    fs.writeFileSync(item.output, newPdfBytes);
                }                
                console.log(`   ✅ Creato: ${item.output} (pagine ${item.startPage}-${item.endPage})`);
                pdfProcessedRanges++;
            }
            console.log(`   📋 Completato ${pdfConfig.source}: ${pdfProcessedRanges} file creati\n`);
            
        } catch (error) {
            console.error(`❌ Errore elaborando ${pdfConfig.source}:`, error.message);
            totalErrors++;
        }
        
        if (totalErrors === 0) {
            console.log('\n🎉 Batch completato con successo!');
        } else {
            console.log('\n⚠️  Batch completato con alcuni errori.');
        }
        
    } catch (error) {
        console.error('💥 Errore critico:', error.message);
        throw error;
    }
}

function main() {
  const [, , configPath, configProp, stepArg] = process.argv;
  if (!configPath || !configProp || !stepArg) {
    console.log('Uso: node pdf-partitioner.js <config.json> <configProp> <stepNumber>');
    process.exit(2);
  }
  const stepProp = "step" + stepArg;

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config[configProp]) {
    exitWithError('Configurazione non valida: proprietà radice "' + configProp + '" mancante.');
  }
  if (!config[configProp][stepProp]) {
    exitWithError('Configurazione non valida: step "' + stepProp + '" mancante.');
  }
  console.log("config." + configProp + '.' + stepProp, config[configProp][stepProp])
  partitionPDF(config[configProp][stepProp]);
}

if (require.main === module) {
  main();
}
