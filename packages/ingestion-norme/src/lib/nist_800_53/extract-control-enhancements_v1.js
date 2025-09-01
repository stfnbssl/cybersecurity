function parseControlEnhancements(enhancementLines) {
    /**
     * Estrae gli enhancement dalle linee di testo
     * @param {string[]} enhancementLines - Array di linee contenenti gli enhancement
     * @returns {Array} Array di oggetti {number, title, description, sections}
     */
    
    const enhancements = [];
    const lines = enhancementLines || [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Cerca pattern (N) all'inizio della riga
        const enhancementMatch = line.match(/^\((\d+)\)\s+(.*)/);
        
        if (enhancementMatch) {
            const number = parseInt(enhancementMatch[1]);
            const restOfLine = enhancementMatch[2].trim();
            
            // Trova la fine di questo enhancement (prossimo (N) o fine array)
            const nextEnhancementIndex = findNextEnhancement(lines, i + 1);
            const endIndex = nextEnhancementIndex === -1 ? lines.length - 1 : nextEnhancementIndex - 1;
            
            // Estrai questo enhancement
            const enhancement = extractEnhancement(lines, i, number, restOfLine, endIndex);
            enhancements.push(enhancement);
            
            // Salta alla fine di questo enhancement
            i = endIndex;
        }
    }
    
    return enhancements;
}

