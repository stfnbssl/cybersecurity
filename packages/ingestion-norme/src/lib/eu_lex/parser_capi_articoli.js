const path = require('path');
const {ensureDirSync, readTextSync, writeJSONSync} = require('../utils');
const {parseArticleSections} = require('./single_article_parser');

/**
 * Converte numeri romani in numeri arabi
 */
function romanoToArabo(romano) {
    const valori = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50, 
        'C': 100, 'D': 500, 'M': 1000
    };
    
    let result = 0;
    let precedente = 0;
    
    for (let i = romano.length - 1; i >= 0; i--) {
        const corrente = valori[romano[i]];
        if (corrente < precedente) {
            result -= corrente;
        } else {
            result += corrente;
        }
        precedente = corrente;
    }
    
    return result;
}

/**
 * Analizza il testo e crea una struttura JSON con Capi e Articoli
 * @param {Object} opzioni - Opzioni di configurazione
 * @param {string} opzioni.sourceFile - Path del file di input
 * @param {string} opzioni.outJsonFile - Path del file JSON di output
 * @param {string} [opzioni.tipo='con_capi'] - Tipo di documento: 'con_capi' o 'solo_articoli'
 * @param {string} [opzioni.terminatoreContenuto='Fatto a Strasburgo'] - Stringa dove fermare il parsing
 */
async function parseCapiArticoli(opzioni) {
    try {
        // Leggi il file di input
        let testoCompleto = readTextSync(opzioni.sourceFile);
        
        // Rimuovi tutto dal terminatore in poi (default: "Fatto a Strasburgo")
        const terminatore = opzioni.terminatoreContenuto || 'Fatto a Strasburgo';
        const indiceTerminatore = testoCompleto.indexOf(terminatore);
        if (indiceTerminatore !== -1) {
            testoCompleto = testoCompleto.substring(0, indiceTerminatore);
            console.log(`✂️ Testo troncato a "${terminatore}"`);
        }
        
        // Determina il tipo di parsing
        const tipoDocumento = opzioni.tipo || 'con_capi';
        console.log(`📖 Tipo documento: ${tipoDocumento}`);
        
        if (tipoDocumento === 'solo_articoli') {
            return await parseSoloArticoli(testoCompleto, opzioni);
        } else {
            return await parseConCapi(testoCompleto, opzioni);
        }
        
    } catch (errore) {
        console.error('❌ Errore durante il parsing:', errore.message);
        throw errore;
    }
}

/**
 * Parser per documenti con CAPI e ARTICOLI
 */
