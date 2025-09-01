const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { promisify } = require('util');

class PDFOCRProcessor {
    constructor(options = {}) {
        this.options = {
            dpi: options.dpi || 300,
            language: options.language || 'eng',
            ocrEngine: options.ocrEngine || 'tesseract', // 'tesseract' or 'ocrmypdf'
            cleanupTemp: options.cleanupTemp !== false,
            outputFormat: options.outputFormat || 'pdf', // 'pdf' or 'txt'
            tesseractConfig: options.tesseractConfig || '--psm 6',
            ...options
        };
        this.tempDir = path.join(__dirname, 'temp_ocr');
    }

    // Inizializza directory temporanea
    async initialize() {
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (error) {
            throw new Error(`Errore creazione directory temp: ${error.message}`);
        }
    }

    // Verifica dipendenze sistema
    checkDependencies() {
        const deps = ['pdftoppm', 'tesseract'];
        if (this.options.ocrEngine === 'ocrmypdf') {
            deps.push('ocrmypdf');
        }

        const missing = [];
        for (const dep of deps) {
            try {
                execSync(`which ${dep}`, { stdio: 'ignore' });
            } catch (error) {
                missing.push(dep);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Dipendenze mancanti: ${missing.join(', ')}\n` +
                          `Installa con: sudo apt-get install poppler-utils tesseract-ocr${
                              missing.includes('ocrmypdf') ? ' ocrmypdf' : ''
                          }`);
        }
    }

    // Estrae pagine PDF come immagini
    async extractPagesToImages(pdfPath, startPage = 1, endPage = null) {
        const baseName = path.basename(pdfPath, '.pdf');
        const outputPattern = path.join(this.tempDir, `${baseName}-page`);
        
        let command = `pdftoppm -png -r ${this.options.dpi} "${pdfPath}" "${outputPattern}"`;
        
        if (startPage && endPage) {
            command += ` -f ${startPage} -l ${endPage}`;
        } else if (startPage) {
            command += ` -f ${startPage}`;
        }

        try {
            console.log(`Estraendo pagine da PDF: ${command}`);
            execSync(command, { stdio: 'pipe' });
            
            // Trova i file generati
            const files = fs.readdirSync(this.tempDir)
                .filter(f => f.startsWith(`${baseName}-page`) && f.endsWith('.png'))
                .sort()
                .map(f => path.join(this.tempDir, f));
                
            console.log(`Estratte ${files.length} pagine come immagini`);
            return files;
        } catch (error) {
            throw new Error(`Errore estrazione pagine: ${error.message}`);
        }
    }

    // OCR con Tesseract su singola immagine
    async ocrImage(imagePath, outputPath = null) {
        if (!outputPath) {
            outputPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_ocr');
        }

        // Rimuovi estensione se presente (Tesseract la aggiunge automaticamente)
        const outputBase = outputPath.replace(/\.txt$/, '');
        
        const command = [
            'tesseract',
            `"${imagePath}"`,
            `"${outputBase}"`,
            `-l ${this.options.language}`,
            this.options.tesseractConfig,
            // Configurazioni avanzate per migliorare qualità
            '-c preserve_interword_spaces=1',
            '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,()[]{}/-_:;!?@#$%^&*+=<>|\\~`"\'',
        ].join(' ');

        try {
            console.log(`OCR su ${path.basename(imagePath)}...`);
            execSync(command, { stdio: 'pipe' });
            
            // Leggi risultato OCR
            const textFile = outputBase + '.txt';
            if (fs.existsSync(textFile)) {
                const ocrText = fs.readFileSync(textFile, 'utf8');
                return {
                    imagePath,
                    textPath: textFile,
                    text: ocrText.trim()
                };
            } else {
                throw new Error(`File OCR non trovato: ${textFile}`);
            }
        } catch (error) {
            throw new Error(`Errore OCR su ${imagePath}: ${error.message}`);
        }
    }

    // Processa tutto il PDF con OCRmyPDF (raccomandato)
    async processWithOCRmyPDF(inputPdf, outputPdf) {
        const command = [
            'ocrmypdf',
            `--language ${this.options.language}`,
            '--deskew',           // Corregge inclinazione
            '--clean',            // Pulisce artefatti
            '--optimize 1',       // Ottimizzazione leggera
            '--skip-text',        // Salta pagine con testo esistente
            '--force-ocr',        // Forza OCR su tutte le pagine se necessario
            `--jobs ${require('os').cpus().length}`, // Usa tutti i core
            `"${inputPdf}"`,
            `"${outputPdf}"`
        ].join(' ');

        try {
            console.log('Processando PDF con OCRmyPDF...');
            console.log(`Comando: ${command}`);
            
            execSync(command, { 
                stdio: 'pipe',
                maxBuffer: 1024 * 1024 * 100 // 100MB buffer
            });
            
            console.log(`PDF processato: ${outputPdf}`);
            return outputPdf;
        } catch (error) {
            throw new Error(`Errore OCRmyPDF: ${error.message}`);
        }
    }

    // Processa PDF con Tesseract (pagina per pagina)
    async processWithTesseract(inputPdf, outputPath) {
        const imageFiles = await this.extractPagesToImages(inputPdf);
        const results = [];
        
        console.log(`Processando ${imageFiles.length} pagine con Tesseract...`);
        
        for (let i = 0; i < imageFiles.length; i++) {
            const imagePath = imageFiles[i];
            try {
                const result = await this.ocrImage(imagePath);
                results.push({
                    page: i + 1,
                    ...result
                });
                console.log(`✓ Pagina ${i + 1}/${imageFiles.length} completata`);
            } catch (error) {
                console.error(`✗ Errore pagina ${i + 1}: ${error.message}`);
                results.push({
                    page: i + 1,
                    imagePath,
                    text: `[ERRORE OCR: ${error.message}]`,
                    error: error.message
                });
            }
        }

        // Salva risultati combinati
        if (this.options.outputFormat === 'txt') {
            const combinedText = results
                .map(r => `\n=== PAGINA ${r.page} ===\n${r.text}`)
                .join('\n\n');
            
            fs.writeFileSync(outputPath, combinedText, 'utf8');
            console.log(`Testo OCR salvato in: ${outputPath}`);
        }

        return results;
    }

    // Post-processing per migliorare testo OCR
    improveOCRText(text) {
        return text
            // Rimuovi spazi extra tra lettere
            .replace(/([a-z])\s+([a-z])/gi, '$1$2')
            // Correggi parole comuni spezzate
            .replace(/t h e\b/gi, 'the')
            .replace(/a n d\b/gi, 'and')
            .replace(/w i t h\b/gi, 'with')
            .replace(/s h a l l\b/gi, 'shall')
            .replace(/r e q u i r e m e n t/gi, 'requirement')
            .replace(/p r o v i d e r/gi, 'provider')
            .replace(/s e c u r i t y/gi, 'security')
            .replace(/c a p a b i l i t y/gi, 'capability')
            // Rimuovi spazi prima della punteggiatura
            .replace(/\s+([.,;:!?])/g, '$1')
            // Normalizza spazi multipli
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // Metodo principale
    async processDocument(inputPdf, outputPath) {
        try {
            await this.initialize();
            this.checkDependencies();

            console.log(`\n🔄 Inizio processamento: ${inputPdf}`);
            console.log(`📋 Configurazione:`);
            console.log(`   - Motore OCR: ${this.options.ocrEngine}`);
            console.log(`   - Lingua: ${this.options.language}`);
            console.log(`   - DPI: ${this.options.dpi}`);
            console.log(`   - Output: ${outputPath}\n`);

            let result;
            
            if (this.options.ocrEngine === 'ocrmypdf') {
                result = await this.processWithOCRmyPDF(inputPdf, outputPath);
            } else {
                result = await this.processWithTesseract(inputPdf, outputPath);
                
                // Post-processing per Tesseract
                if (Array.isArray(result)) {
                    result.forEach(page => {
                        if (page.text) {
                            page.improvedText = this.improveOCRText(page.text);
                        }
                    });
                }
            }

            return result;
        } finally {
            if (this.options.cleanupTemp) {
                this.cleanup();
            }
        }
    }

    // Pulizia file temporanei
    cleanup() {
        try {
            if (fs.existsSync(this.tempDir)) {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
                console.log('🧹 File temporanei puliti');
            }
        } catch (error) {
            console.warn(`Avviso: impossibile pulire temp dir: ${error.message}`);
        }
    }
}

// Funzione di utilità per uso rapido
async function quickOCR(inputPdf, outputPath, options = {}) {
    const processor = new PDFOCRProcessor(options);
    return await processor.processDocument(inputPdf, outputPath);
}

// Export per CommonJS
module.exports = {
    PDFOCRProcessor,
    quickOCR
};

// Esempio d'uso se eseguito direttamente
if (require.main === module) {
    async function example() {
        try {
            // Esempio con OCRmyPDF (raccomandato)
            console.log('=== Esempio con OCRmyPDF ===');
            await quickOCR(
                'C:/My/wizzi/stfnbssl/lavori/logbot-cybersecurity/documenti/62443/2-4/pag_24_25.pdf',
                './output_ocrmypdf.pdf',
                {
                    ocrEngine: 'ocrmypdf',
                    language: 'eng',
                    dpi: 300
                }
            );

            // Esempio con Tesseract
            console.log('\n=== Esempio con Tesseract ===');
            await quickOCR(
                'C:/My/wizzi/stfnbssl/lavori/logbot-cybersecurity/documenti/62443/2-4/pag_24_25.pdf',
                './output_tesseract.txt',
                {
                    ocrEngine: 'tesseract',
                    language: 'eng',
                    outputFormat: 'txt',
                    dpi: 300
                }
            );

        } catch (error) {
            console.error('Errore:', error.message);
        }
    }

    example();
}