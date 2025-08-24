/**
 * Parser per estrarre struttura gerarchica di capitoli e paragrafi da un testo
 */

function parseTextStructure(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const result = {
        chapters: [],
        metadata: {
            totalLines: lines.length,
            parsedAt: new Date().toISOString()
        }
    };
    
    let currentChapter = null;
    let currentSection = null;
    let currentSubsection = null;
    let currentSubSubsection = null;
    let contentBuffer = [];
    
    // Funzione per convertire il titolo in nome proprietà (blank -> underscore, lowercase)
    function titleToPropertyName(title) {
        return title.toLowerCase()
                   .replace(/\s+/g, '_')
                   .replace(/[^a-z0-9_]/g, '');
    }
    
    // Funzione per salvare il contenuto accumulato nel nodo attivo più profondo
    function saveContentToCurrentNode() {
        if (contentBuffer.length > 0) {
            const content = contentBuffer.join('\n').trim();
            
            // Salva nel nodo più specifico disponibile
            if (currentSubSubsection) {
                // Se siamo al quarto livello, aggiungi come proprietà del terzo livello
                const propertyName = titleToPropertyName(currentSubSubsection.title);
                if (currentSubsection) {
                    if (!currentSubsection.properties) {
                        currentSubsection.properties = {};
                    }
                    currentSubsection.properties[propertyName] = content;
                }
            } else if (currentSubsection) {
                if (currentSubsection.content) {
                    currentSubsection.content += '\n' + content;
                } else {
                    currentSubsection.content = content;
                }
            } else if (currentSection) {
                if (currentSection.content) {
                    currentSection.content += '\n' + content;
                } else {
                    currentSection.content = content;
                }
            } else if (currentChapter) {
                if (currentChapter.content) {
                    currentChapter.content += '\n' + content;
                } else {
                    currentChapter.content = content;
                }
            }
            contentBuffer = [];
        }
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Salta le linee di markup
        if (line.startsWith('###')) {
            continue;
        }
        
        // Regex per identificare i diversi livelli di titoli
        const chapterMatch = line.match(/^(\d+)\s+([^0-9].+)$/);
        const sectionMatch = line.match(/^(\d+)\.(\d+)\s+(.+)$/);
        const subsectionMatch = line.match(/^(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
        const subSubsectionMatch = line.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
        
        if (subSubsectionMatch) {
            // Livello 4: x.x.x.x - Non creiamo più una sottosezione ma prepariamo per proprietà
            saveContentToCurrentNode();
            
            const [, chapterNum, sectionNum, subsectionNum, subSubsectionNum, title] = subSubsectionMatch;
            
            // Assicurati che la struttura padre esista
            ensureStructureExists(result, chapterNum, sectionNum, subsectionNum);
            
            currentSubSubsection = {
                number: `${chapterNum}.${sectionNum}.${subsectionNum}.${subSubsectionNum}`,
                title: title.trim(),
                lineNumber: i + 1
            };
            
            // Non aggiungiamo più currentSubSubsection come elemento separato
            // Verrà processato come proprietà nella saveContentToCurrentNode()
            
        } else if (subsectionMatch) {
            // Livello 3: x.x.x
            saveContentToCurrentNode();
            
            const [, chapterNum, sectionNum, subsectionNum, title] = subsectionMatch;
            
            // Assicurati che la struttura padre esista
            ensureStructureExists(result, chapterNum, sectionNum);
            
            currentSubSubsection = null;
            currentSubsection = {
                number: `${chapterNum}.${sectionNum}.${subsectionNum}`,
                title: title.trim(),
                content: "",
                properties: {}, // Qui andranno requirement, recommendation, etc.
                lineNumber: i + 1
            };
            
            if (!currentSection.subsections) {
                currentSection.subsections = [];
            }
            currentSection.subsections.push(currentSubsection);
            
        } else if (sectionMatch) {
            // Livello 2: x.x
            saveContentToCurrentNode();
            
            const [, chapterNum, sectionNum, title] = sectionMatch;
            
            // Assicurati che il capitolo esista
            ensureStructureExists(result, chapterNum);
            
            currentSubSubsection = null;
            currentSubsection = null;
            currentSection = {
                number: `${chapterNum}.${sectionNum}`,
                title: title.trim(),
                content: "",
                subsections: [],
                lineNumber: i + 1
            };
            
            if (!currentChapter.sections) {
                currentChapter.sections = [];
            }
            currentChapter.sections.push(currentSection);
            
        } else if (chapterMatch) {
            // Livello 1: x (capitolo principale)
            saveContentToCurrentNode();
            
            const [, chapterNum, title] = chapterMatch;
            
            currentSubSubsection = null;
            currentSubsection = null;
            currentSection = null;
            currentChapter = {
                number: chapterNum,
                title: title.trim(),
                content: "",
                sections: [],
                lineNumber: i + 1
            };
            
            result.chapters.push(currentChapter);
            
        } else {
            // Contenuto normale - aggiungi al buffer
            if (line) {
                contentBuffer.push(line);
            }
        }
    }
    
    // Salva l'ultimo contenuto rimasto nel buffer
    saveContentToCurrentNode();
    
    return result;
}

function ensureStructureExists(result, chapterNum, sectionNum = null, subsectionNum = null) {
    // Trova o crea il capitolo
    let chapter = result.chapters.find(c => c.number === chapterNum);
    if (!chapter) {
        chapter = {
            number: chapterNum,
            title: `Chapter ${chapterNum}`,
            content: "",
            sections: []
        };
        result.chapters.push(chapter);
    }
    currentChapter = chapter;
    
    if (sectionNum !== null) {
        // Trova o crea la sezione
        let section = chapter.sections.find(s => s.number === `${chapterNum}.${sectionNum}`);
        if (!section) {
            section = {
                number: `${chapterNum}.${sectionNum}`,
                title: `Section ${chapterNum}.${sectionNum}`,
                content: "",
                subsections: []
            };
            chapter.sections.push(section);
        }
        currentSection = section;
        
        if (subsectionNum !== null) {
            // Trova o crea la sottosezione
            let subsection = section.subsections.find(ss => ss.number === `${chapterNum}.${sectionNum}.${subsectionNum}`);
            if (!subsection) {
                subsection = {
                    number: `${chapterNum}.${sectionNum}.${subsectionNum}`,
                    title: `Subsection ${chapterNum}.${sectionNum}.${subsectionNum}`,
                    content: "",
                    subsections: []
                };
                section.subsections.push(subsection);
            }
            currentSubsection = subsection;
        }
    }
}

function prettyPrintStructure(structure, indent = 0) {
    const spaces = '  '.repeat(indent);
    let output = '';
    
    structure.chapters.forEach(chapter => {
        output += `${spaces}📖 ${chapter.number} - ${chapter.title}\n`;
        if (chapter.content) {
            output += `${spaces}   Content (${chapter.content.length} chars): ${chapter.content.substring(0, 150)}${chapter.content.length > 150 ? '...' : ''}\n`;
        }
        
        chapter.sections.forEach(section => {
            output += `${spaces}  📄 ${section.number} - ${section.title}\n`;
            if (section.content) {
                output += `${spaces}     Content (${section.content.length} chars): ${section.content.substring(0, 120)}${section.content.length > 120 ? '...' : ''}\n`;
            }
            
            section.subsections.forEach(subsection => {
                output += `${spaces}    📝 ${subsection.number} - ${subsection.title}\n`;
                if (subsection.content) {
                    output += `${spaces}       Content (${subsection.content.length} chars): ${subsection.content.substring(0, 100)}${subsection.content.length > 100 ? '...' : ''}\n`;
                }
                
                // Mostra le proprietà del quarto livello
                if (subsection.properties && Object.keys(subsection.properties).length > 0) {
                    Object.keys(subsection.properties).forEach(propName => {
                        const propContent = subsection.properties[propName];
                        output += `${spaces}      🔹 ${propName}: (${propContent.length} chars) ${propContent.substring(0, 80)}${propContent.length > 80 ? '...' : ''}\n`;
                    });
                }
            });
        });
    });
    
    return output;
}

// Esempio di utilizzo con più contenuto
const exampleText = `
4 Zone, conduit and risk assessment requirements 
4.1 Overview
This section provides an overview of zone requirements.
It contains general information about the assessment process.
4.2 ZCR 1: Identify the SUC 
This is the first zone control requirement dealing with SUC identification.
It establishes the foundation for security perimeter management.
4.2.1 ZCR 1.1: Identify the SUC perimeter and access points 
This subsection focuses specifically on perimeter identification.
Access points must be catalogued and documented properly.
4.2.1.1 Requirement 
The organization shall clearly identify the SUC, including clear demarcation of the security perimeter and identification of all access points to the SUC.
This requirement is mandatory for all organizations.
4.2.1.2 Rationale and supplemental guidance
The security perimeter should be clearly defined and documented.
Physical and logical boundaries must be established.
Additional considerations include network segmentation and access controls.
4.2.1.3 Recommendation
Organizations should implement automated tools for perimeter monitoring.
Regular audits of access points are highly recommended.
5 Implementation guidelines
5.1 General approach
This section provides implementation guidelines for the requirements.
Organizations should follow a systematic approach to implementation.
The guidelines are based on industry best practices and regulatory requirements.
`;

// Test del parser
const result = parseTextStructure(exampleText);
console.log('=== STRUTTURA JSON COMPLETA (con proprietà del 4° livello) ===');
console.log(JSON.stringify(result, null, 2));

console.log('\n=== RAPPRESENTAZIONE VISUALE ===');
console.log(prettyPrintStructure(result));

console.log('\n=== ESEMPIO DI ACCESSO ALLE PROPRIETÀ ===');
const firstSubsection = result.chapters[0].sections[1].subsections[0];
console.log(`Sottosezione: ${firstSubsection.number} - ${firstSubsection.title}`);
console.log(`Proprietà disponibili: ${Object.keys(firstSubsection.properties).join(', ')}`);
if (firstSubsection.properties.requirement) {
    console.log(`\nRequirement: ${firstSubsection.properties.requirement}`);
}
if (firstSubsection.properties.rationale_and_supplemental_guidance) {
    console.log(`\nRationale: ${firstSubsection.properties.rationale_and_supplemental_guidance}`);
}
if (firstSubsection.properties.recommendation) {
    console.log(`\nRecommendation: ${firstSubsection.properties.recommendation}`);
}

// Funzione aggiuntiva per verificare che tutto il contenuto sia stato catturato
function analyzeContentCoverage(originalText, parsedStructure) {
    const allContent = [];
    
    function extractAllContent(node) {
        if (node.content) {
            allContent.push(node.content);
        }
        if (node.properties) {
            Object.values(node.properties).forEach(propContent => {
                allContent.push(propContent);
            });
        }
        if (node.sections) {
            node.sections.forEach(extractAllContent);
        }
        if (node.subsections) {
            node.subsections.forEach(extractAllContent);
        }
    }
    
    parsedStructure.chapters.forEach(extractAllContent);
    
    const totalParsedLength = allContent.join(' ').length;
    const originalLength = originalText.replace(/###/g, '').replace(/^\d+(\.\d+)*\s+[^\n]+$/gm, '').trim().length;
    
    console.log(`\n=== ANALISI COPERTURA CONTENUTO ===`);
    console.log(`Lunghezza testo originale (senza titoli): ~${originalLength} caratteri`);
    console.log(`Lunghezza contenuto parsato: ${totalParsedLength} caratteri`);
    console.log(`Numero di sezioni con contenuto: ${allContent.filter(c => c.length > 0).length}`);
    
    return {
        originalLength,
        parsedLength: totalParsedLength,
        coverage: totalParsedLength / originalLength * 100
    };
}

// Esporta le funzioni per l'uso in altri moduli
module.exports = {
    parseTextStructure,
    prettyPrintStructure,
    analyzeContentCoverage
};