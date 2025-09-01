// Regex per estrarre il paragrafo che termina con i due punti
const regexParagrafoConDuePunti = /^(.*?):\s*$/m;

// Funzione che divide correttamente i paragrafi e estrae quello con i due punti
function extractSemicololnParagraph(testo) {
    // Regex per identificare veri punti di fine paragrafo:
    // - preceduti da almeno 1 carattere alfabetico
    // - seguiti da spazi/a capo e lettera maiuscola (o fine testo)
    const regexPuntoFineParagrafo = /([a-zA-Z])\.\s*\n?\s*([A-Z])/g;
    
    // Trova tutti i punti che sono veri separatori di paragrafo
    const puntiSeparatori = [];
    let match;
    
    while ((match = regexPuntoFineParagrafo.exec(testo)) !== null) {
        // Trova dove inizia la lettera maiuscola del paragrafo successivo
        const inizioProssimoParagrafo = testo.indexOf(match[2], match.index);
        puntiSeparatori.push(inizioProssimoParagrafo);
    }
    
    // Se non ci sono punti separatori, tutto il testo è un paragrafo
    if (puntiSeparatori.length === 0) {
        const testoTrimmed = testo.trim();
        return testoTrimmed.endsWith(':') ? testoTrimmed : null;
    }
    
    // Estrai l'ultimo paragrafo
    const inizioUltimoParagrafo = puntiSeparatori[puntiSeparatori.length - 1];
    const ultimoParagrafo = testo.substring(inizioUltimoParagrafo).trim();
    
    return ultimoParagrafo.endsWith(':') ? ultimoParagrafo : null;
}

// Funzione alternativa usando regex per il caso più semplice
function estraiConRegex(testo) {
    const match = testo.match(/^(.*?):\s*$/m);
    return match ? match[1].trim() + ':' : null;
}

function analyzeTextForRelevance(text) {
  // Keywords for manufacturers/integrators (expand as needed)
  const relevantKeywordsRegex = /manufacturer|producer|importer|distributor|integrator|system integrator/i;
  
  // Prescriptive verbs (mandatory obligations in EU norms)
  const prescriptiveVerbsRegex = /shall|must|is required to|has to/i;
  
  // Exclusion for state-level (e.g., Member States obligations)
  const stateExclusionRegex = /Member States|The Commission|the Commission/i;
  
  // Trova il primo verbo prescrittivo nel testo
  const prescriptiveMatch = text.match(prescriptiveVerbsRegex);
  
  if (!prescriptiveMatch) {
    // Nessun verbo prescrittivo trovato
    return false;
  }
  
  // Estrai la parte del testo che precede il verbo prescrittivo
  const precedingText = text.substring(0, prescriptiveMatch.index);
  
  // Verifica se il testo precedente contiene esclusioni a livello statale
  if (stateExclusionRegex.test(precedingText)) {
    // È un'obbligazione a livello statale, quindi non rilevante per manufacturers/integrators
    return false;
  }
  
  // Verifica se il testo precedente contiene parole chiave rilevanti
  return relevantKeywordsRegex.test(precedingText);
}

async function main() {
    const esempio1 = `For the purposes of ... member. If such a Member State ... the Union.
    Where a manufacturer has no ... to the manufacturer:`;

    const esempio2 = `This regulation applies to products worth 1.000 euros or more. Where a manufacturer has registered under Art. 5.2 of the directive:`;

    const esempio3 = `Simple text without proper ending. No colon here.`;

    const esempio4 = `Multiple sentences here. Another one follows. Final sentence with colon:`;

    // Test della funzione
    console.log("Esempio 1:");
    console.log('"' + (extractSemicololnParagraph(esempio1) || 'null') + '"');

    console.log("\nEsempio 2 (con numeri 1.000 e Art. 5.2):");
    console.log('"' + (extractSemicololnParagraph(esempio2) || 'null') + '"');

    console.log("\nEsempio 3 (senza due punti):");
    console.log('"' + (extractSemicololnParagraph(esempio3) || 'null') + '"');

    console.log("\nEsempio 4 (ultimo paragrafo con due punti):");
    console.log('"' + (extractSemicololnParagraph(esempio4) || 'null') + '"');

    // Esempi di utilizzo:
    console.log("Test 1:");
    const text1 = "The manufacturer shall comply with all safety requirements";
    console.log(`"${text1}" -> ${analyzeTextForRelevance(text1)}`); // true

    console.log("\nTest 2:");
    const text2 = "Member States shall implement these regulations by 2024";
    console.log(`"${text2}" -> ${analyzeTextForRelevance(text2)}`); // false

    console.log("\nTest 3:");
    const text3 = "System integrators must ensure proper documentation";
    console.log(`"${text3}" -> ${analyzeTextForRelevance(text3)}`); // true

    console.log("\nTest 4:");
    const text4 = "The general public shall have access to information";
    console.log(`"${text4}" -> ${analyzeTextForRelevance(text4)}`); // false

    console.log("\nTest 5:");
    const text5 = "Any distributor of electronic devices is required to maintain records";
    console.log(`"${text5}" -> ${analyzeTextForRelevance(text5)}`); // true    

    console.log("\nTest 6:");
    const text6 = "A Member State which has concerns about a safety component being listed or not listed in Annex II shall immediately inform the Commission of its concerns and provide reasons in support thereof.";
    console.log(`"${text6}" -> ${analyzeTextForRelevance(text6)}`); // true    
}

if (require.main === module) {
    main();
}

module.exports = { 
    extractSemicololnParagraph,
    analyzeTextForRelevance
}
