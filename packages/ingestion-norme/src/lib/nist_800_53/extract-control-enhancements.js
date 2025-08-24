function parseControlEnhancements(enhancementLines) {
    /**
     * Estrae gli enhancement dalle linee di testo
     * Considera l'indentazione per distinguere veri enhancement da liste annidate
     * @param {string[]} enhancementLines - Array di linee contenenti gli enhancement
     * @returns {Array} Array di oggetti {number, category, context, requirement, assignments, etc.}
     */
    
    const enhancements = [];
    const lines = enhancementLines || [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Cerca pattern (N) ma solo se è un vero enhancement (non indentato o minimamente indentato)
        const enhancementMatch = line.match(/^(\s{0,2})\((\d+)\)\s+(.*)/);
        
        if (enhancementMatch) {
            const indentation = enhancementMatch[1].length;
            const number = parseInt(enhancementMatch[2]);
            const restOfLine = enhancementMatch[3].trim();
            
            // Solo se l'indentazione è molto minima (0-2 spazi) consideriamo un vero enhancement
            if (indentation <= 2) {
                // Trova la fine di questo enhancement (prossimo (N) con indentazione minima o fine array)
                const nextEnhancementIndex = findNextEnhancement(lines, i + 1);
                const endIndex = nextEnhancementIndex === -1 ? lines.length - 1 : nextEnhancementIndex - 1;
                
                // Estrai questo enhancement
                const enhancement = extractEnhancement(lines, i, number, restOfLine, endIndex);
                enhancements.push(enhancement);
                
                // Salta alla fine di questo enhancement
                i = endIndex;
            }
        }
    }
    
    return enhancements;
}

function findNextEnhancement(lines, startIndex) {
    /**
     * Trova il prossimo enhancement che inizia con (N) con indentazione minima
     */
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s{0,2})\(\d+\)\s+/);
        if (match && match[1].length <= 2) {
            return i;
        }
    }
    return -1;
}

function extractEnhancement(lines, startIndex, number, firstLineContent, endIndex) {
    /**
     * Estrae un singolo enhancement completo
     */
    
    // Analizza la prima riga per estrarre categoria e contesto
    const { category, context, title } = parseEnhancementFirstLine(firstLineContent);
    
    // Raccoglie tutte le linee di questo enhancement
    const enhancementLines = [];
    for (let i = startIndex; i <= endIndex; i++) {
        enhancementLines.push(lines[i]);
    }
    
    // Estrai le sezioni (Discussion, Related Controls, etc.) e il requisito
    const sections = extractEnhancementSections(enhancementLines);
    
    // Estrai gli Assignment da tutte le sezioni e mettili allo stesso livello di sections
    const assignments = extractAssignmentsFromAllSections(sections);
    
    return {
        number: number,
        category: category,
        context: context,
        title: title, // Per compatibilità
        requirement: sections.requirement || "",
        discussion: sections.discussion || "",
        relatedControls: sections['related control'] || "",
        assignments: assignments, // Array di Assignment da tutte le sezioni (allo stesso livello di sections)
        sections: sections, // Sezioni senza assignments (già estratti sopra)
        lines: enhancementLines
    };
}

function parseEnhancementFirstLine(content) {
    /**
     * Analizza la prima riga per estrarre categoria e contesto
     * Formato: "CATEGORIA | CONTESTO" 
     * Es: "ROLE-BASED TRAINING | ENVIRONMENTAL CONTROLS"
     */
    
    // Cerca pattern con | per separare categoria e contesto
    const pipeMatch = content.match(/^([^|]+)\|\s*(.+)/);
    if (pipeMatch) {
        return {
            category: pipeMatch[1].trim(),
            context: pipeMatch[2].trim(),
            title: content.trim() // Mantieni il titolo completo per compatibilità
        };
    }
    
    // Se non c'è |, tutto è considerato come categoria
    return {
        category: content.trim(),
        context: "",
        title: content.trim()
    };
}

