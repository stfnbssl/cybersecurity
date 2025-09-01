const { parseAnnexParts } = require("./annex_parts_parser");

function parseChapterAnnexStructure(testo, parsers) {
    const lines = testo.split('\n');
    const result = {
        chapters: [],
        annexes: []
    };
    
    let sezioneCorrente = null;
    let linesContenuto = [];
    let stato = 'contenuto'; // 'contenuto', 'dopo_identificatore', 'dopo_titolo'
    
    // Regex per identificare CHAPTER e ANNEX
    const regexChapter = /^CHAPTER\s+([IVXLCDM]+)\s*$/;
    const regexAnnex = /^ANNEX\s+([IVXLCDM]+)\s*$/;
    const regexDirective = /HAS ADOPTED THIS DIRECTIVE/;

    // Prima scansione: controlla se esistono CHAPTER nel testo
    let hasChapters = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (regexChapter.test(line)) {
            hasChapters = true;
            break;
        }
    }
    
    let hasAnnexes = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (hasChapters) {
            // Controlla se è un nuovo CHAPTER
            const matchChapter = line.match(regexChapter);
            if (matchChapter) {
                // Salva la sezione precedente se esiste
                if (sezioneCorrente) {
                    aggiungiSezione(result, sezioneCorrente, linesContenuto, parsers);
                }
                // Inizia nuovo CHAPTER
                sezioneCorrente = {
                    tipo: 'chapter',
                    numero: matchChapter[1],
                    titolo: ''
                };
                linesContenuto = [];
                stato = 'dopo_identificatore';
                continue;
            }
        } else {
            // Se NON ci sono CHAPTER, cerca "HAS ADOPTED THIS DIRECTIVE"
            const matchDirective = line.match(regexDirective);
            if (matchDirective) {
                // Inizia nuovo CHAPTER
                sezioneCorrente = {
                    tipo: 'has_adopted_this_directive',
                    titolo: 'HAS ADOPTED THIS DIRECTIVE'
                };
                linesContenuto = [];
                stato = 'dopo_titolo';
                continue;
            }
        }
        
        // Controlla se è un nuovo ANNEX
        const matchAnnex = line.match(regexAnnex);
        if (matchAnnex) {
            hasAnnexes = true;
            // Salva la sezione precedente se esiste
            if (sezioneCorrente) {
                aggiungiSezione(result, sezioneCorrente, linesContenuto, parsers);
            }
            
            // Inizia nuovo ANNEX
            sezioneCorrente = {
                tipo: 'annex',
                numero: matchAnnex[1],
                titolo: ''
            };
            linesContenuto = [];
            stato = 'dopo_identificatore';
            continue;
        }
        
        // Gestione stati
        if (sezioneCorrente) {
            if (stato === 'dopo_identificatore') {
                if (line.length === 0) {
                    // Salta lines vuote dopo CHAPTER/ANNEX
                    continue;
                } else {
                    // Prima line non vuota è il titolo
                    sezioneCorrente.titolo = line;
                    stato = 'dopo_titolo';
                    continue;
                }
            } else if (stato === 'dopo_titolo') {
                if (line.length === 0) {
                    // Salta lines vuote dopo il titolo
                    continue;
                } else {
                    // Inizia il contenuto
                    stato = 'contenuto';
                    linesContenuto.push(line);
                }
            } else if (stato === 'contenuto') {
                // Aggiungi tutte le lines al contenuto (anche vuote)
                linesContenuto.push(line);
            }
        }
    }
    
    // Salva l'ultima sezione
    if (sezioneCorrente) {
        aggiungiSezione(result, sezioneCorrente, linesContenuto, parsers);
    }
    
    return {
        metadata: { 
            parser: "parseChapterAnnexStructure", 
            source: __filename,
            chapters: result.chapters.length,
            annexes: result.annexes.length,
        },
        result: result,
    };
}

function aggiungiSezione(result, sezione, linesContenuto, parsers) {
    const oggettoSezione = {
        numero: sezione.numero,
        titolo: sezione.titolo,
        lines: linesContenuto.filter(line => line.length > 0) // Rimuove lines vuote
    };
    
    if (sezione.tipo === 'chapter' || sezione.tipo === 'has_adopted_this_directive') {
        oggettoSezione.articles = parsers.parseArticles(oggettoSezione.lines, parsers)
        result.chapters.push(oggettoSezione);
    } else if (sezione.tipo === 'annex') {
        oggettoSezione.parts = parsers.parseAnnexParts(oggettoSezione, parsers);
        if (oggettoSezione.parts == null) {
            oggettoSezione.parsed = parsers.parseAnnexContent(oggettoSezione, parsers);
        }
        result.annexes.push(oggettoSezione);
    }
}

// Funzione di utilità per convertire numeri romani in decimali
function romanoADecimale(romano) {
    const valori = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    };
    
    let result = 0;
    for (let i = 0; i < romano.length; i++) {
        const corrente = valori[romano[i]];
        const prossimo = valori[romano[i + 1]];
        
        if (prossimo && corrente < prossimo) {
            result += prossimo - corrente;
            i++; // Salta il prossimo carattere
        } else {
            result += corrente;
        }
    }
    
    return result;
}


// Esempio di utilizzo
const testoEsempio = `
PREAMBLE TEXT HERE

CHAPTER I

  GENERAL PROVISIONS
  
Article 1
This regulation applies...

Article 2
For the purposes of this regulation...

CHAPTER II

  SPECIFIC REQUIREMENTS
  
Article 3
Member States shall...

Article 4
The Commission may...

ANNEX I

  TECHNICAL SPECIFICATIONS
  
1. General requirements
2. Specific parameters

ANNEX II

  LIST OF APPROVED STANDARDS
  
ISO 9001:2015
ISO 27001:2013
`;

async function main() {
    // Test della funzione
    console.log("Esempio di parsing:");
    console.log(JSON.stringify(parseChapterAnnexStructure(testoEsempio), null, 2));
    function aggiungiSezione(result, sezione, linesContenuto) {
        const oggettoSezione = {
            numero: sezione.numero,
            titolo: sezione.titolo,
            lines: linesContenuto.filter(line => line.length > 0) // Rimuove lines vuote
        };
        
        if (sezione.tipo === 'chapter') {
            result.chapters.push(oggettoSezione);
        } else if (sezione.tipo === 'annex') {
            oggettoSezione.parts = parseAnnexParts(oggettoSezione);
            result.annexes.push(oggettoSezione);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseChapterAnnexStructure }
