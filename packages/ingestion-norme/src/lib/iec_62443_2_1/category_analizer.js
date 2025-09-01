const isDebug = false;

function analizeCategory(category) {
    for (let i = 0; i < category.lines.length; i++) {
        const line = category.lines[i];
        if (!line.text) continue;
        if (line.deleted) continue;
        // if (isDebug) console.log("Char codes:", [...line.text].map(c => c.charCodeAt(0)));
        const prevLine = category.lines[i-1];
        const nextLine = category.lines[i+1];
        const nextLine2 = category.lines[i+2];
        const nextLine3 = category.lines[i+3];
        const section3Match = line.text.match(/^\s*(\d+)\.(\d+)\.(\d+)\s*$/);
        if (section3Match) {
            if(isDebug) console.log("section3Match", section3Match)
            let title = section3Match.slice(4).join(' ');
            if (title.length == 0 && nextLine) {
                title = nextLine.text.trim();
                nextLine.deleted = true;
                if (nextLine2 && nextLine2.indent == nextLine.indent) {
                    title += ' ' + nextLine2.text
                    nextLine2.deleted = true;
                    if (nextLine3 && nextLine3.indent == nextLine.indent) {
                        title += ' ' + nextLine3.text
                        nextLine3.deleted = true;
                    }
                }
            }
            let kind = null;
            if (title == "Description of category") {
                kind = "Description of category";
            } else if (title.startsWith("Element:")) {
                kind = "Element";
            } else if (title.startsWith("ElementGroup:")) {
                kind = "ElementGroup";
            }
            line.section3 = {
                categoryNumber: section3Match[2],
                section3Number: section3Match[3],
                title: title,
                kind: kind
            }
            continue;
        }
        const section4Match = line.text.match(/^\s*(\d+)\.(\d+)\.(\d+)\.(\d+)\s*$/);
        if (section4Match) {
            if(isDebug) console.log("section4Match", section4Match)
            let title = section4Match.slice(5).join(' ');
            if (title.length == 0 && nextLine) {
                title = nextLine.text.trim();
                nextLine.deleted = true;
                if (nextLine2 && nextLine2.indent == nextLine.indent) {
                    title += ' ' + nextLine2.text
                    nextLine2.deleted = true;
                    if (nextLine3 && nextLine3.indent == nextLine.indent) {
                        title += ' ' + nextLine3.text
                        nextLine3.deleted = true;
                    }
                }
            }
            let kind = null;
            if (title == "Description of category") {
                kind = "Description of category";
            } else if (title.startsWith("Element:")) {
                kind = "Element";
            } else if (title.startsWith("ElementGroup:")) {
                kind = "ElementGroup";
            }
            line.section4 = {
                categoryNumber: section4Match[2],
                section3Number: section4Match[3],
                section4Number: section4Match[4],
                kind: kind,
                title: title,
            }
        }
        const section5Match = line.text.match(/^\s*(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\s*$/);
        if (section5Match) {        
            if(isDebug) console.log("section5Match", section5Match)
            let title = section5Match.slice(6).join(' ').trim()
            if (title.length == 0 && nextLine) {
                title = nextLine.text.trim();
                nextLine.deleted = true;
                if (nextLine2 && nextLine2.indent == nextLine.indent) {
                    title += ' ' + nextLine2.text
                    nextLine2.deleted = true;
                    if (nextLine3 && nextLine3.indent == nextLine.indent) {
                        title += ' ' + nextLine3.text
                        nextLine3.deleted = true;
                    }
                }
            }
            line.section5 = {
                categoryNumber: section5Match[2],
                section3Number: section5Match[3],
                section4Number: section5Match[4],
                section5Number: section5Match[5],
                title: title,
            }
        }
    }
    assignParentIndex(category.lines);
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
    const parsed = analizeCategory(categoryLines);
    console.log(JSON.stringify(parsed.result, null, 2));
    printStructure(parsed.result);
}

if (require.main === module) {
    main();
}

module.exports = {
    analizeCategory
}