// Document Text Extractor Library
// Libreria per l'estrazione di testo da documenti HTML, PDF, DOCX e TXT

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// Dipendenze per l'estrazione
const cheerio = require('cheerio'); // Per HTML
const pdfParse = require('pdf-parse'); // Per PDF
const mammoth = require('mammoth'); // Per DOCX
const { PDFTextCleaner } = require('./pdf-text-cleaner'); // Cleaner per testo PDF
const { PDFImageOCRExtractor } = require('./pdf-ocr-extractor'); // OCR avanzato per PDF

/**
 * Classe principale per l'estrazione di testo da documenti
 */
class DocumentTextExtractor {
    constructor() {
        this.supportedFormats = ['html', 'pdf', 'docx', 'txt'];
        this.pdfCleaner = new PDFTextCleaner();
        this.pdfOCRExtractor = new PDFImageOCRExtractor();
    }

    /**
     * Estrae testo da un documento basandosi su configurazione JSON
     * @param {Object} config - Configurazione JSON per l'estrazione
     * @param {string} config.source - URL o percorso del file sorgente
     * @param {string} config.output - Percorso del file di output
     * @param {string} [config.type] - Tipo di documento (auto-rilevato se omesso)
     * @param {Object} [config.options] - Opzioni aggiuntive per l'estrazione
     * @returns {Promise<Object>} Risultato dell'estrazione
     */
    async extractText(config) {
        try {
            // Validazione della configurazione
            this.validateConfig(config);

            console.log(`Inizio estrazione da: ${config.source}`);

            // Ottieni il contenuto del documento
            const documentContent = await this.getDocumentContent(config.source);
            
            // Determina il tipo di documento
            const documentType = config.type || this.detectDocumentType(config.source);
            
            // Estrai il testo in base al tipo
            const extractedText = await this.extractByType(documentContent, documentType, config.options);
            
            // Salva il risultato
            await this.saveExtractedText(extractedText, config.output);

            const result = {
                success: true,
                source: config.source,
                output: config.output,
                type: documentType,
                textLength: extractedText.length,
                extractedAt: new Date().toISOString()
            };

            console.log('Estrazione completata con successo');
            return result;

        } catch (error) {
            console.error('Errore durante l\'estrazione:', error.message);
            return {
                success: false,
                source: config.source,
                error: error.message,
                extractedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Valida la configurazione di input
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Configurazione mancante');
        }
        if (!config.source) {
            throw new Error('Sorgente del documento mancante');
        }
        if (!config.output) {
            throw new Error('Percorso di output mancante');
        }
    }

    /**
     * Ottiene il contenuto del documento da URL o file locale
     */
    async getDocumentContent(source) {
        if (this.isUrl(source)) {
            return await this.downloadFromUrl(source);
        } else {
            return await this.readFromDisk(source);
        }
    }

    /**
     * Controlla se la sorgente è un URL
     */
    isUrl(source) {
        return source.startsWith('http://') || source.startsWith('https://');
    }

    /**
     * Scarica il contenuto da un URL
     */
    async downloadFromUrl(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            client.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Errore HTTP: ${response.statusCode}`));
                    return;
                }

                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
            }).on('error', reject);
        });
    }

    /**
     * Legge il contenuto da disco
     */
    async readFromDisk(filePath) {
        try {
            return await fs.readFile(filePath);
        } catch (error) {
            throw new Error(`Impossibile leggere il file: ${error.message}`);
        }
    }

    /**
     * Rileva automaticamente il tipo di documento dall'estensione
     */
    detectDocumentType(source) {
        const ext = path.extname(source.toLowerCase()).substring(1);
        
        if (this.supportedFormats.includes(ext)) {
            return ext;
        }
        
        // Default per file senza estensione chiara
        return 'txt';
    }

    /**
     * Estrae il testo in base al tipo di documento
     */
    async extractByType(content, type, options = {}) {
        switch (type.toLowerCase()) {
            case 'html':
                return this.extractFromHtml(content, options);
            case 'pdf':
                return await this.extractFromPdf(content, options);
            case 'docx':
                return await this.extractFromDocx(content, options);
            case 'txt':
                return this.extractFromTxt(content, options);
            default:
                throw new Error(`Tipo di documento non supportato: ${type}`);
        }
    }

    /**
     * Estrazione da HTML
     */
    extractFromHtml(content, options = {}) {
        const $ = cheerio.load(content);
        
        // Rimuovi script e style
        $('script, style').remove();
        
        // Estrai il testo dal body o dall'intero documento
        const selector = options.selector || 'body';
        let text;
        
        if (options.preserveStructure || options.multiline) {
            // Modalità multi-riga: preserva la struttura del testo
            text = this.extractWithStructure($, selector, options);
        } else {
            // Modalità tradizionale: testo su una singola riga
            text = $(selector).text();
            text = text.replace(/\s+/g, ' ').trim();
        }
        
        return text;
    }

    /**
     * Estrae il testo HTML preservando la struttura multi-riga
     */
    extractWithStructure($, selector, options = {}) {
        const element = $(selector);
        let text = '';
        
        // Opzioni per la formattazione
        const lineBreakTags = options.lineBreakTags || ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'];
        const doubleBreakTags = options.doubleBreakTags || ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'];
        const preserveIndentation = options.preserveIndentation || false;
        
        // Funzione ricorsiva per elaborare i nodi
        const processNode = (node, depth = 0) => {
            const $node = $(node);
            const tagName = node.tagName ? node.tagName.toLowerCase() : null;
            
            if (node.type === 'text') {
                // Nodo di testo
                let textContent = $(node).text();
                
                if (preserveIndentation && depth > 0) {
                    // Aggiungi indentazione basata sulla profondità
                    const indent = '  '.repeat(depth - 1);
                    textContent = textContent.replace(/^/gm, indent);
                }
                
                // Pulisci spazi eccessivi ma mantieni le nuove righe
                textContent = textContent.replace(/[ \t]+/g, ' ');
                
                return textContent;
            } else if (node.type === 'tag') {
                let result = '';
                
                // Aggiungi interruzione di riga prima di alcuni tag
                if (lineBreakTags.includes(tagName) && text.length > 0) {
                    if (doubleBreakTags.includes(tagName)) {
                        result += '\n\n';
                    } else {
                        result += '\n';
                    }
                }
                
                // Tag speciali
                if (tagName === 'br') {
                    return '\n';
                } else if (tagName === 'hr') {
                    return '\n---\n';
                } else if (['ul', 'ol'].includes(tagName)) {
                    result += '\n';
                }
                
                // Processa i figli
                $node.contents().each((i, child) => {
                    result += processNode(child, depth + 1);
                });
                
                // Aggiungi interruzione di riga dopo alcuni tag
                if (lineBreakTags.includes(tagName)) {
                    if (doubleBreakTags.includes(tagName)) {
                        result += '\n';
                    }
                } else if (['li'].includes(tagName)) {
                    result += '\n';
                }
                
                return result;
            }
            
            return '';
        };
        
        // Processa l'elemento selezionato
        element.contents().each((i, node) => {
            text += processNode(node);
        });
        
        // Pulizia finale
        text = text
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Riduci triple+ newline a doppie
            .replace(/^\s+|\s+$/g, '') // Rimuovi spazi all'inizio e alla fine
            .replace(/[ \t]+$/gm, ''); // Rimuovi spazi trailing su ogni riga
        
        return text;
    }

    /**
     * Estrazione da PDF
     */
    async extractFromPdf(content, options = {}) {
        try {
            // Se è richiesto OCR avanzato, usa il sistema immagini + OCR
            if (options.useOCR) {
                console.log('🔄 Utilizzando estrazione OCR avanzata...');
                
                const ocrResult = await this.pdfOCRExtractor.extractWithOCR(content, {
                    language: options.ocrLanguage || 'eng+ita',
                    detectColumns: options.detectColumns !== false,
                    enhanceImage: options.enhanceImage !== false,
                    dpi: options.dpi || 300,
                    keepImages: options.keepImages || false,
                    pageRange: options.pageRange || null,
                    columnsCount: options.columnsCount || 'auto',
                    columnSeparator: options.columnSeparator || '\n\n--- COLONNA ---\n\n',
                    ...options.ocrOptions
                });
                
                if (!ocrResult.success) {
                    throw new Error('Estrazione OCR fallita');
                }
                
                console.log(`✅ OCR completato - Confidenza: ${ocrResult.confidence}% - Colonne: ${ocrResult.columnInfo?.columns || 1}`);
                return ocrResult.text;
            }
            let text;
            // Estrazione tradizionale con pdf-parse
            const data = await pdfParse(content, {
                max: options.maxPages || 0,
                version: options.version || 'v1.10.100'
            });
            text = data.text;
            if (options.cleanText !== false) {
                const cleanOptions = {
                    fixOCR: options.fixOCR !== false,
                    fixHyphenation: options.fixHyphenation !== false,
                    normalizeSpaces: options.normalizeSpaces !== false,
                    customCorrections: options.customCorrections || new Map(),
                    ...options.cleanOptions
                };
                
                text = this.pdfCleaner.cleanText(text, cleanOptions);
                
                // Analizza la qualità se richiesto
                if (options.analyzeQuality) {
                    const analysis = this.pdfCleaner.analyzeTextQuality(text);
                    console.log(`📊 Qualità testo PDF: ${analysis.confidence}%`);
                    if (analysis.suspiciousPatterns.length > 0) {
                        console.log('⚠️  Pattern sospetti trovati:', analysis.suspiciousPatterns.map(p => p.name).join(', '));
                    }
                }
            }
            return text;
        } catch (error) {
            throw new Error(`Errore nell'estrazione PDF: ${error.message}`);
        }
    }