function extractEnhancementSections(enhancementLines) {
    /**
     * Estrae sezioni mantenendo la spaziatura originale per preservare l'indentazione delle liste
     * Identifica il requisito (testo prescrittivo) - gli Assignment vengono estratti separatamente
     */
    const sections = {};
    let currentSection = null;
    let currentContent = [];
    let titleLines = []; // Per raccogliere righe del titolo in maiuscolo
    let requirementLines = []; // Per raccogliere il testo del requisito
    let inTitle = true;   // Flag per sapere se stiamo ancora leggendo il titolo
    let inRequirement = false; // Flag per il testo prescrittivo
    
    for (let i = 1; i < enhancementLines.length; i++) { // Inizia da 1 per saltare la riga (N)
        const line = enhancementLines[i]; // NON fare trim() per preservare indentazione
        const trimmedLine = line.trim();
        
        // Identifica nuove sezioni (Discussion, Related Controls, etc.)
        const sectionMatch = trimmedLine.match(/^(Discussion|Related Controls?|References?):\s*(.*)/i);
        if (sectionMatch) {
            // Se eravamo ancora nel titolo, salvalo
            if (inTitle && titleLines.length > 0) {
                sections.fullTitle = titleLines.join(' ').trim();
                inTitle = false;
            }
            
            // Se eravamo nel requisito, salvalo mantenendo la formattazione
            if (inRequirement && requirementLines.length > 0) {
                sections.requirement = requirementLines.join('\n').trim();
                inRequirement = false;
            }
            
            // Salva la sezione precedente mantenendo la formattazione
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            
            // Inizia nuova sezione
            currentSection = sectionMatch[1].toLowerCase().replace(/s$/, ''); // Normalizza "controls" -> "control"
            currentContent = sectionMatch[2] ? [sectionMatch[2]] : [];
        } else if (currentSection) {
            // Aggiungi contenuto alla sezione corrente preservando indentazione
            currentContent.push(line);
        } else if (inTitle && isUpperCaseLine(trimmedLine)) {
            // È parte del titolo (tutto maiuscolo)
            titleLines.push(trimmedLine);
        } else if (trimmedLine) {
            // È parte del requisito (tutto quello che non è titolo o sezione specifica)
            if (inTitle && titleLines.length > 0) {
                // Finisce il titolo, inizia il requisito
                sections.fullTitle = titleLines.join(' ').trim();
                inTitle = false;
            }
            inRequirement = true;
            
            // Non è l'inizio di un nuovo enhancement (controlla indentazione)
            if (!line.match(/^\s{0,2}\(\d+\)/)) {
                requirementLines.push(line); // Mantieni l'indentazione originale
            }
        } else if (!trimmedLine && inTitle && titleLines.length > 0) {
            // Riga vuota dopo il titolo - finisce il titolo
            sections.fullTitle = titleLines.join(' ').trim();
            inTitle = false;
            inRequirement = true;
        } else if (inRequirement) {
            // Riga vuota nel requisito - mantienila per preservare la formattazione
            requirementLines.push(line);
        }
    }
    
    // Salva l'ultima sezione
    if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
    }
    
    // Se siamo ancora nel titolo alla fine, salvalo
    if (inTitle && titleLines.length > 0) {
        sections.fullTitle = titleLines.join(' ').trim();
    }
    
    // Se siamo ancora nel requisito alla fine, salvalo
    if (inRequirement && requirementLines.length > 0) {
        sections.requirement = requirementLines.join('\n').trim();
    }
    
    // NON estrarre più gli assignments qui - verranno estratti a livello superiore
    return sections;
}

function extractAssignmentsFromAllSections(sections) {
    /**
     * Estrae tutti gli Assignment da tutte le sezioni
     * Restituisce un oggetto con gli assignment organizzati per sezione
     */
    const allAssignments = {
        /* requirement: [],
        control: [],
        discussion: [],
        'related control': [],
        references: [],*/
        total: []
    };
    
    // Estrai da ogni sezione
    Object.keys(sections).forEach(sectionKey => {
        const sectionText = sections[sectionKey];
        if (typeof sectionText === 'string' && sectionText) {
            const assignments = extractAssignments(sectionText);
            
            if (assignments.length > 0) {
                // Aggiungi alla sezione specifica
                if (false) {
                    if (allAssignments.hasOwnProperty(sectionKey)) {
                        allAssignments[sectionKey] = assignments;
                    } else {
                        // Se non è una sezione standard, creala
                        allAssignments[sectionKey] = assignments;
                    }
                }
                // Aggiungi al totale con informazione sulla sezione
                assignments.forEach(assignment => {
                    allAssignments.total.push({
                        ...assignment,
                        section: sectionKey
                    });
                });
            }
        }
    });
    
    return allAssignments;
}

function isUpperCaseLine(line) {
    /**
     * Verifica se una riga è tutta in maiuscolo (ignora spazi, numeri e punteggiatura)
     */
    const letters = line.replace(/[^a-zA-Z]/g, '');
    return letters.length > 0 && letters === letters.toUpperCase();
}

function extractAssignments(text) {
    /**
     * Estrae tutti gli Assignment dal testo del requisito
     * Formato: [Assignment: organization-defined ...]
     */
    if (!text) return [];
    
    const assignmentRegex = /\[Assignment:\s*([^\]]+)\]/g;
    const assignments = [];
    let match;
    
    while ((match = assignmentRegex.exec(text)) !== null) {
        assignments.push({
            full: match[0], // Testo completo: "[Assignment: organization-defined frequency]"
            content: match[1].trim(), // Solo il contenuto: "organization-defined frequency"
            variable: match[1].trim().replace(/^organization-defined\s*/, '') // Variabile: "frequency"
        });
    }
    
    return assignments;
}

// Funzione per estrarre assignments dai controlli base NIST (non enhancement)
function extractControlAssignments(control) {
    /**
     * Estrae assignments da un controllo NIST base
     * @param {object} control - Oggetto controllo con proprietà sections
     * @returns {object} Controllo con proprietà assignments aggiunta
     */
    if (control.sections) {
        control.assignments = extractAssignmentsFromAllSections(control.sections);
    } else {
        control.assignments = {
            control: [],
            discussion: [],
            'related control': [],
            references: [],
            total: []
        };
    }
    return control;
}

