/**
 * Parser per articoli strutturati con paragrafi, lettere e punti
 */

class ArticleParser {
    constructor() {
        // Regex patterns per identificare i diversi livelli di struttura
        this.patterns = {
            // Paragrafi numerati: "1.", "2.", etc.
            paragraph: /^(\d+)\.\s+(.+)$/,
            // Lettere: "a)", "b)", etc. (solo lettere singole dell'alfabeto)
            letter: /^([a-z])\)\s*(.*)$/,
            // Punti romani: "i)", "ii)", "iii)", etc. (sequenze romane valide)
            romanPoint: /^(i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3}|xiv|xv|xvi{0,3}|xix|xx)\)\s*(.*)$/,
            // Linee di continuazione (non iniziano con numerazione)
            continuation: /^(?!\d+\.|[a-z]\)|(?:i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3}|xiv|xv|xvi{0,3}|xix|xx)\))(.+)$/
        };
    }

    /**
     * Verifica se una stringa è un numero romano valido
     */
    isValidRomanNumeral(str) {
        const validRomanNumerals = [
            'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
            'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'
        ];
        
        return validRomanNumerals.includes(str.toLowerCase());
    }

    /**
     * Converte numeri romani in decimali
     */
    romanToDecimal(roman) {
        const romanNumerals = {
            'i': 1, 'v': 5, 'x': 10, 'l': 50,
            'c': 100, 'd': 500, 'm': 1000
        };
        
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
            const current = romanNumerals[roman[i]];
            const next = romanNumerals[roman[i + 1]];
            
            if (next && current < next) {
                result += next - current;
                i++; // Skip next character
            } else {
                result += current;
            }
        }
        return result;
    }

    /**
     * Determina il tipo e il livello di una linea
     */
    analyzeLine(line) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
            return { type: 'empty', content: '' };
        }

        // Verifica paragrafo
        const paragraphMatch = trimmedLine.match(this.patterns.paragraph);
        if (paragraphMatch) {
            return {
                type: 'paragraph',
                level: 1,
                number: parseInt(paragraphMatch[1]),
                content: paragraphMatch[2].trim()
            };
        }

        // Verifica punto romano PRIMA della lettera per evitare conflitti
        const romanMatch = trimmedLine.match(this.patterns.romanPoint);
        if (romanMatch) {
            return {
                type: 'roman_point',
                level: 3,
                roman: romanMatch[1],
                number: this.romanToDecimal(romanMatch[1]),
                content: romanMatch[2].trim()
            };
        }

        // Verifica lettera (lettere dell'alfabeto a-z, escludendo numeri romani validi)
        const letterMatch = trimmedLine.match(this.patterns.letter);
        if (letterMatch && !this.isValidRomanNumeral(letterMatch[1])) {
            return {
                type: 'letter',
                level: 2,
                letter: letterMatch[1],
                content: letterMatch[2].trim()
            };
        }

        // Linea di continuazione
        const continuationMatch = trimmedLine.match(this.patterns.continuation);
        if (continuationMatch) {
            return {
                type: 'continuation',
                content: continuationMatch[1].trim()
            };
        }

        return {
            type: 'unknown',
            content: trimmedLine
        };
    }

    /**
     * Raggruppa le linee analizzate in una struttura gerarchica
     */
    buildStructure(analyzedLines) {
        const result = {
            type: 'article',
            paragraphs: []
        };

        let currentParagraph = null;
        let currentLetter = null;
        let currentPoint = null;

        for (const line of analyzedLines) {
            switch (line.type) {
                case 'paragraph':
                    // Nuovo paragrafo
                    currentParagraph = {
                        type: 'paragraph',
                        number: line.number,
                        content: line.content,
                        letters: []
                    };
                    result.paragraphs.push(currentParagraph);
                    currentLetter = null;
                    currentPoint = null;
                    break;

                case 'letter':
                    // Nuova lettera
                    if (currentParagraph) {
                        currentLetter = {
                            type: 'letter',
                            letter: line.letter,
                            content: line.content,
                            points: []
                        };
                        currentParagraph.letters.push(currentLetter);
                        currentPoint = null;
                    }
                    break;

                case 'roman_point':
                    // Nuovo punto romano
                    if (currentLetter) {
                        currentPoint = {
                            type: 'roman_point',
                            roman: line.roman,
                            number: line.number,
                            content: line.content
                        };
                        currentLetter.points.push(currentPoint);
                    }
                    break;

                case 'continuation':
                    // Continuazione del contenuto precedente
                    if (currentPoint) {
                        currentPoint.content = (currentPoint.content + ' ' + line.content).trim();
                    } else if (currentLetter) {
                        currentLetter.content = (currentLetter.content + ' ' + line.content).trim();
                    } else if (currentParagraph) {
                        currentParagraph.content = (currentParagraph.content + ' ' + line.content).trim();
                    }
                    break;

                case 'empty':
                    // Ignora le linee vuote
                    break;

                default:
                    // Linee sconosciute - aggiungi come continuazione
                    if (currentPoint) {
                        currentPoint.content = (currentPoint.content + ' ' + line.content).trim();
                    } else if (currentLetter) {
                        currentLetter.content = (currentLetter.content + ' ' + line.content).trim();
                    } else if (currentParagraph) {
                        currentParagraph.content = (currentParagraph.content + ' ' + line.content).trim();
                    }
            }
        }

        return result;
    }

    /**
     * Pulisce la struttura rimuovendo array vuoti
     */
    cleanStructure(structure) {
        for (const paragraph of structure.paragraphs) {
            if (paragraph.letters.length === 0) {
                delete paragraph.letters;
            } else {
                for (const letter of paragraph.letters) {
                    if (letter.points.length === 0) {
                        delete letter.points;
                    }
                }
            }
        }
        return structure;
    }

    /**
     * Funzione principale per il parsing
     */
    parse(articleText) {
        // Dividi il testo in linee
        const lines = articleText.split('\n');
        
        // Analizza ogni linea
        const analyzedLines = lines.map(line => this.analyzeLine(line));
        
        // Costruisci la struttura gerarchica
        const structure = this.buildStructure(analyzedLines);
        
        // Pulisci la struttura
        return this.cleanStructure(structure);
    }

    /**
     * Converte la struttura in JSON
     */
    toJSON(articleText) {
        const structure = this.parse(articleText);
        return JSON.stringify(structure, null, 2);
    }
}