    /**
     * Estrazione da DOCX
     */
    async extractFromDocx(content, options = {}) {
        try {
            const result = await mammoth.extractRawText({ buffer: content }, options);
            return result.value;
        } catch (error) {
            throw new Error(`Errore nell'estrazione DOCX: ${error.message}`);
        }
    }

    /**
     * Estrazione da TXT
     */
    extractFromTxt(content, options = {}) {
        const encoding = options.encoding || 'utf8';
        return content.toString(encoding);
    }

    /**
     * Salva il testo estratto su disco
     */
    async saveExtractedText(text, outputPath) {
        try {
            // Crea la directory se non esiste
            const dir = path.dirname(outputPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Salva il file
            await fs.writeFile(outputPath, text, 'utf8');
            
            console.log(`Testo salvato in: ${outputPath}`);
        } catch (error) {
            throw new Error(`Errore nel salvataggio: ${error.message}`);
        }
    }

    /**
     * Elabora più documenti in batch
     */
    async extractBatch(configArray) {
        const results = [];
        
        for (const config of configArray) {
            const result = await this.extractText(config);
            results.push(result);
        }
        
        return results;
    }
}

// Funzione di utilità per creare una nuova istanza
function createExtractor() {
    return new DocumentTextExtractor();
}

// Esempio di utilizzo
async function example() {
    const extractor = createExtractor();
    
    // Configurazione per un singolo documento
    const config = {
        source: "https://example.com/document.html", // o "/path/to/document.pdf"
        output: "./output/extracted_text.txt",
        type: "html", // opzionale, viene auto-rilevato
        options: {
            selector: "main", // per HTML, estrai solo dal tag main
            multiline: true, // preserva la struttura multi-riga
            preserveIndentation: false, // mantieni indentazione basata su nesting
            lineBreakTags: ['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'],
            doubleBreakTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] // doppio a capo
        }
    };
    
    const result = await extractor.extractText(config);
    console.log(result);
    
    // Esempio di batch processing
    const batchConfig = [
        {
            source: "./documents/doc1.pdf",
            output: "./output/doc1.txt"
        },
        {
            source: "https://example.com/doc2.html",
            output: "./output/doc2.txt",
            options: { selector: "article" }
        }
    ];
    
    const batchResults = await extractor.extractBatch(batchConfig);
    console.log(batchResults);
}

// Export per uso come modulo
module.exports = {
    DocumentTextExtractor,
    createExtractor
};