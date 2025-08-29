function parseArticlesFromText(text, parsers) {
    const lines = text.split('\n');
    return parseArticles(lines, parsers);
}

function parseArticles(lines, parsers) {
    const articles = [];
    let articoloCorrente = null;
    let linesContenuto = [];
    
    // Regex per identificare un articolo
    const regexArticle = /^Article\s+(\d+)$/i;
    
    for (const line of lines) {
        const lineTrimmed = line.trim();
        
        // Controlla se è un nuovo articolo
        const matchArticle = lineTrimmed.match(regexArticle);
        if (matchArticle) {
            // Salva l'articolo precedente se esiste
            if (articoloCorrente) {
                const linesArticle = linesContenuto.filter(r => r.length > 0);
                const parsed = parsers ? parsers.parseArticleSections(linesArticle) : null;
                articles.push({
                    number: articoloCorrente.number,
                    title: articoloCorrente.title,
                    lines: linesArticle,
                    parsed: parsed
                });
            }
            
            // Inizia nuovo articolo
            articoloCorrente = {
                number: matchArticle[1],
                title: ''
            };
            linesContenuto = [];
            continue;
        }
        
        // Se abbiamo un articolo corrente
        if (articoloCorrente) {
            // Se il titolo è ancora vuoto, questa è la prima line dopo "Article X"
            if (articoloCorrente.title === '' && lineTrimmed.length > 0) {
                articoloCorrente.title = lineTrimmed;
                continue;
            }
            
            // Altrimenti aggiungi al contenuto (se il titolo è già stato impostato)
            if (articoloCorrente.title !== '') {
                linesContenuto.push(lineTrimmed);
            }
        }
    }
    
    // Salva l'ultimo articolo
    if (articoloCorrente) {
        const linesArticle = linesContenuto.filter(r => r.length > 0);
        const parsed = parsers ? parsers.parseArticleSections(linesArticle) : null;
        articles.push({
            number: articoloCorrente.number,
            title: articoloCorrente.title,
            lines: linesArticle,
            parsed: parsed
        });
    }
    return {
        metadata: { 
            parser: "parseArticles", 
            source: __filename,
            articles: articles.length
        },
        result: articles,
    }
}

// Esempio di utilizzo
const linesEsempio = [
    "Article 1",
    "Subject matter",
    "This Regulation lays down:",
    "(a)",
    "rules for the making available on the market of products with digital elements to ensure the cybersecurity of such products;",
    "(b)",
    "essential cybersecurity requirements for the design, development and production of products with digital elements, and obligations for economic operators in relation to those products with respect to cybersecurity;",
    "(c)",
    "essential cybersecurity requirements for the vulnerability handling processes put in place by manufacturers to ensure the cybersecurity of products with digital elements during the time the products are expected to be in use, and obligations for economic operators in relation to those processes;",
    "(d)",
    "rules on market surveillance, including monitoring, and enforcement of the rules and requirements referred to in this Article.",
    "Article 2",
    "Scope",
    "1.   This Regulation applies to products with digital elements made available on the market, the intended purpose or reasonably foreseeable use of which includes a direct or indirect logical or physical data connection to a device or network.",
    "2.   This Regulation does not apply to products with digital elements to which the following Union legal acts apply:",
    "(a)"
];

async function main() {
    // Test della funzione
    console.log("Articoli estratti:");
    console.log(JSON.stringify(parseArticles(linesEsempio), null, 2));
}

if (require.main === module) {
    main();
}

module.exports = { parseArticlesFromText, parseArticles }