async function parseConCapi(testoCompleto, opzioni) {
    // Struttura dati risultante
    const documento = {
        tipo: 'con_capi',
        capi: []
    };
        
        // Pattern regex per identificare Capi e Articoli
        const regexCapo = /^CHAPTER\s+([IVXLCDM]+)(?:\s*[-–—]\s*(.*))?$/gmi;
        const regexArticle = /^Article\s+(\d+)(?:\s*[-–—]\s*(.*))?$/gmi;
        
        // Normalizza i line endings
        const testoNormalizzato = testoCompleto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Debug: verifica la presenza dei CHAPTER (regex più inclusiva)
        const testCapo = testoNormalizzato.match(/CHAPTER\s+[IVXLCDM]+/gi);
        console.log('🔍 CHAPTER trovati nel testo:', testCapo);
        
        // Test specifico per IX
        const testIX = testoNormalizzato.includes('CHAPTER IX');
        console.log('🔍 Test CHAPTER IX presente:', testIX);
        
        // Dividi in righe
        const righe = testoNormalizzato.split('\n');
        
        // Approccio alternativo: trova tutte le posizioni dei CHAPTER con regex più ampia
        const indiciCapo = [];
        
        righe.forEach((riga, indice) => {
            // Regex più inclusiva per catturare tutti i possibili numeri romani
            if (/^\s*CHAPTER\s+[IVXLCDM]+\s*$/i.test(riga.trim())) {
                indiciCapo.push(indice);
                console.log(`📍 Trovato CHAPTER alla riga ${indice + 1}: "${riga.trim()}"`);
            }
        });
        
        if (indiciCapo.length === 0) {
            throw new Error('Nessun CHAPTER trovato nel testo');
        }
        
        // Crea le sezioni basandosi sugli indici
        const sezioniValide = [];
        
        for (let i = 0; i < indiciCapo.length; i++) {
            const inizioSezione = indiciCapo[i];
            const fineSezione = i < indiciCapo.length - 1 ? indiciCapo[i + 1] : righe.length;
            
            const righeSezione = righe.slice(inizioSezione, fineSezione);
            const testoSezione = righeSezione.join('\n').trim();
            
            if (testoSezione.length > 0) {
                sezioniValide.push(testoSezione);
                console.log(`📄 Sezione ${i + 1}: ${righeSezione[0].trim()}`);
            }
        }
        
        for (const sezione of sezioniValide) {
            const righe = sezione.trim().split('\n').map(r => r.trim()).filter(r => r.length > 0);
            
            // Cerca l'intestazione del CHAPTER (prima riga non vuota)
            if (righe.length === 0) continue;
            
            const matchCapo = righe[0].match(/^CHAPTER\s+([IVXLCDM]+)\s*$/i);
            
            if (matchCapo) {
                const numeroRomano = matchCapo[1];
                const numeroArabo = romanoToArabo(numeroRomano);
                
                // Il titolo del CHAPTER è sulla riga successiva (se presente e non è un articolo)
                let titoloCapo = '';
                let indiceInizioArticoli = 1;
                
                if (righe.length > 1 && !righe[1].match(/^Article\s+\d+$/i)) {
                    titoloCapo = righe[1].trim();
                    indiceInizioArticoli = 2;
                }
                
                console.log(`📚 Processando CHAPTER ${numeroRomano}: "${titoloCapo}"`);
                
                const capo = {
                    numero: numeroArabo,
                    numeroRomano: numeroRomano,
                    titolo: titoloCapo,
                    articoli: []
                };
                
                // Processa le righe rimanenti per trovare gli articoli
                let i = indiceInizioArticoli;
                while (i < righe.length) {
                    const riga = righe[i];
                    const matchArticle = riga.match(/^Article\s+(\d+)$/i);
                    
                    if (matchArticle) {
                        const numeroArticle = parseInt(matchArticle[1]);
                        let titoloArticle = '';
                        let contenutoArticle = '';
                        
                        // Il titolo dell'articolo è sulla riga successiva (se non è un altro articolo)
                        i++; // passa alla riga successiva
                        if (i < righe.length && !righe[i].match(/^Article\s+\d+$/i)) {
                            titoloArticle = righe[i].trim();
                            i++; // passa alla riga successiva
                        }
                        
                        // Raccogli il contenuto fino al prossimo articolo o fine sezione
                        const contenutoRighe = [];
                        while (i < righe.length && !righe[i].match(/^Article\s+\d+$/i)) {
                            contenutoRighe.push(righe[i]);
                            i++;
                        }
                        
                        contenutoArticle = contenutoRighe.join('\n').trim();
                        
                        console.log(`   📋 Article ${numeroArticle}: "${titoloArticle}"`);
                        
                        const articolo = {
                            numero: numeroArticle,
                            titolo: titoloArticle,
                            contenuto: contenutoArticle,
                            sections: parseArticleSections(contenutoRighe)
                        };
                        
                        capo.articles.push(articolo);
                    } else {
                        i++; // salta righe che non sono articoli
                    }
                }
                
                // Ordina gli articoli per numero
                capo.articoli.sort((a, b) => a.numero - b.numero);
                documento.capi.push(capo);
                
                console.log(`✅ CHAPTER ${numeroRomano} completato: ${capo.articles.length} articoli`);
            }
        }
        
        // Ordina i capi per numero
        documento.capi.sort((a, b) => a.numero - b.numero);
        
        // Salva il result nel file JSON
        ensureDirSync(opzioni.outJsonFile);
        writeJSONSync(opzioni.outJsonFile, documento);
        
        console.log(`✅ Parsing completato!`);
        console.log(`📁 File salvato: ${opzioni.outJsonFile}`);
        console.log(`📊 Trovati ${documento.capi.length} capi con un totale di ${documento.capi.reduce((acc, capo) => acc + capo.articles.length, 0)} articoli`);
        
        return documento;
}

/**
 * Parser per documenti con solo ARTICOLI (senza CAPI)
 */
