/**
 * PDF to Image OCR Extractor
 * Converte PDF in immagini e applica OCR avanzato
 * Gestisce layout multi-colonna e migliora la qualità di estrazione
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class PDFImageOCRExtractor {
    constructor() {
        this.tempDir = './temp_ocr';
        this.supportedOCREngines = ['tesseract', 'paddleocr', 'easyocr'];
        this.defaultOCREngine = 'tesseract';
    }

    /**
     * Estrae testo da PDF convertendo in immagini e applicando OCR
     * @param {Buffer} pdfBuffer - Buffer del PDF
     * @param {Object} options - Opzioni di estrazione
     * @returns {Promise<string>} Testo estratto
     */
    async extractFromPDF(pdfBuffer, options = {}) {
        const config = {
            // Opzioni conversione PDF → Immagine
            dpi: options.dpi || 300, // DPI per conversione (300+ per OCR)
            format: options.format || 'png', // png, jpg, tiff
            
            // Opzioni OCR
            ocrEngine: options.ocrEngine || this.defaultOCREngine,
            language: options.language || 'eng+ita', // Lingue Tesseract
            
            // Gestione colonne
            columns: options.columns || 2, // Numero di colonne
            columnDetection: options.columnDetection !== false, // Auto-rilevamento colonne
            
            // Pre-processing immagini
            preprocessing: {
                denoise: options.denoise !== false,
                deskew: options.deskew !== false, // Corregge rotazione
                sharpen: options.sharpen !== false,
                contrast: options.contrast !== false
            },
            
            // Opzioni avanzate
            pageRange: options.pageRange || null, // [start, end] o null per tutte
            cleanupTemp: options.cleanupTemp !== false,
            saveImages: options.saveImages || false, // Salva immagini elaborate
            
            ...options
        };

        try {
            // Crea directory temporanea
            await this.ensureTempDir();
            
            // Converte PDF in immagini
            console.log('🖼️  Conversione PDF in immagini...');
            const imageFiles = await this.convertPDFToImages(pdfBuffer, config);
            
            // Elabora ogni immagine
            console.log(`🔍 Elaborazione OCR di ${imageFiles.length} pagine...`);
            const extractedTexts = [];
            
            for (let i = 0; i < imageFiles.length; i++) {
                const imagePath = imageFiles[i];
                console.log(`   Pagina ${i + 1}/${imageFiles.length}`);
                
                // Pre-processing dell'immagine
                const processedImagePath = await this.preprocessImage(imagePath, config);
                
                // Estrazione testo con gestione colonne
                const pageText = await this.extractTextFromImage(processedImagePath, config);
                extractedTexts.push(pageText);
            }
            
            // Cleanup se richiesto
            if (config.cleanupTemp) {
                await this.cleanupTempFiles();
            }
            
            // Combina tutto il testo
            const fullText = extractedTexts.join('\n\n--- PAGINA ---\n\n');
            console.log('✅ Estrazione OCR completata');
            
            return fullText;
            
        } catch (error) {
            throw new Error(`Errore nell'estrazione OCR: ${error.message}`);
        }
    }

    /**
     * Converte PDF in immagini usando pdf2pic o pdftoppm
     */
    async convertPDFToImages(pdfBuffer, config) {
        const pdfPath = path.join(this.tempDir, 'input.pdf');
        await fs.writeFile(pdfPath, pdfBuffer);
        
        const imageFiles = [];
        
        try {
            // Prova con pdftoppm (parte di poppler-utils)
            const outputPrefix = path.join(this.tempDir, 'page');
            const command = `pdftoppm -${config.format} -r ${config.dpi} "${pdfPath}" "${outputPrefix}"`;
            
            if (config.pageRange) {
                command += ` -f ${config.pageRange[0]} -l ${config.pageRange[1]}`;
            }
            
            await execAsync(command);
            
            // Trova i file generati
            const files = await fs.readdir(this.tempDir);
            const imageFileNames = files
                .filter(f => f.startsWith('page') && f.endsWith(`.${config.format}`))
                .sort();
            
            imageFileNames.forEach(fileName => {
                imageFiles.push(path.join(this.tempDir, fileName));
            });
            
        } catch (error) {
            throw new Error(`Errore nella conversione PDF: ${error.message}. Assicurati che pdftoppm sia installato.`);
        }
        
        return imageFiles;
    }

    /**
     * Pre-elabora l'immagine per migliorare l'OCR
     */
    async preprocessImage(imagePath, config) {
        if (!config.preprocessing || Object.values(config.preprocessing).every(v => !v)) {
            return imagePath; // Nessun preprocessing richiesto
        }

        const outputPath = imagePath.replace(/(\.[^.]+)$/, '_processed$1');
        
        try {
            // Costruisci comando ImageMagick
            let magickCommand = `convert "${imagePath}"`;
            
            // Denoising
            if (config.preprocessing.denoise) {
                magickCommand += ' -despeckle';
            }
            
            // Deskew (correzione rotazione)
            if (config.preprocessing.deskew) {
                magickCommand += ' -deskew 40%';
            }
            
            // Miglioramento contrasto
            if (config.preprocessing.contrast) {
                magickCommand += ' -normalize -contrast-stretch 0';
            }
            
            // Sharpening
            if (config.preprocessing.sharpen) {
                magickCommand += ' -sharpen 0x1';
            }
            
            magickCommand += ` "${outputPath}"`;
            
            await execAsync(magickCommand);
            return outputPath;
            
        } catch (error) {
            console.warn(`⚠️  Preprocessing fallito: ${error.message}`);
            return imagePath; // Usa immagine originale
        }
    }

    /**
     * Estrae testo dall'immagine gestendo le colonne
     */
    async extractTextFromImage(imagePath, config) {
        // Prima estrae il testo completo per analisi layout
        const fullText = await this.runOCR(imagePath, config);
        
        if (config.columns <= 1 || !config.columnDetection) {
            return fullText;
        }
        
        // Gestione multi-colonna
        return await this.extractColumnarText(imagePath, config);
    }

    /**
     * Estrazione specializzata per testo a colonne
     */
    async extractColumnarText(imagePath, config) {
        try {
            // Ottieni dimensioni immagine
            const { stdout: imageInfo } = await execAsync(`identify "${imagePath}"`);
            const dimensions = imageInfo.match(/(\d+)x(\d+)/);
            if (!dimensions) {
                throw new Error('Impossibile determinare dimensioni immagine');
            }
            
            const width = parseInt(dimensions[1]);
            const height = parseInt(dimensions[2]);
            
            // Calcola divisioni per colonne
            const columnWidth = Math.floor(width / config.columns);
            const texts = [];
            
            for (let col = 0; col < config.columns; col++) {
                const startX = col * columnWidth;
                const cropWidth = col === config.columns - 1 ? 
                    width - startX : // Ultima colonna prende tutto il resto
                    columnWidth;
                
                // Crea crop dell'immagine per la colonna
                const columnImagePath = imagePath.replace(/(\.[^.]+)$/, `_col${col}$1`);
                const cropCommand = `convert "${imagePath}" -crop ${cropWidth}x${height}+${startX}+0 "${columnImagePath}"`;
                
                await execAsync(cropCommand);
                
                // OCR sulla colonna
                const columnText = await this.runOCR(columnImagePath, config);
                texts.push(columnText);
                
                // Cleanup colonna temporanea
                try {
                    await fs.unlink(columnImagePath);
                } catch (e) {
                    // Ignora errori di cleanup
                }
            }
            
            // Combina testo delle colonne
            return this.combineColumnTexts(texts, config);
            
        } catch (error) {
            console.warn(`⚠️  Estrazione colonne fallita: ${error.message}`);
            // Fallback all'estrazione normale
            return await this.runOCR(imagePath, config);
        }
    }

    /**
     * Combina intelligentemente il testo delle colonne
     */
    combineColumnTexts(columnTexts, config) {
        // Strategia semplice: alternanza riga per riga se possibile
        // Altrimenti concatenazione sequenziale
        
        if (config.columns === 2 && columnTexts.length === 2) {
            const leftLines = columnTexts[0].split('\n');
            const rightLines = columnTexts[1].split('\n');
            
            // Se le colonne hanno numero simile di righe, probabilmente sono parallele
            if (Math.abs(leftLines.length - rightLines.length) <= 3) {
                const combined = [];
                const maxLines = Math.max(leftLines.length, rightLines.length);
                
                for (let i = 0; i < maxLines; i++) {
                    const leftLine = leftLines[i] || '';
                    const rightLine = rightLines[i] || '';
                    
                    if (leftLine.trim()) combined.push(leftLine.trim());
                    if (rightLine.trim()) combined.push(rightLine.trim());
                }
                
                return combined.join('\n');
            }
        }
        
        // Fallback: concatenazione sequenziale
        return columnTexts.filter(text => text.trim()).join('\n\n--- COLONNA ---\n\n');
    }

    /**
     * Esegue OCR sull'immagine
     */
    async runOCR(imagePath, config) {
        switch (config.ocrEngine.toLowerCase()) {
            case 'tesseract':
                return await this.runTesseract(imagePath, config);
            case 'paddleocr':
                return await this.runPaddleOCR(imagePath, config);
            case 'easyocr':
                return await this.runEasyOCR(imagePath, config);
            default:
                throw new Error(`OCR engine non supportato: ${config.ocrEngine}`);
        }
    }

    /**
     * Esegue Tesseract OCR
     */
    async runTesseract(imagePath, config) {
        const outputPath = imagePath.replace(/\.[^.]+$/, '');
        const command = `tesseract "${imagePath}" "${outputPath}" -l ${config.language} --psm 6`;
        
        try {
            await execAsync(command);
            const textContent = await fs.readFile(`${outputPath}.txt`, 'utf8');
            
            // Cleanup file temporaneo
            try {
                await fs.unlink(`${outputPath}.txt`);
            } catch (e) {
                // Ignora errori di cleanup
            }
            
            return textContent;
        } catch (error) {
            throw new Error(`Tesseract OCR fallito: ${error.message}`);
        }
    }

    /**
     * Esegue PaddleOCR (richiede Python e PaddleOCR installato)
     */
    async runPaddleOCR(imagePath, config) {
        const pythonScript = `
import sys
from paddleocr import PaddleOCR
import json

ocr = PaddleOCR(use_angle_cls=True, lang='${config.language.split('+')[0]}')
result = ocr.ocr('${imagePath}', cls=True)

text_lines = []
for line in result[0]:
    text_lines.append(line[1][0])

print('\\n'.join(text_lines))
        `;
        
        const scriptPath = path.join(this.tempDir, 'paddle_ocr.py');
        await fs.writeFile(scriptPath, pythonScript);
        
        try {
            const { stdout } = await execAsync(`python "${scriptPath}"`);
            return stdout.trim();
        } catch (error) {
            throw new Error(`PaddleOCR fallito: ${error.message}`);
        }
    }

    /**
     * Esegue EasyOCR (richiede Python e EasyOCR installato)
     */
    async runEasyOCR(imagePath, config) {
        const languages = config.language.split('+').map(lang => {
            // Mappatura lingue per EasyOCR
            const langMap = { 'eng': 'en', 'ita': 'it', 'fra': 'fr', 'deu': 'de' };
            return langMap[lang] || lang;
        });
        
        const pythonScript = `
import easyocr
import sys

reader = easyocr.Reader([${languages.map(l => `'${l}'`).join(', ')}])
result = reader.readtext('${imagePath}')

text_lines = []
for (bbox, text, confidence) in result:
    if confidence > 0.5:  # Filtra risultati con bassa confidenza
        text_lines.append(text)

print('\\n'.join(text_lines))
        `;
        
        const scriptPath = path.join(this.tempDir, 'easy_ocr.py');
        await fs.writeFile(scriptPath, pythonScript);
        
        try {
            const { stdout } = await execAsync(`python "${scriptPath}"`);
            return stdout.trim();
        } catch (error) {
            throw new Error(`EasyOCR fallito: ${error.message}`);
        }
    }

    /**
     * Crea directory temporanea
     */
    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            // Directory già esistente, ok
        }
    }

    /**
     * Pulisce file temporanei
     */
    async cleanupTempFiles() {
        try {
            const files = await fs.readdir(this.tempDir);
            for (const file of files) {
                await fs.unlink(path.join(this.tempDir, file));
            }
        } catch (error) {
            console.warn(`⚠️  Cleanup parziale: ${error.message}`);
        }
    }

    /**
     * Verifica dipendenze del sistema
     */
    async checkDependencies() {
        const checks = [];
        
        // Verifica pdftoppm
        try {
            await execAsync('pdftoppm -h');
            checks.push({ name: 'pdftoppm', status: 'OK', message: 'Poppler utils installato' });
        } catch (error) {
            checks.push({ name: 'pdftoppm', status: 'MISSING', message: 'Installa poppler-utils' });
        }
        
        // Verifica ImageMagick
        try {
            await execAsync('convert -version');
            checks.push({ name: 'imagemagick', status: 'OK', message: 'ImageMagick installato' });
        } catch (error) {
            checks.push({ name: 'imagemagick', status: 'MISSING', message: 'Installa ImageMagick' });
        }
        
        // Verifica Tesseract
        try {
            await execAsync('tesseract --version');
            checks.push({ name: 'tesseract', status: 'OK', message: 'Tesseract installato' });
        } catch (error) {
            checks.push({ name: 'tesseract', status: 'MISSING', message: 'Installa Tesseract OCR' });
        }
        
        return checks;
    }
}

// Funzione helper per uso semplice
async function extractWithOCR(pdfBuffer, options = {}) {
    const extractor = new PDFImageOCRExtractor();
    return await extractor.extractFromPDF(pdfBuffer, options);
}

// Esempio di utilizzo
async function example() {
    const extractor = new PDFImageOCRExtractor();
    
    // Verifica dipendenze
    const deps = await extractor.checkDependencies();
    console.log('Dipendenze:', deps);
    
    // Estrazione con OCR
    const pdfBuffer = await fs.readFile('./documento.pdf');
    const text = await extractor.extractFromPDF(pdfBuffer, {
        dpi: 300,
        columns: 2,
        language: 'eng+ita',
        ocrEngine: 'tesseract',
        preprocessing: {
            denoise: true,
            deskew: true,
            contrast: true
        }
    });
    
    console.log('Testo estratto:', text);
}

module.exports = {
    PDFImageOCRExtractor,
    extractWithOCR
};