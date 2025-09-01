function parseAnnexParts(annex, parsers) {
    // Regex per identificare le parti (Part I, II, III, ecc.)
    const regexPart = /^Part\s+([IVXLCDMABEF]+)\s*(.*)$/i;
    
    let hasParts = false;
    let parteCorrente = null;
    let linesContenuto = [];
    const parts = [];
    
    // Prima passata: controlla se esistono parti
    for (const line of annex.lines) {
        if (regexPart.test(line.trim())) {
            hasParts = true;
            break;
        }
    }
    
    // Se non ci sono parti, restituisce null
    if (!hasParts) {
        return null;
    }
    
    // Seconda passata: estrae le parti
    for (const line of annex.lines) {
        const lineTrimmed = line.trim();
        const matchPart = lineTrimmed.match(regexPart);
        
        if (matchPart) {
            // Salva la parte precedente se esiste
            if (parteCorrente) {
                const linesAnnex = linesContenuto.filter(r => r.length > 0);
                const parsed = parsers ? parsers.parseArticleSections(linesAnnex) : null;
                parts.push({
                    numero: parteCorrente.numero,
                    titolo: parteCorrente.titolo,
                    lines: linesAnnex,
                    parsed: parsed
                });
            }
            
            // Inizia nuova parte
            parteCorrente = {
                numero: matchPart[1],
                titolo: matchPart[2].trim()
            };
            linesContenuto = [];
        } else if (parteCorrente) {
            // Aggiungi line al contenuto della parte corrente
            linesContenuto.push(lineTrimmed);
        }
    }
    
    // Salva l'ultima parte
    if (parteCorrente) {
        const linesAnnex = linesContenuto.filter(r => r.length > 0);
        const parsed = parsers ? parsers.parseArticleSections(linesAnnex) : null;
        parts.push({
            numero: parteCorrente.numero,
            titolo: parteCorrente.titolo,
            lines: linesAnnex,
            parsed: parsed
        });
    }
    
    return {
        metadata: { 
            parser: "parseAnnexParts", 
            source: __filename,
        },
        numero: annex.numero,
        titolo: annex.titolo,
        parts: parts
    };
}

module.exports = { parseAnnexParts }