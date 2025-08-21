/**
 * Parser specializzato per documenti legali/normativi
 * Estrae la struttura gerarchica: CAPO I/II/III... → Articolo 1/2/3...
 */

class LegalDocumentParser {
    constructor() {
        // Pattern regex per riconoscere i vari elementi
        this.patterns = {
            // CAPO con numerazione romana (case insensitive, con possibili spazi)
            capo: /^[\s]*CAPO\s+([IVXLCDM]+)(?:\s*[-–—]\s*(.*))?$/gmi,
            
            // Articolo con numerazione (supporta vari formati)
            articolo: /^[\s]*(?:Art\.?\s*|Articolo\s+)(\d+)(?:\s*[-–—]\s*(.*))?$/gmi,
            
            // Varianti per maggiore flessibilità
            capoAlt: /^[\s]*(?:CAPITOLO|CAP\.?)\s+([IVXLCDM]+)(?:\s*[-–—]\s*(.*))?$/gmi,
            articoloAlt: /^[\s]*(?:ART\.?\s*|Art\.\s*)(\d+)(?:\s*[-–—]\s*(.*))?$/gmi
        };
    }

    /**
     * Analizza il testo e restituisce la struttura JSON
     * @param {string} text - Testo del documento
     * @param {Object} options - Opzioni di parsing
     * @returns {Object} Struttura JSON con capi e articoli
     */
    parseDocument(text, options = {}) {
        const config = {
            includeRawText: options.includeRawText || false,
            trimWhitespace: options.trimWhitespace !== false,
            minArticleLength: options.minArticleLength || 10,
            skipEmptyArticles: options.skipEmptyArticles !== false,
            ...options
        };

        // Dividi il testo in righe
        const lines = text.split(/\r?\n/);
        
        // Struttura risultato
        const document = {
            metadata: {
                totalCapi: 0,
                totalArticoli: 0,
                parsedAt: new Date().toISOString(),
                options: config
            },
            capi: []
        };

        let currentCapo = null;
        let currentArticolo = null;
        let contentBuffer = [];

        // Analizza riga per riga
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Salta righe vuote se non stiamo raccogliendo contenuto
            if (!trimmedLine && contentBuffer.length === 0) {
                continue;
            }

            // Controlla se è un CAPO
            const capoMatch = this.matchCapo(trimmedLine);
            if (capoMatch) {
                // Salva il contenuto precedente
                this.saveCurrentContent(currentArticolo, contentBuffer, config);
                
                // Crea nuovo capo
                currentCapo = {
                    numero: capoMatch.numero,
                    numeroRomano: capoMatch.numeroRomano,
                    titolo: capoMatch.titolo || '',
                    articoli: []
                };
                
                document.capi.push(currentCapo);
                document.metadata.totalCapi++;
                
                currentArticolo = null;
                contentBuffer = [];
                continue;
            }

            // Controlla se è un ARTICOLO
            const articoloMatch = this.matchArticolo(trimmedLine);
            if (articoloMatch) {
                // Salva il contenuto precedente
                this.saveCurrentContent(currentArticolo, contentBuffer, config);
                
                // Crea nuovo articolo
                if (!currentCapo) {
                    // Se non c'è un capo corrente, creane uno di default
                    currentCapo = {
                        numero: 0,
                        numeroRomano: '',
                        titolo: 'Disposizioni preliminari',
                        articoli: []
                    };
                    document.capi.push(currentCapo);
                    document.metadata.totalCapi++;
                }
                
                currentArticolo = {
                    numero: parseInt(articoloMatch.numero),
                    titolo: articoloMatch.titolo || '',
                    contenuto: ''
                };
                
                currentCapo.articoli.push(currentArticolo);
                document.metadata.totalArticoli++;
                
                contentBuffer = [];
                continue;
            }

            // Aggiungi la riga al buffer del contenuto
            if (currentArticolo) {
                contentBuffer.push(line);
            }
        }

        // Salva l'ultimo contenuto
        this.saveCurrentContent(currentArticolo, contentBuffer, config);
        
        // Post-processing
        this.postProcess(document, config);
        