// Funzioni pubbliche
const Utils = {
    parseControlEnhancements(enhancementLines) {
        return parseControlEnhancements(enhancementLines);
    },
    extractControlAssignments(control) {    
        return extractControlAssignments(control);
    }
};

module.exports = Utils;

// ===== ESEMPI E TEST =====

/*

// Test con enhancement che contiene Assignment in diverse sezioni
const assignmentInSectionsTest = {
    enhancementLines: [
        "Control Enhancements:",
        "(1) ROLE-BASED TRAINING | ENVIRONMENTAL CONTROLS",
        "Provide [Assignment: organization-defined personnel or roles] with initial and",
        "[Assignment: organization-defined frequency] training in the employment and operation",
        "of environmental controls.",
        "Discussion: Training should cover [Assignment: organization-defined environmental control procedures]",
        "and be updated [Assignment: organization-defined update frequency] to reflect changes.",
        "Related Controls: AT-3, PE-1.",
        "(2) SYSTEM MONITORING | AUTOMATED ANALYSIS", 
        "Employ automated tools with [Assignment: organization-defined capabilities].",
        "Discussion: Tools should provide [Assignment: organization-defined monitoring features].",
        "Related Controls: AU-7."
    ]
};

console.log("=== TEST ASSIGNMENT IN MULTIPLE SEZIONI ===");
const assignmentEnhancements = parseControlEnhancements(assignmentInSectionsTest.enhancementLines);

assignmentEnhancements.forEach(enh => {
    console.log(`\n(${enh.number}) ${enh.category} | ${enh.context}`);
    
    console.log(`  Assignments totali: ${enh.assignments.total.length}`);
    enh.assignments.total.forEach((assignment, i) => {
        console.log(`    ${i + 1}. [${assignment.section}] ${assignment.variable}`);
    });
    
    console.log(`  Assignments per sezione:`);
    Object.keys(enh.assignments).forEach(section => {
        if (section !== 'total' && enh.assignments[section].length > 0) {
            console.log(`    ${section}: ${enh.assignments[section].length} assignments`);
        }
    });
});

console.log("\n=== VERIFICA ASSIGNMENT IN DISCUSSION ===");
if (assignmentEnhancements.length > 0) {
    const firstEnh = assignmentEnhancements[0];
    const discussionAssignments = firstEnh.assignments.discussion;
    
    console.log(`Discussion: "${firstEnh.discussion}"`);
    console.log(`Assignment in Discussion: ${discussionAssignments.length}`);
    discussionAssignments.forEach((assignment, i) => {
        console.log(`  ${i + 1}. Variable: "${assignment.variable}"`);
        console.log(`     Full: "${assignment.full}"`);
    });
}

// Test per controllo base NIST (simulato)
console.log("\n=== TEST CONTROLLO BASE CON ASSIGNMENTS ===");
const mockControl = {
    id: "AC-1",
    name: "ACCESS CONTROL POLICY AND PROCEDURES", 
    sections: {
        control: "Develop [Assignment: organization-defined access control policy] and implement [Assignment: organization-defined procedures].",
        discussion: "Access control policy should be reviewed [Assignment: organization-defined frequency] and updated as needed.",
        'related control': "PM-9, PS-8."
    }
};

const controlWithAssignments = extractControlAssignments(mockControl);
console.log(`Controllo ${controlWithAssignments.id}:`);
console.log(`  Assignments totali: ${controlWithAssignments.assignments.total.length}`);
controlWithAssignments.assignments.total.forEach((assignment, i) => {
    console.log(`    ${i + 1}. [${assignment.section}] ${assignment.variable}`);
});

// Versione semplificata aggiornata con assignments
function parseEnhancements(enhancementLines) {
    return parseControlEnhancements(enhancementLines).map(enhancement => ({
        number: enhancement.number,
        category: enhancement.category,
        context: enhancement.context,
        requirement: enhancement.requirement,
        assignments: enhancement.assignments.map(a => ({
            variable: a.variable,
            description: a.content
        })),
        discussion: enhancement.discussion,
        relatedControls: enhancement.relatedControls
    }));
}

console.log("\n=== VERSIONE SEMPLIFICATA CON ASSIGNMENTS ===");
const simpleEnhancements = parseEnhancements(complexListTest.enhancementLines);
if (simpleEnhancements.length > 0) {
    console.log(JSON.stringify(simpleEnhancements[0], null, 2));
}

// Utility per evidenziare gli Assignment nel testo
function highlightAssignments(requirement) {
    if (!requirement) return requirement;
    return requirement.replace(/\[Assignment:[^\]]+\]/g, '**$&**');
}

// Utility per formattare il requirement mantenendo l'indentazione  
function formatRequirement(requirement) {
    if (!requirement) return '';
    
    return requirement
        .split('\n')
        .map(line => line.trimRight()) // Rimuovi spazi a destra ma mantieni indentazione a sinistra
        .join('\n');
}

console.log("\n=== REQUIREMENT FORMATTATO ===");
if (complexEnhancements.length > 0) {
    console.log(formatRequirement(complexEnhancements[0].requirement));
}
*/