// Funzione helper per l'uso diretto
function parseArticle(articleText) {
    const parser = new ArticleParser();
    return parser.parse(articleText);
}

function parseArticleToJSON(articleText) {
    const parser = new ArticleParser();
    return parser.toJSON(articleText);
}

// Export per CommonJS
module.exports = {
    ArticleParser,
    parseArticle,
    parseArticleToJSON
};

// Esempio d'uso con il testo fornito
if (require.main === module) {
    const sampleText = `1.   La presente direttiva si applica ai soggetti pubblici o privati delle tipologie di cui all'allegato I o II che sono considerati medie imprese ai sensi all'articolo 2, paragrafo 1, dell'allegato alla raccomandazione 2003/361/CE, o che superano i massimali per le medie imprese di cui al paragrafo 1 di tale articolo, e che prestano i loro servizi o svolgono le loro attività all'interno dell'Unione.
L'articolo 3, paragrafo 4, dell'allegato a tale raccomandazione non si applica ai fini della presente direttiva.
2.   La presente direttiva si applica anche ai soggetti, indipendentemente dalle loro dimensioni, delle tipologie di cui all'allegato I o II qualora:
a)
i servizi siano forniti da:
i)
fornitori di reti di comunicazione elettroniche pubbliche o di servizi di comunicazione elettronica accessibili al pubblico;
ii)
prestatore di servizi di fiducia;
iii)
registri dei nomi di dominio di primo livello e fornitori di servizi di sistema dei nomi di dominio;`;

    console.log('=== RISULTATO DEL PARSING ===');
    console.log(parseArticleToJSON(sampleText));
}