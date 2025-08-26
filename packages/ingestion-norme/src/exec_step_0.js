const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Spezza più PDF basandosi su una configurazione JSON
 * @param {string} configPath - Percorso del file JSON di configurazione
 */
async function spezzaMultiPDFConJSON(configPath) {
    try {
        // Leggi il file di configurazione
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        console.log(`🚀 Avvio elaborazione di ${config.pdfs.length} PDF\n`);
        
        let totalProcessed = 0;
        let totalErrors = 0;
        
        // Processa ogni PDF nella configurazione
        for (const pdfConfig of config.pdfs) {
            console.log(`📄 Elaborando: ${pdfConfig.source}`);
            
            try {
                // Verifica che il file sorgente esista
                if (!fs.existsSync(pdfConfig.source)) {
                    console.error(`❌ File non trovato: ${pdfConfig.source}`);
                    totalErrors++;
                    continue;
                }
                
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
                        continue;
                    }
                    
                    if (item.startPage > item.endPage) {
                        console.warn(`   ⚠️  Range non valido per ${item.output}: startPage (${item.startPage}) > endPage (${item.endPage})`);
                        continue;
                    }
                    
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
                    
                    console.log(`   ✅ Creato: ${item.output} (pagine ${item.startPage}-${item.endPage})`);
                    pdfProcessedRanges++;
                }
                
                console.log(`   📋 Completato ${pdfConfig.source}: ${pdfProcessedRanges} file creati\n`);
                totalProcessed++;
                
            } catch (error) {
                console.error(`❌ Errore elaborando ${pdfConfig.source}:`, error.message);
                totalErrors++;
            }
        }
        
        // Riepilogo finale
        console.log('🎯 RIEPILOGO BATCH:');
        console.log(`   ✅ PDF elaborati con successo: ${totalProcessed}`);
        console.log(`   ❌ PDF con errori: ${totalErrors}`);
        console.log(`   📊 Totale PDF processati: ${config.pdfs.length}`);
        
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

/**
 * Funzione di utilità per validare la configurazione
 * @param {string} configPath - Percorso del file JSON di configurazione
 */
function validaConfigurazione(configPath) {
    try {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        if (!config.pdfs || !Array.isArray(config.pdfs)) {
            throw new Error('La configurazione deve contenere un array "pdfs"');
        }
        
        for (let i = 0; i < config.pdfs.length; i++) {
            const pdf = config.pdfs[i];
            
            if (!pdf.source) {
                throw new Error(`PDF ${i + 1}: campo "source" mancante`);
            }
            
            if (!pdf.ranges || !Array.isArray(pdf.ranges)) {
                throw new Error(`PDF ${i + 1}: campo "ranges" deve essere un array`);
            }
            
            for (let j = 0; j < pdf.ranges.length; j++) {
                const range = pdf.ranges[j];
                
                if (!range.startPage || !range.endPage || !range.output) {
                    throw new Error(`PDF ${i + 1}, Range ${j + 1}: campi "startPage", "endPage", "output" sono obbligatori`);
                }
            }
        }
        
        console.log('✅ Configurazione valida');
        return true;
        
    } catch (error) {
        console.error('❌ Errore validazione configurazione:', error.message);
        return false;
    }
}

// Esempio di utilizzo
async function main() {
    const configFile = 'batch-split-config.json';
    
    // Valida la configurazione prima di procedere
    if (!validaConfigurazione(configFile)) {
        process.exit(1);
    }
    
    await spezzaMultiPDFConJSON(configFile);
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main();
}

// Esporta le funzioni
module.exports = {
    spezzaMultiPDFConJSON,
    validaConfigurazione
};