async function parseSoloArticoli(testoNormalizzato, opzioni) {
    // Struttura dati risultante
    const documento = {
        tipo: 'solo_articoli',
        articles: []
    };
    
    console.log('📋 Parsing documento con solo articoli...');
    
    // Dividi in righe
    const righe = testoNormalizzato.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    
    // Processa le righe per trovare gli articoli
    let i = 0;
    while (i < righe.length) {
        const riga = righe[i];
        const matchArticle = riga.match(/^Article\s+(\d+)\s*$/i);
        
        if (matchArticle) {
            const numeroArticle = parseInt(matchArticle[1]);
            let titoloArticle = '';
            let contenutoArticle = '';
            
            // Il titolo dell'articolo è sulla riga successiva (se non è un altro articolo)
            i++; // passa alla riga successiva
            if (i < righe.length && !righe[i].match(/^Article\s+\d+$/i)) {
                titoloArticle = righe[i].trim();
                i++; // passa alla riga successiva
            }
            
            // Raccogli il contenuto fino al prossimo articolo o fine documento
            const contenutoRighe = [];
            while (i < righe.length && !righe[i].match(/^Article\s+\d+$/i)) {
                contenutoRighe.push(righe[i]);
                i++;
            }
            
            contenutoArticle = contenutoRighe.join('\n').trim();
            
            console.log(`   📋 Article ${numeroArticle}: "${titoloArticle}"`);
            
            const articolo = {
                numero: numeroArticle,
                titolo: titoloArticle,
                contenuto: contenutoArticle,
                paragrafi: parseContenutoArticle(contenutoArticle) // Analizza paragrafi, lettere, punti
            };
            
            documento.articles.push(articolo);
        } else {
            i++; // salta righe che non sono articoli
        }
    }
    
    // Ordina gli articles per numero
    documento.articles.sort((a, b) => a.numero - b.numero);
    
    // Salva il result nel file JSON
    ensureDirSync(opzioni.outJsonFile);
    writeJSONSync(opzioni.outJsonFile, documento);

    console.log(`✅ Parsing completato!`);
    console.log(`📁 File salvato: ${opzioni.outJsonFile}`);
    console.log(`📊 Trovati ${documento.articles.length} articoli`);
    
    return documento;
}

/**
 * Analizza il contenuto di un articolo per estrarre paragrafi, lettere e punti
 */
function parseContenutoArticle(contenuto) {
    if (!contenuto || contenuto.trim().length === 0) {
        return [];
    }
    
    const righe = contenuto.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    const struttura = [];
    
    for (const riga of righe) {
        // Identifica il tipo di elemento (paragrafo, lettera, punto)
        let tipo = 'testo';
        let numero = null;
        let testo = riga;
        
        // Paragrafo (es: "1.", "2.", etc.)
        const matchParagrafo = riga.match(/^(\d+)\.\s*(.*)$/);
        if (matchParagrafo) {
            tipo = 'paragrafo';
            numero = parseInt(matchParagrafo[1]);
            testo = matchParagrafo[2];
        }
        
        // Lettera (es: "a)", "b)", etc.)
        const matchLettera = riga.match(/^([a-z])\)\s*(.*)$/i);
        if (matchLettera) {
            tipo = 'lettera';
            numero = matchLettera[1].toLowerCase();
            testo = matchLettera[2];
        }
        
        // Punto (es: "i)", "ii)", etc. per numeri romani)
        const matchPunto = riga.match(/^([ivxlcdm]+)\)\s*(.*)$/i);
        if (matchPunto) {
            tipo = 'punto';
            numero = matchPunto[1].toLowerCase();
            testo = matchPunto[2];
        }
        
        struttura.push({
            tipo: tipo,
            numero: numero,
            testo: testo
        });
    }
    
    return struttura;
}

// Esempio d'uso
async function esempio() {
    const opzioni = {
        sourceFile: './input.txt',
        outJsonFile: './output.json'
    };
    
    try {
        const result = await parseCapiArticoli(opzioni);
        console.log('Struttura creata:', result);
    } catch (errore) {
        console.error('Errore:', errore);
    }
}

// Esporta la funzione principale
module.exports = { parseCapiArticoli };

// Se il file viene eseguito direttamente, esegui l'esempio
if (require.main === module) {
    esempio();
}