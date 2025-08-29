function parseAnnexContent(annexObject) {
    const struttura = {
        tipo: 'A', // A, B, o C
        contenuto: []
    };
    
    let elementoCorrente = null;
    let linesIntroduzione = [];
    let inLista = false;
    
    // Regex per identificare i diversi livelli
    const regexLivello1 = /^(\d+)\.\s+(.*)$/; // 1. Name and type...
    const regexLivello2 = /^\s+(\d+\.\d+)\s+(.*)$/; // 1.1 ececece
    const regexLetteraA = /^\s+([a-z])\)\s+(.*)$/; // a) bla bla
    const regexLetteraB = /^\s{8,}([a-z])\)\s+(.*)$/; // lettere più indentate per caso C
    
    for (const line of annexObject.lines) {
        // Controlla livello 1 (numeri principali)
        const matchLivello1 = line.match(regexLivello1);
        if (matchLivello1) {
            // Salva elemento precedente
            if (elementoCorrente) {
                struttura.contenuto.push(elementoCorrente);
            }
            
            // Nuovo elemento di livello 1
            elementoCorrente = {
                numero: matchLivello1[1],
                testo: matchLivello1[2],
                sottoelementi: []
            };
            inLista = true;
            continue;
        }
        
        // Controlla livello 2 (sottopunti numerici)
        const matchLivello2 = line.match(regexLivello2);
        if (matchLivello2 && elementoCorrente) {
            struttura.tipo = 'C'; // Ha sottopunti numerici
            elementoCorrente.sottoelementi.push({
                numero: matchLivello2[1],
                testo: matchLivello2[2],
                lettere: []
            });
            continue;
        }
        
        // Controlla lettere (più indentate per caso C)
        const matchLetteraB = line.match(regexLetteraB);
        if (matchLetteraB && elementoCorrente && elementoCorrente.sottoelementi.length > 0) {
            // Lettera sotto un sottopunto (caso C)
            const ultimoSottoelemento = elementoCorrente.sottoelementi[elementoCorrente.sottoelementi.length - 1];
            ultimoSottoelemento.lettere.push({
                lettera: matchLetteraB[1],
                testo: matchLetteraB[2]
            });
            continue;
        }
        
        // Controlla lettere normali (caso B)
        const matchLetteraA = line.match(regexLetteraA);
        if (matchLetteraA && elementoCorrente) {
            struttura.tipo = 'B'; // Ha lettere
            elementoCorrente.sottoelementi.push({
                lettera: matchLetteraA[1],
                testo: matchLetteraA[2]
            });
            continue;
        }
        
        // Se non siamo ancora in una lista, è introduzione
        if (!inLista) {
            linesIntroduzione.push(line.trim());
        }
    }
    
    // Salva ultimo elemento
    if (elementoCorrente) {
        struttura.contenuto.push(elementoCorrente);
    }
    
    // Aggiungi introduzione se presente
    if (linesIntroduzione.length > 0) {
        struttura.introduzione = linesIntroduzione.filter(r => r.length > 0);
    }
    
    return {
        metadata: { 
            parser: "parseAnnexContent", 
            source: __filename,
        },
        result: struttura,
    }
}

// Esempi di test
const casoA = [
    "The EU declaration contains the following information:",
    "1. Name and type of product",
    "2. Name and address of manufacturer"
];

const casoB = [
    "The EU declaration contains the following information:",
    "1. Name and type of product",
    "   a) bla bla",
    "   b) bla bla",
    "2. Name and address of manufacturer"
];

const casoC = [
    "The EU declaration contains the following information:",
    "1. Name and type of product",
    "    1.1 ececece",
    "        a) bla bla",
    "        b) bla bla",
    "    1.2 another sub",
    "2. Name and address of manufacturer"
];


async function main() {
    // Test dei tre casi
    console.log("Caso A (semplice):");
    console.log(JSON.stringify(parseAnnexContent(casoA), null, 2));

    console.log("\nCaso B (con lettere):");
    console.log(JSON.stringify(parseAnnexContent(casoB), null, 2));

    console.log("\nCaso C (con sottopunti e lettere):");
    console.log(JSON.stringify(parseAnnexContent(casoC), null, 2));
}

if (require.main === module) {
    main();
}

module.exports = { parseAnnexContent }

