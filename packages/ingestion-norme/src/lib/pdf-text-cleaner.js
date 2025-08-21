/**
 * PDF Text Cleaner - Corregge errori comuni di OCR ed estrazione PDF
 */

class PDFTextCleaner {
    constructor() {
        // Dizionario di correzioni comuni OCR
        this.ocrCorrections = new Map([
            // Sostituzioni comuni OCR
            ['prm-idcs', 'provides'],
            ['prm·idcs', 'provides'],
            ['providcs', 'provides'],
            ['cmcrtainmcnt', 'entertainment'],
            ['entcrtainmcnt', 'entertainment'],
            ['entenainment', 'entertainment'],
            ['entenain­ment', 'entertainment'],
            ['elfecL"l', 'effects'],
            ['effecL"l', 'effects'],
            ['effecls', 'effects'],
            ['pm,ide', 'provide'],
            ['prmide', 'provide'],
            ['\\·ith', 'with'],
            ['\\·ithin', 'within'],
            ['coordinated "ith', 'coordinated with'],
            
            // Caratteri comuni mal interpretati
            ['·', '.'],
            ['"l', 'ts'],
            ['"', '"'],
            ['"', '"'],
            ['­', '-'], // soft hyphen
            ['–', '-'], // en dash
            ['—', '-'], // em dash
            
            // Pattern di sillabazione
            ['entenain­ment', 'entertainment'],
            ['experi­ence', 'experience'],
            ['informa­tion', 'information'],
            ['coordi­nated', 'coordinated']
        ]);

        // Pattern regex per correzioni più complesse
        this.regexCorrections = [
            // Rimuovi sillabazione con trattino a fine riga
            { pattern: /(\w+)­\s*\n\s*(\w+)/g, replacement: '$1$2' },
            { pattern: /(\w+)-\s*\n\s*(\w+)/g, replacement: '$1$2' },
            
            // Correggi spazi multipli
            { pattern: /\s{2,}/g, replacement: ' ' },
            
            // Correggi numeri di pagina isolati
            { pattern: /^\s*\(\d+\)\s*$/gm, replacement: '' },
            
            // Correggi pattern comuni OCR
            { pattern: /\b(\w+)L"(\w+)/g, replacement: '$1ts$2' },
            { pattern: /\b(\w+)m(\w+)/g, replacement: '$1in$2' },
            { pattern: /\bpm(\w+)/g, replacement: 'pro$1' },
            { pattern: /\bcm(\w+)/g, replacement: 'en$1' },
            
            // Correggi apostrofi
            { pattern: /(\w)'(\w)/g, replacement: '$1\'$2' },
            
            // Rimuovi caratteri di controllo strani
            { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, replacement: '' }
        ];
    }

    /**
     * Pulisce il testo estratto da PDF
     * @param {string} text - Testo grezzo da pulire
     * @param {Object} options - Opzioni di pulizia
     * @returns {string} Testo pulito
     */
    cleanText(text, options = {}) {
        const config = {
            fixOCR: options.fixOCR !== false,
            fixHyphenation: options.fixHyphenation !== false,
            normalizeSpaces: options.normalizeSpaces !== false,
            removePageNumbers: options.removePageNumbers !== false,
            fixEncoding: options.fixEncoding !== false,
            customCorrections: options.customCorrections || new Map(),
            ...options
        };

        let cleanedText = text;

        // 1. Correzioni encoding
        if (config.fixEncoding) {
            cleanedText = this.fixEncoding(cleanedText);
        }

        // 2. Correzioni OCR con dizionario
        if (config.fixOCR) {
            cleanedText = this.applyOCRCorrections(cleanedText, config.customCorrections);
        }

        // 3. Correzioni con regex
        if (config.fixHyphenation) {
            cleanedText = this.applyRegexCorrections(cleanedText);
        }

        // 4. Normalizzazione finale
        if (config.normalizeSpaces) {
            cleanedText = this.normalizeSpaces(cleanedText);
        }

        return cleanedText.trim();
    }

    /**
     * Corregge problemi di encoding
     */
    fixEncoding(text) {
        // Correzioni di encoding comuni
        const encodingFixes = [
            ['â€™', "'"],
            ['â€œ', '"'],
            ['â€', '"'],
            ['â€¦', '...'],
            ['â€"', '-'],
            ['â€"', '--'],
            ['Ã ', 'à'],
            ['Ã¡', 'á'],
            ['Ã©', 'é'],
            ['Ã­', 'í'],
            ['Ã³', 'ó'],
            ['Ãº', 'ú'],
            ['Ã±', 'ñ']
        ];

        let fixed = text;
        encodingFixes.forEach(([wrong, correct]) => {
            fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
        });

        return fixed;
    }

    /**
     * Applica correzioni OCR dal dizionario
     */
    applyOCRCorrections(text, customCorrections = new Map()) {
        let corrected = text;

        // Applica correzioni del dizionario base
        this.ocrCorrections.forEach((correct, wrong) => {
            const regex = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
            corrected = corrected.replace(regex, correct);
        });

        // Applica correzioni personalizzate
        // Gestisce sia Map che oggetti JavaScript
        if (customCorrections instanceof Map) {
            customCorrections.forEach((correct, wrong) => {
                const regex = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
                corrected = corrected.replace(regex, correct);
            });
        } else if (typeof customCorrections === 'object' && customCorrections !== null) {
            // Converte oggetto in Map e applica
            Object.entries(customCorrections).forEach(([wrong, correct]) => {
                const regex = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
                corrected = corrected.replace(regex, correct);
            });
        }

        return corrected;
    }

    /**
     * Applica correzioni con pattern regex
     */
    applyRegexCorrections(text) {
        let corrected = text;

        this.regexCorrections.forEach(correction => {
            corrected = corrected.replace(correction.pattern, correction.replacement);
        });

        return corrected;
    }

    /**
     * Normalizza spazi e formattazione
     */
    normalizeSpaces(text) {
        return text
            .replace(/\r\n/g, '\n')           // Normalizza line endings
            .replace(/\r/g, '\n')             // Mac line endings
            .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines
            .replace(/[ \t]+/g, ' ')          // Multiple spaces to single
            .replace(/[ \t]*\n[ \t]*/g, '\n') // Clean line boundaries
            .replace(/^\s+|\s+$/gm, '')       // Trim each line
            .trim();
    }

    /**
     * Escape caratteri speciali per regex
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Analizza la qualità del testo e suggerisce correzioni
     */
    analyzeTextQuality(text) {
        const analysis = {
            totalCharacters: text.length,
            suspiciousPatterns: [],
            confidence: 100,
            suggestions: []
        };

        // Cerca pattern sospetti
        const suspiciousPatterns = [
            { pattern: /\w+­\w+/g, name: 'Soft hyphens', impact: -5 },
            { pattern: /[""'']/g, name: 'Smart quotes', impact: -2 },
            { pattern: /\w+L"\w+/g, name: 'OCR L-quote errors', impact: -10 },
            { pattern: /\bpm\w+/g, name: 'OCR p-m errors', impact: -8 },
            { pattern: /\bcm\w+/g, name: 'OCR c-m errors', impact: -8 },
            { pattern: /\s{3,}/g, name: 'Multiple spaces', impact: -3 }
        ];

        suspiciousPatterns.forEach(({ pattern, name, impact }) => {
            const matches = text.match(pattern);
            if (matches) {
                analysis.suspiciousPatterns.push({
                    name,
                    count: matches.length,
                    examples: matches.slice(0, 3)
                });
                analysis.confidence += impact * matches.length;
            }
        });

        analysis.confidence = Math.max(0, Math.min(100, analysis.confidence));

        // Suggerimenti
        if (analysis.confidence < 80) {
            analysis.suggestions.push('Il testo sembra avere errori OCR significativi');
        }
        if (analysis.suspiciousPatterns.length > 0) {
            analysis.suggestions.push('Considera di applicare la pulizia automatica');
        }

        return analysis;
    }

    /**
     * Crea un dizionario di correzioni personalizzato dal testo
     */
    generateCustomCorrections(text, knownCorrections = {}) {
        const customMap = new Map();

        // Aggiungi correzioni note (supporta sia oggetti che Map)
        if (knownCorrections instanceof Map) {
            knownCorrections.forEach((correct, wrong) => {
                customMap.set(wrong, correct);
            });
        } else if (typeof knownCorrections === 'object' && knownCorrections !== null) {
            Object.entries(knownCorrections).forEach(([wrong, correct]) => {
                customMap.set(wrong, correct);
            });
        }

        // Auto-rileva pattern comuni nel testo specifico
        const autoDetected = this.autoDetectCorrections(text);
        autoDetected.forEach((correct, wrong) => {
            customMap.set(wrong, correct);
        });

        return customMap;
    }

    /**
     * Auto-rileva possibili correzioni basandosi su pattern
     */
    autoDetectCorrections(text) {
        const corrections = new Map();

        // Pattern per auto-correzione (molto basilari)
        const patterns = [
            { wrong: /\bthc\b/g, correct: 'the' },
            { wrong: /\bthat\b/g, correct: 'that' },
            { wrong: /\bwhcn\b/g, correct: 'when' },
            { wrong: /\bwherc\b/g, correct: 'where' }
        ];

        patterns.forEach(({ wrong, correct }) => {
            if (wrong.test(text)) {
                corrections.set(wrong.source.slice(3, -3), correct); // Remove \b flags
            }
        });

        return corrections;
    }
}

// Funzione helper per uso semplice
function cleanPDFText(text, options = {}) {
    const cleaner = new PDFTextCleaner();
    return cleaner.cleanText(text, options);
}

// Esempio di utilizzo
function example() {
    const dirtyText = `
    Entertainment Device. A mechanical or  electromechanical 
    device that prm-idcs an  cmcrtainmcnt experience. (522) 
    (CMP-15) 
    Informational :'\ote: These devices can include animated props, 
    show action  equipment, animated figures, and special elfecL"l, 
    coordinated "ith  audio and  lighting to pm,ide an  entenain­
    ment expe1ience.
    `;

    const cleaner = new PDFTextCleaner();
    
    // Analizza la qualità del testo
    const analysis = cleaner.analyzeTextQuality(dirtyText);
    console.log('Analisi qualità:', analysis);
    
    // Pulisci il testo
    const cleanText = cleaner.cleanText(dirtyText, {
        fixOCR: true,
        fixHyphenation: true,
        normalizeSpaces: true
    });
    
    console.log('Testo pulito:', cleanText);
}

module.exports = {
    PDFTextCleaner,
    cleanPDFText
};