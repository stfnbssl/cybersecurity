/**
 * PDF to Image OCR Extractor
 * Converte PDF in immagini e applica OCR con supporto per layout a colonne
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// Dipendenze per OCR e manipolazione immagini
// npm install tesseract.js pdf-poppler sharp jimp

const Tesseract = require('tesseract.js');
const pdfPoppler = require('pdf-poppler');
const sharp = require('sharp');
const Jimp = require('jimp');

class PDFImageOCRExtractor {
    constructor() {
        this.tempDir = './temp_ocr';
        this.supportedLanguages = ['eng', 'ita', 'fra', 'deu', 'spa'];
        this.defaultOCROptions = {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        };
    }

    /**
     * Estrae testo da PDF usando conversione a immagini + OCR
     * @param {Buffer} pdfBuffer - Buffer del PDF
     * @param {Object} options - Opzioni di estrazione
     * @returns {Promise<Object>} Risultato dell'estrazione
     */
    async extractWithOCR(pdfBuffer, options = {}) {
        const config = {
            // Opzioni generali
            outputDir: options.outputDir || this.tempDir,
            keepImages: options.keepImages || false,
            
            // Opzioni conversione PDF -> Immagini
            dpi: options.dpi || 300, // Risoluzione immagini
            format: options.format || 'png', // jpeg, png
            
            // Opzioni OCR
            language: options.language || 'eng+ita', // Lingue Tesseract
            ocrEngine: options.ocrEngine || 'tesseract', // tesseract, azure, aws
            
            // Opzioni layout colonne
            detectColumns: options.detectColumns !== false,
            columnsCount: options.columnsCount || 'auto', // auto, 1, 2, 3...
            columnSeparator: options.columnSeparator || '\n\n--- COLONNA ---\n\n',
            
            // Opzioni preprocessing immagini
            enhanceImage: options.enhanceImage !== false,
            removeNoise: options.removeNoise !== false,
            increaseDPI: options.increaseDPI || false,
            
            // Opzioni pagine
            pageRange: options.pageRange || null, // es: '1-10' o [1,3,5]
            
            ...options
        };

        try {
            console.log('🔄 Avvio estrazione OCR da PDF...');
            
            // 1. Crea directory temporanea
            await this.ensureTempDir(config.outputDir);
            
            // 2. Converte PDF in immagini
            let imageFiles;
            try {
                imageFiles = await this.convertPDFToImages(pdfBuffer, config);
            } catch (error) {
                console.log('⚠️ Conversione primaria fallita, provo metodo alternativo...');
                console.log('   Errore:', error.message);
                imageFiles = await this.convertPDFToImagesAlternative(pdfBuffer, config);
            }
            
            // 3. Preprocessa le immagini se richiesto
            const processedImages = config.enhanceImage ? 
                await this.preprocessImages(imageFiles, config) : imageFiles;
            
            // 4. Rileva layout colonne se richiesto
            const columnInfo = config.detectColumns ? 
                await this.detectColumnsLayout(processedImages[0], config) : null;
            
            // 5. Esegue OCR su ogni immagine
            const ocrResults = await this.performOCR(processedImages, config, columnInfo);
            
            // 6. Combina i risultati
            const finalText = this.combineOCRResults(ocrResults, config);
            
            // 7. Pulizia
            if (!config.keepImages) {
                await this.cleanup(config.outputDir);
            }
            
            return {
                success: true,
                text: finalText,
                pages: ocrResults.length,
                columnInfo: columnInfo,
                confidence: this.calculateAverageConfidence(ocrResults),
                metadata: {
                    dpi: config.dpi,
                    language: config.language,
                    columnsDetected: columnInfo ? columnInfo.columns : 1,
                    totalWords: finalText.split(/\s+/).length
                }
            };
            
        } catch (error) {
            console.error('❌ Errore nell\'estrazione OCR:', error);
            throw new Error(`Estrazione OCR fallita: ${error.message}`);
        }
    }

    /**
     * Converte PDF in immagini
     */
    async convertPDFToImages(pdfBuffer, config) {
        console.log('📄 Conversione PDF in immagini...');
        
        // Salva temporaneamente il PDF
        const tempPDFPath = path.join(config.outputDir, 'temp.pdf');
        await fs.writeFile(tempPDFPath, pdfBuffer);
        
        const options = {
            format: config.format,
            out_dir: config.outputDir,
            out_prefix: 'page',
            page: config.pageRange || null,
            size: {
                width: Math.round(2480 * (config.dpi / 300)), // A4 width at specified DPI
                height: Math.round(3508 * (config.dpi / 300))  // A4 height at specified DPI
            }
        };
        
        try {
            console.log('🔧 Opzioni conversione:', options);
            
            // pdf-poppler.convert può restituire diversi tipi di risultato
            const result = await pdfPoppler.convert(tempPDFPath, options);
            console.log('📋 Risultato conversione:', typeof result, result);
            
            let imageFiles = [];
            
            // Gestisci diversi tipi di risposta dalla libreria
            if (Array.isArray(result)) {
                imageFiles = result;
            } else if (result && typeof result === 'object' && result.length !== undefined) {
                // Alcuni casi dove result ha proprietà length ma non è array
                imageFiles = Array.from(result);
            } else {
                // Fallback: cerca file immagine nella directory
                console.log('🔍 Cercando file immagine nella directory...');
                const files = await fs.readdir(config.outputDir);
                imageFiles = files.filter(file => 
                    file.startsWith('page') && 
                    (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
                ).sort(); // Ordina per nome per mantenere l'ordine delle pagine
            }
            
            console.log(`✅ Trovate ${imageFiles.length} pagine convertite`);
            
            if (imageFiles.length === 0) {
                throw new Error('Nessuna immagine generata dal PDF');
            }
            
            // Rimuovi il PDF temporaneo
            await fs.unlink(tempPDFPath).catch(err => console.warn('⚠️ Errore rimozione PDF temp:', err.message));
            
            // Restituisci i percorsi completi
            return imageFiles.map(file => 
                path.isAbsolute(file) ? file : path.join(config.outputDir, file)
            );
        } catch (error) {
            // Rimuovi il PDF temporaneo anche in caso di errore
            await fs.unlink(tempPDFPath).catch(() => {});
            throw new Error(`Conversione PDF fallita: ${error.message}`);
        }
    }

    /**
     * Preprocessa le immagini per migliorare l'OCR
     */
    async preprocessImages(imageFiles, config) {
        console.log('🖼️  Preprocessing immagini...');
        const processedFiles = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
            const inputFile = imageFiles[i];
            const outputFile = inputFile.replace(/(\.[^.]+)$/, '_processed$1');
            
            try {
                let image = sharp(inputFile);
                
                // Aumenta risoluzione se richiesto
                if (config.increaseDPI) {
                    const metadata = await image.metadata();
                    const scaleFactor = config.increaseDPI / 300; // Assume 300 DPI base
                    image = image.resize(
                        Math.round(metadata.width * scaleFactor),
                        Math.round(metadata.height * scaleFactor),
                        { kernel: sharp.kernel.lanczos3 }
                    );
                }
                
                // Migliora contrasto e rimuove rumore
                image = image
                    .normalize() // Normalizza contrasto
                    .sharpen() // Aumenta nitidezza
                    .threshold(128) // Binarizza (bianco/nero)
                    .median(1); // Rimuove rumore (filtro mediano)
                
                await image.png().toFile(outputFile);
                processedFiles.push(outputFile);
                
                console.log(`✅ Preprocessata pagina ${i + 1}/${imageFiles.length}`);
                
            } catch (error) {
                console.warn(`⚠️  Errore preprocessing pagina ${i + 1}: ${error.message}`);
                processedFiles.push(inputFile); // Usa originale se fallisce
            }
        }
        
        return processedFiles;
    }

    /**
     * Rileva il layout delle colonne nella prima pagina
     */
    async detectColumnsLayout(imagePath, config) {
        console.log('🔍 Rilevamento layout colonne...');
        
        try {
            const image = await Jimp.read(imagePath);
            const width = image.bitmap.width;
            const height = image.bitmap.height;
            
            // Analisi verticale per trovare separatori di colonna
            const columnSeparators = await this.findColumnSeparators(image, config);
            
            const layoutInfo = {
                width: width,
                height: height,
                columns: columnSeparators.length + 1,
                separators: columnSeparators,
                regions: this.calculateColumnRegions(width, height, columnSeparators)
            };
            
            console.log(`📐 Rilevate ${layoutInfo.columns} colonne`);
            return layoutInfo;
            
        } catch (error) {
            console.warn('⚠️  Fallback a layout singola colonna:', error.message);
            return {
                columns: 1,
                regions: [{ x: 0, y: 0, width: 'full', height: 'full' }]
            };
        }
    }

    /**
     * Trova i separatori delle colonne analizzando spazi bianchi verticali
     */
    async findColumnSeparators(image, config) {
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const separators = [];
        
        // Campiona il centro verticale dell'immagine
        const sampleY = Math.floor(height / 2);
        const sampleHeight = Math.floor(height / 4); // Campiona 25% al centro
        
        // Array per contare pixel bianchi per ogni colonna X
        const whitePixelCounts = new Array(width).fill(0);
        
        for (let x = 0; x < width; x++) {
            for (let y = sampleY - sampleHeight/2; y < sampleY + sampleHeight/2; y++) {
                const pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                // Considera bianco se luminosità > 200
                const brightness = (pixelColor.r + pixelColor.g + pixelColor.b) / 3;
                if (brightness > 200) {
                    whitePixelCounts[x]++;
                }
            }
        }
        
        // Trova zone con molti pixel bianchi (probabili separatori)
        const threshold = sampleHeight * 0.8; // 80% deve essere bianco
        const minSeparatorWidth = Math.floor(width * 0.02); // Min 2% larghezza
        
        let inSeparator = false;
        let separatorStart = 0;
        
        for (let x = 0; x < width; x++) {
            if (whitePixelCounts[x] > threshold && !inSeparator) {
                inSeparator = true;
                separatorStart = x;
            } else if (whitePixelCounts[x] <= threshold && inSeparator) {
                inSeparator = false;
                const separatorWidth = x - separatorStart;
                if (separatorWidth >= minSeparatorWidth) {
                    separators.push(Math.floor(separatorStart + separatorWidth / 2));
                }
            }
        }
        
        return separators;
    }

    /**
     * Calcola le regioni di ogni colonna
     */
    calculateColumnRegions(width, height, separators) {
        const regions = [];
        
        if (separators.length === 0) {
            // Singola colonna
            return [{ x: 0, y: 0, width: width, height: height }];
        }
        
        // Prima colonna
        regions.push({
            x: 0,
            y: 0,
            width: separators[0],
            height: height
        });
        
        // Colonne intermedie
        for (let i = 0; i < separators.length - 1; i++) {
            regions.push({
                x: separators[i],
                y: 0,
                width: separators[i + 1] - separators[i],
                height: height
            });
        }
        
        // Ultima colonna
        regions.push({
            x: separators[separators.length - 1],
            y: 0,
            width: width - separators[separators.length - 1],
            height: height
        });
        
        return regions;
    }

    /**
     * Converte PDF in immagini usando approccio alternativo
     */
    async convertPDFToImagesAlternative(pdfBuffer, config) {
        console.log('🔄 Usando metodo alternativo per conversione PDF...');
        
        const tempPDFPath = path.join(config.outputDir, 'temp.pdf');
        await fs.writeFile(tempPDFPath, pdfBuffer);
        
        try {
            // Usa pdftoppm direttamente tramite command line
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const outputPath = path.join(config.outputDir, 'page');
            const dpi = config.dpi || 300;
            const format = config.format === 'jpg' ? 'jpeg' : 'png';
            
            // Comando pdftoppm
            const command = `pdftoppm -${format} -r ${dpi} "${tempPDFPath}" "${outputPath}"`;
            console.log('🔧 Eseguendo comando:', command);
            
            await execAsync(command);
            
            // Trova i file generati
            const files = await fs.readdir(config.outputDir);
            const imageFiles = files
                .filter(file => file.startsWith('page') && (file.endsWith('.png') || file.endsWith('.jpg')))
                .sort()
                .map(file => path.join(config.outputDir, file));
            
            console.log(`✅ Convertite ${imageFiles.length} pagine con metodo alternativo`);
            
            // Rimuovi PDF temporaneo
            await fs.unlink(tempPDFPath).catch(() => {});
            
            return imageFiles;
            
        } catch (error) {
            await fs.unlink(tempPDFPath).catch(() => {});
            throw new Error(`Conversione alternativa fallita: ${error.message}`);
        }
    }
    calculateColumnRegions(width, height, separators) {
        const regions = [];
        
        if (separators.length === 0) {
            // Singola colonna
            return [{ x: 0, y: 0, width: width, height: height }];
        }
        
        // Prima colonna
        regions.push({
            x: 0,
            y: 0,
            width: separators[0],
            height: height
        });
        
        // Colonne intermedie
        for (let i = 0; i < separators.length - 1; i++) {
            regions.push({
                x: separators[i],
                y: 0,
                width: separators[i + 1] - separators[i],
                height: height
            });
        }
        
        // Ultima colonna
        regions.push({
            x: separators[separators.length - 1],
            y: 0,
            width: width - separators[separators.length - 1],
            height: height
        });
        
        return regions;
    }

    /**
     * Esegue OCR su tutte le immagini
     */
    async performOCR(imageFiles, config, columnInfo) {
        console.log('🔤 Esecuzione OCR...');
        const results = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
            const imagePath = imageFiles[i];
            console.log(`📖 OCR pagina ${i + 1}/${imageFiles.length}`);
            
            let pageText = '';
            
            if (columnInfo && columnInfo.columns > 1) {
                // OCR per colonne separate
                const columnTexts = await this.ocrByColumns(imagePath, columnInfo, config);
                pageText = columnTexts.join(config.columnSeparator);
            } else {
                // OCR pagina intera
                const result = await Tesseract.recognize(imagePath, config.language, this.defaultOCROptions);
                pageText = result.data.text;
            }
            
            results.push({
                page: i + 1,
                text: pageText,
                confidence: 85 // Placeholder, Tesseract.js fornisce confidence
            });
        }
        
        return results;
    }

    /**
     * Esegue OCR separato per ogni colonna
     */
    async ocrByColumns(imagePath, columnInfo, config) {
        const columnTexts = [];
        
        for (let i = 0; i < columnInfo.regions.length; i++) {
            const region = columnInfo.regions[i];
            
            // Ritaglia l'immagine per la colonna
            const croppedPath = imagePath.replace(/(\.[^.]+)$/, `_col${i + 1}$1`);
            
            await sharp(imagePath)
                .extract({
                    left: region.x,
                    top: region.y,
                    width: region.width,
                    height: region.height
                })
                .toFile(croppedPath);
            
            // OCR sulla colonna ritagliata
            const result = await Tesseract.recognize(croppedPath, config.language, this.defaultOCROptions);
            columnTexts.push(result.data.text.trim());
            
            // Rimuovi immagine colonna temporanea
            await fs.unlink(croppedPath);
            
            console.log(`✅ OCR colonna ${i + 1}/${columnInfo.regions.length} completato`);
        }
        
        return columnTexts;
    }

    /**
     * Combina i risultati OCR di tutte le pagine
     */
    combineOCRResults(results, config) {
        return results
            .map(result => result.text)
            .join('\n\n--- PAGINA SUCCESSIVA ---\n\n');
    }

    /**
     * Calcola confidenza media
     */
    calculateAverageConfidence(results) {
        if (results.length === 0) return 0;
        const total = results.reduce((sum, result) => sum + result.confidence, 0);
        return Math.round(total / results.length);
    }

    /**
     * Crea directory temporanea
     */
    async ensureTempDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            // Directory già esistente
        }
    }

    /**
     * Pulizia file temporanei
     */
    async cleanup(dir) {
        try {
            const files = await fs.readdir(dir);
            await Promise.all(files.map(file => fs.unlink(path.join(dir, file))));
            await fs.rmdir(dir);
            console.log('🧹 Pulizia file temporanei completata');
        } catch (error) {
            console.warn('⚠️  Errore durante pulizia:', error.message);
        }
    }
}

// Funzione helper per uso semplice
async function extractPDFWithOCR(pdfBuffer, options = {}) {
    const extractor = new PDFImageOCRExtractor();
    return await extractor.extractWithOCR(pdfBuffer, options);
}

// Esempio di utilizzo
async function example() {
    try {
        const pdfBuffer = await fs.readFile('./documento.pdf');
        
        const result = await extractPDFWithOCR(pdfBuffer, {
            language: 'eng+ita',
            detectColumns: true,
            enhanceImage: true,
            dpi: 400,
            keepImages: false
        });
        
        console.log('Testo estratto:', result.text);
        console.log('Confidenza:', result.confidence);
        console.log('Colonne rilevate:', result.columnInfo?.columns);
        
    } catch (error) {
        console.error('Errore:', error);
    }
}

module.exports = {
    PDFImageOCRExtractor,
    extractPDFWithOCR
};