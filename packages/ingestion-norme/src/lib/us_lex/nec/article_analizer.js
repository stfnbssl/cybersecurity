const isDebug = true;
const changeTags = "NUAΔh\^";

function analizeArticle(article) {
    for (let i = 0; i < article.lines.length; i++) {
        const line = article.lines[i];
        const lineText = line.text.trim();
        if (!lineText) continue;
        // if (isDebug) console.log("Char codes:", [...lineText].map(c => c.charCodeAt(0)));
        line.indent = line.text.length - line.text.trimStart().length;
        line.text = line.text.trim()        
        const prevLine = article.lines[i-1];
        const nextLine = article.lines[i+1];
        if (lineText.length == 1 && changeTags.indexOf(lineText) > -1) {
            console.log("changeTags", lineText)
            nextLine.text = lineText + ' ' + nextLine.text.trim();
            line.deleted = true;
            continue;
        }
        const sectionMatch = lineText.match(/^([NUAΔh\^])?\s*(\d+)\.(\d+)\s+(.+)/);
        let falseMatch = prevLine && prevLine.text.toLowerCase().indexOf("see also") > -1;
        falseMatch = falseMatch || prevLine && prevLine.text.indexOf("Exhibit") > -1;
        if (sectionMatch && !falseMatch) {
            if(isDebug) console.log("match section", sectionMatch)
            let xTitle = sectionMatch.slice(4).join(' ');
        let title = xTitle;
            let index = xTitle.indexOf('.');
            if (index < 0) {
                if (nextLine) {
                    title += nextLine.text.trim();
                    nextLine.deleted = true;
                } // TODO if not ????
            } else {
                title = xTitle.substring(0, index);
                line.text = xTitle.substring(index+1).trim()
            }
            line.section = {
                changeType: sectionMatch[1],  
                articleNumber: sectionMatch[2],
                sectionNumber: sectionMatch[3],
                title: title,
            }
            
            continue;
        }
        const subSectionMatch = lineText.match(/^([NUAΔh\^])?\s*\(([A-Z])\)\s*(.+)/);
        if (subSectionMatch && !falseMatch) {        
            if(isDebug) console.log("1 subSectionMatch", subSectionMatch)
            const xTitle = subSectionMatch.slice(3).join(' ');
            let title = xTitle;
            let index = xTitle.indexOf('.');
            console.log('2 xTitle', xTitle, index, xTitle.substring(index+1).trim())
            if (index < 0) {
                /*
                if (nextLine) {
                    title += nextLine.text.trim();
                    nextLine.deleted = true;
                } // TODO if not ????
                */
               console.log('2');
            } else {
                console.log('3 xTitle', xTitle, index, xTitle.substring(index+1).trim())
                title = xTitle.substring(0, index);
                line.text = xTitle.substring(index+1).trim()
                console.log('4 line.text', line.text)
            }
            line.subSection = {
                changeType: subSectionMatch[1],  
                ordinal: subSectionMatch[2],
                title: title,
            }
            if(isDebug) console.log("line.subSection", line)
        }
        const paragraphMatch = lineText.match(/^([NUAΔh\^])?\s*\((\d+)\)\s*(.*)/);
        if (paragraphMatch && !falseMatch) {        
            if(isDebug) console.log("paragraphMatch", paragraphMatch)
            line.text = paragraphMatch.slice(3).join(' ').trim()
            line.paragraph = {
                changeType: paragraphMatch[1],
                ordinal: paragraphMatch[2]
            }
        }
    }
    assignParentIndex(article.lines);
}

function assignParentIndex(lines) {
    const stack = []; // Stack per tenere traccia degli indici dei parent
    
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        const currentIndent = currentLine.indent;
        
        // Rimuovi dal stack tutti i parent con indent maggiore o uguale al corrente
        while (stack.length > 0 && lines[stack[stack.length - 1]].indent >= currentIndent) {
            stack.pop();
        }
        
        // Assegna il parent (l'ultimo elemento nello stack se esiste)
        if (stack.length > 0) {
            currentLine.parent = stack[stack.length - 1];
        } else {
            currentLine.parent = -1; // Nessun parent (root level)
        }
        
        // Aggiungi l'indice corrente allo stack (potrebbe essere parent per le linee successive)
        stack.push(i);
    }
    
    return lines;
}

async function main() {
    console.log("=== Risultato Parsing ===");
    const parsed = analizeArticle(articleLines);
    console.log(JSON.stringify(parsed.result, null, 2));
    printStructure(parsed.result);
}

if (require.main === module) {
    main();
}

module.exports = {
    analizeArticle
}