        return document;
    }

    /**
     * Cerca pattern di CAPO nel testo
     */
    matchCapo(line) {
        // Prova pattern principale
        let match = line.match(this.patterns.capo);
        if (!match) {
            // Prova pattern alternativo
            match = line.match(this.patterns.capoAlt);
        }
        
        if (match) {
            const numeroRomano = match[1];
            return {
                numeroRomano: numeroRomano,
                numero: this.romanToArabic(numeroRomano),
                titolo: match[2] ? match[2].trim() : ''
            };
        }
        
        return null;
    }

    /**
     * Cerca pattern di ARTICOLO nel testo
     */
    matchArticolo(line) {
        // Prova pattern principale
        let match = line.match(this.patterns.articolo);
        if (!match) {
            // Prova pattern alternativo
            match = line.match(this.patterns.articoloAlt);
        }
        
        if (match) {
            return {
                numero: match[1],
                titolo: match[2] ? match[2].trim() : ''
            };
        }
        
        return null;
    }

    /**
     * Converte numeri romani in arabi
     */
    romanToArabic(roman) {
        const romanNumerals = {
            'I': 1, 'V': 5, 'X': 10, 'L': 50,
            'C': 100, 'D': 500, 'M': 1000
        };
        
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
            const current = romanNumerals[roman[i]];
            const next = romanNumerals[roman[i + 1]];
            
            if (next && current < next) {
                result += next - current;
                i++; // Salta il prossimo carattere
            } else {
                result += current;
            }
        }
        
        return result;
    }

    /**
     * Salva il contenuto corrente nell'articolo
     */
    saveCurrentContent(articolo, contentBuffer, config) {
        if (!articolo || contentBuffer.length === 0) {
            return;
        }
        
        let content = contentBuffer.join('\n');
        
        if (config.trimWhitespace) {
            content = content.trim();
        }
        
        // Salta articoli vuoti se richiesto
        if (config.skipEmptyArticles && content.length < config.minArticleLength) {
            return;
        }
        
        articolo.contenuto = content;
    }

    /**
     * Post-processing del documento
     */
    postProcess(document, config) {
        // Rimuovi articoli vuoti se richiesto
        if (config.skipEmptyArticles) {
            document.capi.forEach(capo => {
                capo.articoli = capo.articoli.filter(art => 
                    art.contenuto && art.contenuto.length >= config.minArticleLength
                );
            });
        }
        
        // Rimuovi capi senza articoli
        document.capi = document.capi.filter(capo => capo.articoli.length > 0);
        
        // Aggiorna i metadati
        document.metadata.totalCapi = document.capi.length;
        document.metadata.totalArticoli = document.capi.reduce(
            (total, capo) => total + capo.articoli.length, 0
        );
    }

    /**
     * Esporta in diversi formati
     */
    exportTo(document, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(document, null, 2);
            
            case 'markdown':
                return this.toMarkdown(document);
            
            case 'text':
                return this.toPlainText(document);
            
            default:
                throw new Error(`Formato non supportato: ${format}`);
        }
    }

    /**
     * Converte in Markdown
     */
    toMarkdown(document) {
        let md = `# Documento Analizzato\n\n`;
        md += `**Totale Capi:** ${document.metadata.totalCapi}\n`;
        md += `**Totale Articoli:** ${document.metadata.totalArticoli}\n\n`;
        
        document.capi.forEach(capo => {
            md += `## CAPO ${capo.numeroRomano}`;
            if (capo.titolo) {
                md += ` - ${capo.titolo}`;
            }
            md += `\n\n`;
            
            capo.articoli.forEach(articolo => {
                md += `### Articolo ${articolo.numero}`;
                if (articolo.titolo) {
                    md += ` - ${articolo.titolo}`;
                }
                md += `\n\n${articolo.contenuto}\n\n`;
            });
        });
        
        return md;
    }

    /**
     * Converte in testo semplice
     */
    toPlainText(document) {
        let text = '';
        
        document.capi.forEach(capo => {
            text += `CAPO ${capo.numeroRomano}`;
            if (capo.titolo) {
                text += ` - ${capo.titolo}`;
            }
            text += `\n${'='.repeat(50)}\n\n`;
            
            capo.articoli.forEach(articolo => {
                text += `Articolo ${articolo.numero}`;
                if (articolo.titolo) {
                    text += ` - ${articolo.titolo}`;
                }
                text += `\n${'-'.repeat(30)}\n`;
                text += `${articolo.contenuto}\n\n`;
            });
        });
        
        return text;
    }
}

// Funzione helper per uso semplice
function parseLegalDocument(text, options = {}) {
    const parser = new LegalDocumentParser();
    return parser.parseDocument(text, options);
}

// Esempio di utilizzo
function example() {
    const sampleText = `
CAPO I - Disposizioni generali

Articolo 1 - Finalità
La presente legge disciplina...

Articolo 2 - Ambito di applicazione
Si applica a tutti i soggetti...

CAPO II - Procedimento amministrativo

Articolo 3 - Avvio del procedimento
Il procedimento si avvia...

Articolo 4 - Termini
I termini per la conclusione...
    `;
    
    const parser = new LegalDocumentParser();
    const result = parser.parseDocument(sampleText, {
        includeRawText: false,
        trimWhitespace: true,
        minArticleLength: 5
    });
    
    console.log(JSON.stringify(result, null, 2));
    
    // Esporta in markdown
    const markdown = parser.exportTo(result, 'markdown');
    console.log(markdown);
}

module.exports = {
    LegalDocumentParser,
    parseLegalDocument
};