function findNextEnhancement(lines, startIndex) {
    /**
     * Trova il prossimo enhancement che inizia con (N)
     */
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\(\d+\)\s+/)) {
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
    
    // Estrai gli Assignment dal requisito
    const assignments = extractAssignments(sections.requirement);
    
    return {
        number: number,
        category: category,
        context: context,
        title: title, // Per compatibilità
        requirement: sections.requirement || "",
        assignments: assignments, // Array di Assignment da implementare
        discussion: sections.discussion || "",
        relatedControls: sections['related control'] || "",
        // sections: sections, // Mantieni tutto per casi complessi
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
     * Estrae sezioni come Discussion, Related Controls da un enhancement
     * Identifica il requisito (testo prescrittivo) e estrae gli Assignment
     */
    const sections = {};
    let currentSection = null;
    let currentContent = [];
    let titleLines = []; // Per raccogliere righe del titolo in maiuscolo
    let requirementLines = []; // Per raccogliere il testo del requisito
    let inTitle = true;   // Flag per sapere se stiamo ancora leggendo il titolo
    let inRequirement = false; // Flag per il testo prescrittivo
    
    for (let i = 1; i < enhancementLines.length; i++) { // Inizia da 1 per saltare la riga (N)
        const line = enhancementLines[i].trim();
        
        // Identifica nuove sezioni (Discussion, Related Controls, etc.)
        const sectionMatch = line.match(/^(Discussion|Related Controls?|References?):\s*(.*)/i);
        if (sectionMatch) {
            // Se eravamo ancora nel titolo, salvalo
            if (inTitle && titleLines.length > 0) {
                sections.fullTitle = titleLines.join(' ').trim();
                inTitle = false;
            }
            
            // Se eravamo nel requisito, salvalo
            if (inRequirement && requirementLines.length > 0) {
                sections.requirement = requirementLines.join(' ').trim();
                inRequirement = false;
            }
            
            // Salva la sezione precedente
            if (currentSection) {
                sections[currentSection] = currentContent.join(' ').trim();
            }
            
            // Inizia nuova sezione
            currentSection = sectionMatch[1].toLowerCase().replace(/s$/, ''); // Normalizza "controls" -> "control"
            currentContent = sectionMatch[2] ? [sectionMatch[2]] : [];
        } else if (currentSection) {
            // Aggiungi contenuto alla sezione corrente
            if (line) {
                currentContent.push(line);
            }
        } else if (inTitle && isUpperCaseLine(line)) {
            // È parte del titolo (tutto maiuscolo)
            titleLines.push(line);
        } else if (line) {
            // È parte del requisito (tutto quello che non è titolo o sezione specifica)
            if (inTitle && titleLines.length > 0) {
                // Finisce il titolo, inizia il requisito
                sections.fullTitle = titleLines.join(' ').trim();
                inTitle = false;
            }
            inRequirement = true;
            
            if (!line.match(/^\(\d+\)/)) { // Non è l'inizio di un nuovo enhancement
                requirementLines.push(line);
            }
        } else if (!line && inTitle && titleLines.length > 0) {
            // Riga vuota dopo il titolo - finisce il titolo
            sections.fullTitle = titleLines.join(' ').trim();
            inTitle = false;
            inRequirement = true;
        }
    }
    
    // Salva l'ultima sezione
    if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join(' ').trim();
    }
    
    // Se siamo ancora nel titolo alla fine, salvalo
    if (inTitle && titleLines.length > 0) {
        sections.fullTitle = titleLines.join(' ').trim();
    }
    
    // Se siamo ancora nel requisito alla fine, salvalo
    if (inRequirement && requirementLines.length > 0) {
        sections.requirement = requirementLines.join(' ').trim();
    }
    
    // Mantieni anche come description per compatibilità
    if (sections.requirement && !sections.description) {
        sections.description = sections.requirement;
    }
    
    return sections;
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

function isUpperCaseLine(line) {
    /**
     * Verifica se una riga è tutta in maiuscolo (ignora spazi, numeri e punteggiatura)
     */
    const letters = line.replace(/[^a-zA-Z]/g, '');
    return letters.length > 0 && letters === letters.toUpperCase();
}

// Funzioni pubbliche
const Utils = {
    parseControlEnhancements(enhancementLines) {
        return parseControlEnhancements(enhancementLines);
    },
};

module.exports = Utils;

// ===== TEST ED ESEMPI =====
/*
const testData = {
    enhancementLines: [
        "Control Enhancements: ",
        "(1) VULNERABILITY MONITORING AND SCANNING | UPDATE TOOL       Update the system vulnerabilities to be scanned [Selection (one or more): [Assignment: ",
        "organization-defined frequency]; prior to a new scan; when new vulnerabilities are ",
        "identified and reported]. ",
        "Discussion: This is the discussion for enhancement 1. ",
        "Related Controls: SI-5. ",
        "(2) VULNERABILITY MONITORING AND SCANNING | BREADTH AND DEPTH OF COVERAGE ",
        "Define the breadth and depth of vulnerability scanning coverage. ",
        "Discussion: This is the discussion for enhancement 2. ",
        "Related Controls: AU-13, SC-26. ",
    ]
};

console.log("=== TEST PARSING ENHANCEMENTS ===");
const enhancements = parseControlEnhancements(testData.enhancementLines);

console.log(`\nTrovati ${enhancements.length} enhancement:`);

enhancements.forEach((enhancement, i) => {
    console.log(`\n${i + 1}. Enhancement (${enhancement.number})`);
    console.log(`   Title: "${enhancement.title}"`);
    console.log(`   Description: "${enhancement.description}"`);
    
    console.log(`   Sections:`);
    Object.keys(enhancement.sections).forEach(section => {
        console.log(`     ${section}: "${enhancement.sections[section]}"`);
    });
    
    console.log(`   Total lines: ${enhancement.lines.length}`);
});

// Versione semplificata per uso immediato
function parseEnhancements(enhancementLines) {
    return parseControlEnhancements(enhancementLines).map(enhancement => ({
        number: enhancement.number,
        title: enhancement.title,
        description: enhancement.description,
        discussion: enhancement.sections.discussion || '',
        relatedControls: enhancement.sections['related control'] || ''
    }));
}

console.log("\n=== VERSIONE SEMPLIFICATA ===");
const simpleEnhancements = parseEnhancements(testData.enhancementLines);
console.log(JSON.stringify(simpleEnhancements, null, 2));

// Test con un esempio più complesso
const complexTest = {
    enhancementLines: [
        "Control Enhancements:",
        "(1) SYSTEM MONITORING | SYSTEM-WIDE INTRUSION DETECTION SYSTEM",
        "Connect and configure individual intrusion detection tools into a system-wide intrusion detection system.",
        "Discussion: A system-wide intrusion detection system includes a variety of individual intrusion detection tools.",
        "Related Controls: AU-6, AU-19, SI-7.",
        "(2) SYSTEM MONITORING | AUTOMATED TOOLS AND MECHANISMS FOR REAL-TIME ANALYSIS",  
        "Employ automated tools and mechanisms to support near real-time analysis of events.",
        "Discussion: Automated tools and mechanisms include host-based, network-based, transport-based, or storage-based event monitoring tools.",
        "Related Controls: AU-7, PM-14."
    ]
};

// Test con la struttura NIST corretta e Assignment
const nistStructureTest = {
    enhancementLines: [
        "Control Enhancements:",
        "(1) ROLE-BASED TRAINING | ENVIRONMENTAL CONTROLS",
        "Provide [Assignment: organization-defined personnel or roles] with initial and",
        "[Assignment: organization-defined frequency] training in the employment and operation",
        "of environmental controls.",
        "Discussion: Environmental controls include heating, ventilation, air conditioning,",
        "fire suppression, lighting, power, and water systems that support information systems.",
        "Related Controls: AT-3, PE-1.",
        "(2) SYSTEM MONITORING | AUTOMATED TOOLS FOR REAL-TIME ANALYSIS",
        "Employ automated tools and mechanisms to support near real-time analysis of events",
        "with [Assignment: organization-defined real-time period] and [Selection: increase in",
        "volume of activity; types of activities; specified activity types].",
        "Discussion: Automated tools include host-based, network-based, and storage-based",
        "event monitoring tools and mechanisms.",
        "Related Controls: AU-7, PM-14."
    ]
};

console.log("\n=== TEST STRUTTURA NIST CON ASSIGNMENT ===");
const nistEnhancements = parseControlEnhancements(nistStructureTest.enhancementLines);
nistEnhancements.forEach(enh => {
    console.log(`\n(${enh.number}) Enhancement:`);
    console.log(`  Category: "${enh.category}"`);
    console.log(`  Context: "${enh.context}"`);
    console.log(`  Requirement: "${enh.requirement}"`);
    console.log(`  Assignments (${enh.assignments.length}):`);
    enh.assignments.forEach((assignment, i) => {
        console.log(`    ${i + 1}. Variable: "${assignment.variable}"`);
        console.log(`       Full: "${assignment.full}"`);
    });
    console.log(`  Discussion: "${enh.discussion.substring(0, 60)}..."`);
    console.log(`  Related Controls: "${enh.relatedControls}"`);
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
const simpleNistEnhancements = parseEnhancements(nistStructureTest.enhancementLines);
console.log(JSON.stringify(simpleNistEnhancements[0], null, 2));

console.log("\n=== TEST STRUTTURA NIST CORRETTA ===");
const nistEnhancements = parseControlEnhancements(nistStructureTest.enhancementLines);
nistEnhancements.forEach(enh => {
    console.log(`\n(${enh.number}) Enhancement:`);
    console.log(`  Category: "${enh.category}"`);
    console.log(`  Context: "${enh.context}"`);
    console.log(`  Requirement: "${enh.requirement}"`);
    console.log(`  Discussion: "${enh.discussion.substring(0, 60)}..."`);
    console.log(`  Related Controls: "${enh.relatedControls}"`);
});

// Versione semplificata aggiornata
function parseEnhancements(enhancementLines) {
    return parseControlEnhancements(enhancementLines).map(enhancement => ({
        number: enhancement.number,
        category: enhancement.category,
        context: enhancement.context,
        requirement: enhancement.requirement,
        discussion: enhancement.discussion,
        relatedControls: enhancement.relatedControls
    }));
}

console.log("\n=== VERSIONE SEMPLIFICATA AGGIORNATA ===");
const simpleNistEnhancements = parseEnhancements(nistStructureTest.enhancementLines);
console.log(JSON.stringify(simpleNistEnhancements[0], null, 2));**'); // Markdown bold
}

console.log("\n=== REQUIREMENT CON ASSIGNMENT EVIDENZIATI ===");
nistEnhancements.forEach(enh => {
    console.log(`(${enh.number}) ${highlightAssignments(enh.requirement)}`);
});


*/