/**
 * Parser specializzato per estrarre tabelle di requisiti da PDF IEC 62443
 * Ottimizzato per il formato specifico del documento caricato
 */

function parseIEC62443PDFTable(pdfText) {
    // Separa il testo in righe e pulisce
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);
    const result = {
        requirements: [],
        metadata: {
            documentTitle: "IEC 62443-2-4 Security Requirements",
            tableTitle: "Table A.1 – Security program requirements",
            totalRequirements: 0,
            parsedAt: new Date().toISOString()
        }
    };
    
    let currentRequirement = null;
    let isInTableData = false;
    let contentBuffer = [];
    let rationaleMode = false;
    
    // Pattern specifici per questo documento
    const reqIdPattern = /^(SP\.\d+\.\d+(?:\s*RE\(\d+\))?)\s+(BR|RE)\s+(.+)/;
    const tableHeaderPattern = /Req\s+ID.*BR\/RE.*Functional\s+area.*Topic.*Subtopic.*Doc.*Requirement\s+description/i;
    
    function parseRequirementLine(line, fullMatch) {
        const [, reqId, brRe, restOfLine] = fullMatch;
        
        // Clean req_id
        const cleanReqId = reqId.replace(/\s+/g, ' ').trim();
        
        // Parse the rest of the line more intelligently
        const parts = restOfLine.split(/\s+/);
        let functional_area = '';
        let topic = '';
        let subtopic = '';
        let doc = '';
        let description = '';
        
        // Look for common functional areas
        if (restOfLine.includes('Solution staffing')) {
            functional_area = 'Solution staffing';
            const afterFA = restOfLine.substring(restOfLine.indexOf('Solution staffing') + 'Solution staffing'.length).trim();
            
            // Look for topic patterns
            if (afterFA.startsWith('Training')) {
                topic = 'Training';
                const afterTopic = afterFA.substring(7).trim(); // 'Training'.length = 8
                
                // Look for subtopic patterns
                const subtopicMatch = afterTopic.match(/^([^N]*?)\s+(No|Yes)\s+(.+)/);
                if (subtopicMatch) {
                    subtopic = subtopicMatch[1].trim();
                    doc = subtopicMatch[2];
                    description = subtopicMatch[3];
                } else {
                    // Fallback parsing
                    const docMatch = afterTopic.match(/\s+(No|Yes)\s+(.+)/);
                    if (docMatch) {
                        doc = docMatch[1];
                        description = docMatch[2];
                    } else {
                        description = afterTopic;
                    }
                }
            } else if (afterFA.startsWith('Background')) {
                topic = 'Background checks';
                // Similar parsing for other topics...
            } else if (afterFA.startsWith('Personnel')) {
                topic = 'Personnel assignments';
                // Parse Personnel assignments...
            }
        } else if (restOfLine.includes('Assurance')) {
            functional_area = 'Assurance';
            // Parse Assurance section...
        }
        
        return {
            req_id: cleanReqId,
            br_re: brRe,
            functional_area: functional_area,
            topic: topic,
            subtopic: subtopic,
            doc: doc,
            requirement_description: description,
            rationale: '',
            line_number: 0
        };
    }
    
    function saveCurrentRequirement() {
        if (currentRequirement && contentBuffer.length > 0) {
            const fullContent = contentBuffer.join(' ');
            
            // Try to separate requirement description from rationale
            // Look for specific markers
            const rationalMarkers = [
                'The capability specified by this BR',
                'The capabilities specified by this BR', 
                'Having this capability means',
                'This requirement',
                'The capability'
            ];
            
            let rationaleStart = -1;
            for (const marker of rationalMarkers) {
                const index = fullContent.indexOf(marker);
                if (index > -1) {
                    rationaleStart = index;
                    break;
                }
            }
            
            if (rationaleStart > -1) {
                // Split between description and rationale
                const descPart = fullContent.substring(0, rationaleStart).trim();
                const ratPart = fullContent.substring(rationaleStart).trim();
                
                if (currentRequirement.requirement_description) {
                    currentRequirement.requirement_description += ' ' + descPart;
                } else {
                    currentRequirement.requirement_description = descPart;
                }
                currentRequirement.rationale = ratPart;
            } else {
                // No clear split - add all to description
                if (currentRequirement.requirement_description) {
                    currentRequirement.requirement_description += ' ' + fullContent;
                } else {
                    currentRequirement.requirement_description = fullContent;
                }
            }
            
            result.requirements.push(currentRequirement);
        }
    }
    
    // Main parsing loop
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines and page markers
        if (!line || line.includes('IEC 62443-2-4:2015') || 
            line.match(/^\d+$/) || line.includes('©')) {
            continue;
        }
        
        // Detect table header
        if (tableHeaderPattern.test(line)) {
            isInTableData = true;
            continue;
        }
        
        // Skip table continuation markers
        if (line.includes('Table A.1 (continued)') || 
            line.includes('(continued)')) {
            continue;
        }
        
        if (!isInTableData) continue;
        
        // Check for new requirement
        const reqMatch = line.match(reqIdPattern);
        if (reqMatch) {
            // Save previous requirement
            saveCurrentRequirement();
            
            // Start new requirement
            currentRequirement = parseRequirementLine(line, reqMatch);
            currentRequirement.line_number = i + 1;
            contentBuffer = [];
            rationaleMode = false;
            
        } else if (currentRequirement) {
            // Accumulate content for current requirement
            if (line && !line.includes('Table A.1') && !line.includes('continued')) {
                contentBuffer.push(line);
            }
        }
    }
    
    // Save the last requirement
    saveCurrentRequirement();
    
    result.metadata.totalRequirements = result.requirements.length;
    return result;
}

// Enhanced parser with better field extraction
function parseEnhancedPDFTable(pdfText) {
    const basicResult = parseIEC62443PDFTable(pdfText);
    
    // Post-process to improve data quality
    basicResult.requirements.forEach(req => {
        // Clean up text fields
        req.requirement_description = cleanAndNormalizeText(req.requirement_description);
        req.rationale = cleanAndNormalizeText(req.rationale);
        req.subtopic = cleanAndNormalizeText(req.subtopic);
        
        // Extract additional metadata
        extractRequirementMetadata(req);
        
        // Validate and fix common issues
        validateAndFixRequirement(req);
    });
    
    return basicResult;
}

function cleanAndNormalizeText(text) {
    if (!text) return '';
    
    return text
        .replace(/\s+/g, ' ')  // Normalizza spazi multipli
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // Spazi tra minuscole e maiuscole
        .replace(/\s*\.\s*/g, '. ')  // Normalizza punti
        .replace(/\s*,\s*/g, ', ')   // Normalizza virgole
        .replace(/\s*;\s*/g, '; ')   // Normalizza punto e virgola
        .replace(/\s*:\s*/g, ': ')   // Normalizza due punti
        .replace(/\s+([.,:;!?])/g, '$1')  // Rimuovi spazi prima punteggiatura
        .replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Spazi dopo punto e maiuscola
        .trim();
}

function extractRequirementMetadata(requirement) {
    const desc = requirement.requirement_description.toLowerCase();
    const fullText = (requirement.requirement_description + ' ' + requirement.rationale).toLowerCase();
    
    // Identifica tipo di requisito
    if (desc.includes('shall have the capability')) {
        requirement.requirement_type = 'capability';
    } else if (desc.includes('shall ensure')) {
        requirement.requirement_type = 'assurance';
    } else if (desc.includes('shall provide')) {
        requirement.requirement_type = 'provision';
    } else if (desc.includes('shall assign')) {
        requirement.requirement_type = 'assignment';
    } else if (desc.includes('shall identify')) {
        requirement.requirement_type = 'identification';
    }
    
    // Identifica criticità basata su parole chiave
    if (fullText.includes('critical') || fullText.includes('essential') || 
        fullText.includes('mandatory') || fullText.includes('required')) {
        requirement.criticality = 'high';
    } else if (fullText.includes('important') || fullText.includes('significant') || 
               fullText.includes('should')) {
        requirement.criticality = 'medium';
    } else {
        requirement.criticality = 'standard';
    }
    
    // Estrai riferimenti a standard
    const standards = [];
    const iecMatches = fullText.match(/iec\s+\d+(?:-\d+)*/g) || [];
    const isoMatches = fullText.match(/iso\/iec\s+\d+(?:-\d+)*/g) || [];
    const partMatches = fullText.match(/part\s+\d+(?:-\d+)*/g) || [];
    
    standards.push(...iecMatches.map(s => s.toUpperCase()));
    standards.push(...isoMatches.map(s => s.toUpperCase()));
    standards.push(...partMatches.map(s => s.toUpperCase()));
    
    requirement.standards_referenced = [...new Set(standards)];
    
    // Identifica attori coinvolti
    const actors = [];
    if (fullText.includes('service provider')) actors.push('Service Provider');
    if (fullText.includes('asset owner')) actors.push('Asset Owner');
    if (fullText.includes('subcontractor')) actors.push('Subcontractor');
    if (fullText.includes('consultant')) actors.push('Consultant');
    if (fullText.includes('personnel')) actors.push('Personnel');
    
    requirement.actors_involved = actors;
    
    // Identifica oggetti del requisito
    const subjects = [];
    if (fullText.includes('automation solution')) subjects.push('Automation Solution');
    if (fullText.includes('security')) subjects.push('Security');
    if (fullText.includes('training')) subjects.push('Training');
    if (fullText.includes('background check')) subjects.push('Background Check');
    if (fullText.includes('documentation')) subjects.push('Documentation');
    
    requirement.subjects = subjects;
}

function validateAndFixRequirement(requirement) {
    // Fix common parsing issues
    if (!requirement.functional_area && requirement.req_id.startsWith('SP.01')) {
        requirement.functional_area = 'Solution staffing';
    } else if (!requirement.functional_area && requirement.req_id.startsWith('SP.02')) {
        requirement.functional_area = 'Assurance';
    } else if (!requirement.functional_area && requirement.req_id.startsWith('SP.03')) {
        requirement.functional_area = 'Architecture';
    }
    
    // Ensure doc field has valid value
    if (!requirement.doc || (requirement.doc !== 'Yes' && requirement.doc !== 'No')) {
        // Try to extract from description
        const docMatch = requirement.requirement_description.match(/\b(Yes|No)\b/);
        if (docMatch) {
            requirement.doc = docMatch[1];
            // Remove from description
            requirement.requirement_description = requirement.requirement_description.replace(/\b(Yes|No)\b/, '').trim();
        } else {
            requirement.doc = 'Unknown';
        }
    }
    
    // Ensure RE numbers are properly formatted
    if (requirement.req_id.includes('RE') && !requirement.req_id.includes('RE(')) {
        requirement.req_id = requirement.req_id.replace(/RE(\d+)/, 'RE($1)');
    }
}

// Funzione per processare il PDF completo
function processFullPDF(pdfText) {
    console.log("Inizio parsing del PDF completo...");
    
    const result = parseEnhancedPDFTable(pdfText);
    
    // Aggiungi statistiche dettagliate
    const stats = generateDetailedStats(result);
    result.statistics = stats;
    
    return result;
}

function generateDetailedStats(parsedData) {
    const reqs = parsedData.requirements;
    
    return {
        total: reqs.length,
        by_type: {
            BR: reqs.filter(r => r.br_re === 'BR').length,
            RE: reqs.filter(r => r.br_re === 'RE').length
        },
        by_functional_area: countByField(reqs, 'functional_area'),
        by_topic: countByField(reqs, 'topic'),
        by_doc_required: {
            Yes: reqs.filter(r => r.doc === 'Yes').length,
            No: reqs.filter(r => r.doc === 'No').length,
            Unknown: reqs.filter(r => r.doc === 'Unknown').length
        },
        by_criticality: countByField(reqs, 'criticality'),
        by_requirement_type: countByField(reqs, 'requirement_type'),
        standards_coverage: {
            total_references: reqs.reduce((sum, r) => sum + (r.standards_referenced?.length || 0), 0),
            unique_standards: [...new Set(reqs.flatMap(r => r.standards_referenced || []))]
        }
    };
}

function countByField(items, field) {
    const counts = {};
    items.forEach(item => {
        const value = item[field] || 'Unknown';
        counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
}

// Funzioni di export
function exportToJSON(parsedData, pretty = true) {
    return JSON.stringify(parsedData, null, pretty ? 2 : 0);
}

function exportToCSV(parsedData) {
    const headers = [
        'Req ID', 'BR/RE', 'Functional Area', 'Topic', 'Subtopic', 
        'Doc Required', 'Requirement Description', 'Rationale',
        'Requirement Type', 'Criticality', 'Standards Referenced', 
        'Actors Involved', 'Subjects'
    ];
    
    let csv = headers.join(',') + '\n';
    
    parsedData.requirements.forEach(req => {
        const row = [
            escapeCSV(req.req_id),
            escapeCSV(req.br_re),
            escapeCSV(req.functional_area),
            escapeCSV(req.topic),
            escapeCSV(req.subtopic),
            escapeCSV(req.doc),
            escapeCSV(req.requirement_description),
            escapeCSV(req.rationale),
            escapeCSV(req.requirement_type || ''),
            escapeCSV(req.criticality || ''),
            escapeCSV((req.standards_referenced || []).join('; ')),
            escapeCSV((req.actors_involved || []).join('; ')),
            escapeCSV((req.subjects || []).join('; '))
        ];
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

function escapeCSV(field) {
    if (!field) return '""';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return '"' + str + '"';
}

// Test con contenuto del PDF reale
function testWithRealPDF() {
    console.log("=== TEST CON CONTENUTO PDF REALE ===");
    
    // Simulo il contenuto di alcune pagine del PDF
    const sampleContent = `
Table A.1 – Security program requirements
Req ID BR/RE Functional area Topic Subtopic Doc? Requirement description Rationale
SP.01.01 BR Solution staffing Training Security requirements – IEC 62443-2-4 No The service provider shall have the capability to ensure that it assigns only service provider personnel to Automation Solution related activities who have been informed of and comply with the responsibilities, policies, and procedures required by this specification. The capabilities specified by this BR and its REs are used to protect the Automation Solution from threats initiated by service provider, subcontractor, and consultant personnel who are not aware of their standard security responsibilities (i.e. security best practices). All too often, security compromises are the result of personnel taking an action without realizing they are violating a security best practice (e.g. plugging in an unauthorized USB memory stick) or failing to take an appropriate action (e.g. failure to update a perimeter firewall rule after removing an external workstation). Having this capability means that the service provider is able to provide service provider personnel to work on the Automation Solution who are security-aware. Approaches for informing personnel generally include training and/or review of procedures.

SP.01.01 RE(1) Solution staffing Training Security requirements – IEC 62443-2-4 No The service provider shall have the capability to ensure that it assigns only subcontractor or consultant personnel to Automation Solution related activities who have been informed of and comply with the responsibilities, policies, and procedures required by this specification. Having this capability means that the service provider is able to provide subcontractor personnel, consultants, and representatives to work on the Automation Solution who are security-aware. See ISO/IEC 27036-3 for additional supply chain organizational requirements.

SP.01.02 BR Solution staffing Training Security requirements – asset owner No The service provider shall have the capability to ensure that it assigns only service provider, subcontractor or consultant personnel to Automation Solution related activities who have been informed of and comply with the security-related responsibilities, policies, and procedures required by the asset owner. The capability specified by this BR minimizes threats to the Automation Solution that could be initiated by service provider, subcontractor, and consultant personnel who are not aware of their Automation Solution specific security responsibilities (as defined by the asset owner). All too often, security compromises are the result of personnel not being aware of asset owner defined security requirements (e.g. misusing an improperly sharing a maintenance account). Having this capability means that the service provider has an identifiable process for ensuring that personnel provided to work on the Automation Solution are knowledgeable of and comply with the security requirements of the asset owner.
`;
    
    const result = processFullPDF(sampleContent);
    
    console.log("\n=== RISULTATI PARSING ===");
    console.log(`Requisiti trovati: ${result.requirements.length}`);
    console.log("\n=== STATISTICHE ===");
    console.log(JSON.stringify(result.statistics, null, 2));
    
    console.log("\n=== PRIMI 2 REQUISITI ===");
    result.requirements.slice(0, 2).forEach((req, index) => {
        console.log(`\n--- Requisito ${index + 1} ---`);
        console.log(`ID: ${req.req_id}`);
        console.log(`Type: ${req.br_re}`);
        console.log(`Functional Area: ${req.functional_area}`);
        console.log(`Topic: ${req.topic}`);
        console.log(`Subtopic: ${req.subtopic}`);
        console.log(`Doc Required: ${req.doc}`);
        console.log(`Description: ${req.requirement_description.substring(0, 150)}...`);
        console.log(`Rationale: ${req.rationale.substring(0, 150)}...`);
        console.log(`Metadata: Type=${req.requirement_type}, Criticality=${req.criticality}`);
        console.log(`Standards: ${req.standards_referenced?.join(', ') || 'None'}`);
    });
    
    return result;
}

// Esegui il test
const testResult = testWithRealPDF();

// Esporta funzioni principali
module.exports = {
    parseIEC62443PDFTable,
    parseEnhancedPDFTable,
    processFullPDF,
    exportToJSON,
    exportToCSV,
    generateDetailedStats,
    cleanAndNormalizeText
};/**
 * Parser specializzato per estrarre tabelle di requisiti da PDF
 */

function parsePDFRequirementsTable(pdfText) {
    const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);
    const result = {
        requirements: [],
        metadata: {
            documentTitle: "",
            tableTitle: "",
            totalRequirements: 0,
            parsedAt: new Date().toISOString()
        }
    };
    
    let currentRequirement = null;
    let isInTableData = false;
    let contentBuffer = [];
    
    // Funzione per pulire e normalizzare il testo
    function cleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }
    
    // Funzione per identificare l'inizio di una nuova riga di tabella
    function isRequirementRow(line) {
        // Pattern per ID requisito: SP.XX.XX seguito da BR o RE
        return /^SP\.\d+\.\d+(\s+RE\(\d+\))?\s+(BR|RE)\s+/.test(line);
    }
    
    // Funzione per estrarre i campi dalla riga del requisito
    function parseRequirementRow(line) {
        // Regex più robusta per catturare tutti i campi
        const match = line.match(/^(SP\.\d+\.\d+(?:\s+RE\(\d+\))?)\s+(BR|RE)\s+(.+)/);
        if (!match) return null;
        
        const [, reqId, brRe, restOfLine] = match;
        
        // Parsing più sofisticato del resto della riga
        const parts = restOfLine.split(/\s+/);
        let functionalArea = "";
        let topic = "";
        let subtopic = "";
        let doc = "";
        let description = "";
        let rationale = "";
        
        // Cerca pattern comuni
        let foundDoc = false;
        let descriptionStart = -1;
        
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === "Yes" || parts[i] === "No") {
                doc = parts[i];
                foundDoc = true;
                descriptionStart = i + 1;
                break;
            }
        }
        
        if (foundDoc && descriptionStart > 0) {
            // Estrai functional area, topic, subtopic dai parts prima di Doc
            const beforeDoc = parts.slice(0, descriptionStart - 1);
            
            // Logica euristica per identificare i campi
            if (beforeDoc.length >= 3) {
                functionalArea = beforeDoc[0];
                topic = beforeDoc[1];
                subtopic = beforeDoc.slice(2).join(' ');
            } else if (beforeDoc.length === 2) {
                functionalArea = beforeDoc[0];
                topic = beforeDoc[1];
            } else if (beforeDoc.length === 1) {
                functionalArea = beforeDoc[0];
            }
            
            // Il resto è la description
            description = parts.slice(descriptionStart).join(' ');
        } else {
            // Fallback: tutto il resto è description
            description = restOfLine;
        }
        
        return {
            req_id: cleanText(reqId),
            br_re: cleanText(brRe),
            functional_area: cleanText(functionalArea),
            topic: cleanText(topic),
            subtopic: cleanText(subtopic),
            doc: cleanText(doc),
            requirement_description: cleanText(description),
            rationale: ""
        };
    }
    
    // Parsing principale
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Identifica metadati del documento
        if (line.includes("Annex A") && !result.metadata.documentTitle) {
            result.metadata.documentTitle = "Annex A - Security requirements";
        }
        
        if (line.includes("Table A.1") && !result.metadata.tableTitle) {
            result.metadata.tableTitle = line;
        }
        
        // Ignora header della tabella
        if (line.includes("Req ID") && line.includes("BR/RE") && line.includes("Functional area")) {
            isInTableData = true;
            continue;
        }
        
        if (!isInTableData) continue;
        
        // Identifica nuova riga di requisito
        if (isRequirementRow(line)) {
            // Salva il requisito precedente se esiste
            if (currentRequirement && contentBuffer.length > 0) {
                // Cerca di separare description da rationale
                const fullContent = contentBuffer.join(' ');
                const sentences = fullContent.split(/\.\s+/);
                
                // Euristica: le prime frasi sono description, il resto rationale
                if (sentences.length > 2) {
                    const midPoint = Math.ceil(sentences.length / 2);
                    currentRequirement.requirement_description += ' ' + sentences.slice(0, midPoint).join('. ') + '.';
                    currentRequirement.rationale = sentences.slice(midPoint).join('. ') + '.';
                } else {
                    currentRequirement.requirement_description += ' ' + fullContent;
                }
                
                result.requirements.push(currentRequirement);
            }
            
            // Inizia nuovo requisito
            currentRequirement = parseRequirementRow(line);
            contentBuffer = [];
            
        } else if (currentRequirement) {
            // Accumula contenuto per il requisito corrente
            if (line && !line.includes("Table A.1") && !line.includes("continued")) {
                contentBuffer.push(line);
            }
        }
    }
    
    // Salva l'ultimo requisito
    if (currentRequirement && contentBuffer.length > 0) {
        const fullContent = contentBuffer.join(' ');
        currentRequirement.requirement_description += ' ' + fullContent;
        result.requirements.push(currentRequirement);
    }
    
    result.metadata.totalRequirements = result.requirements.length;
    return result;
}

// Parser avanzato con machine learning pattern recognition
function parseAdvancedPDFTable(pdfText) {
    const result = parsePDFRequirementsTable(pdfText);
    
    // Post-processing per migliorare la qualità dei dati
    result.requirements.forEach(req => {
        // Pulisci i campi
        req.requirement_description = cleanAndFormatText(req.requirement_description);
        req.rationale = cleanAndFormatText(req.rationale);
        
        // Identifica pattern nei testi
        identifyRequirementPatterns(req);
    });
    
    return result;
}

function cleanAndFormatText(text) {
    if (!text) return "";
    
    return text
        .replace(/\s+/g, ' ')  // Normalizza spazi
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // Aggiungi spazi tra minuscole e maiuscole
        .replace(/\s*\.\s*/g, '. ')  // Normalizza punti
        .replace(/\s*,\s*/g, ', ')   // Normalizza virgole
        .replace(/\s+$/, '')         // Rimuovi spazi finali
        .trim();
}

function identifyRequirementPatterns(requirement) {
    const desc = requirement.requirement_description.toLowerCase();
    
    // Identifica tipo di requisito
    if (desc.includes('shall have the capability')) {
        requirement.requirement_type = 'capability';
    } else if (desc.includes('shall ensure')) {
        requirement.requirement_type = 'assurance';
    } else if (desc.includes('shall provide')) {
        requirement.requirement_type = 'provision';
    }
    
    // Identifica criticità
    if (desc.includes('critical') || desc.includes('essential')) {
        requirement.criticality = 'high';
    } else if (desc.includes('important') || desc.includes('significant')) {
        requirement.criticality = 'medium';
    } else {
        requirement.criticality = 'standard';
    }
    
    // Estrai riferimenti agli standard
    const standards = requirement.requirement_description.match(/IEC\s+\d+(?:-\d+)*/g) || [];
    const isoReferences = requirement.requirement_description.match(/ISO\/IEC\s+\d+(?:-\d+)*/g) || [];
    
    requirement.standards_referenced = [...standards, ...isoReferences];
}

// Funzione per convertire in formato CSV
function convertToCSV(parsedData) {
    const headers = [
        'Req ID', 'BR/RE', 'Functional Area', 'Topic', 'Subtopic', 
        'Doc?', 'Requirement Description', 'Rationale', 'Requirement Type', 
        'Criticality', 'Standards Referenced'
    ];
    
    let csv = headers.join(',') + '\n';
    
    parsedData.requirements.forEach(req => {
        const row = [
            `"${req.req_id}"`,
            `"${req.br_re}"`,
            `"${req.functional_area}"`,
            `"${req.topic}"`,
            `"${req.subtopic}"`,
            `"${req.doc}"`,
            `"${req.requirement_description.replace(/"/g, '""')}"`,
            `"${req.rationale.replace(/"/g, '""')}"`,
            `"${req.requirement_type || ''}"`,
            `"${req.criticality || ''}"`,
            `"${(req.standards_referenced || []).join('; ')}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

// Funzione di analisi e report
function generateAnalysisReport(parsedData) {
    const stats = {
        totalRequirements: parsedData.requirements.length,
        brCount: parsedData.requirements.filter(r => r.br_re === 'BR').length,
        reCount: parsedData.requirements.filter(r => r.br_re === 'RE').length,
        functionalAreas: [...new Set(parsedData.requirements.map(r => r.functional_area))],
        topics: [...new Set(parsedData.requirements.map(r => r.topic))],
        withDocumentation: parsedData.requirements.filter(r => r.doc === 'Yes').length
    };
    
    return {
        summary: stats,
        functionalAreaBreakdown: groupByField(parsedData.requirements, 'functional_area'),
        topicBreakdown: groupByField(parsedData.requirements, 'topic'),
        requirementTypes: groupByField(parsedData.requirements, 'requirement_type')
    };
}

function groupByField(requirements, field) {
    const groups = {};
    requirements.forEach(req => {
        const value = req[field] || 'Unknown';
        if (!groups[value]) {
            groups[value] = [];
        }
        groups[value].push(req);
    });
    return groups;
}

// Test con il contenuto del PDF
const testPDFContent = `
Annex A
(normative)
Security requirements
Table A.1 – Security program requirements
Req ID BR/RE Functional area Topic Subtopic Doc? Requirement description Rationale
SP.01.01 BR Solution staffing Training Security requirements – IEC 62443-2-4 No The service provider shall have the capability to ensure that it assigns only service provider personnel to Automation Solution related activities who have been informed of and comply with the responsibilities, policies, and procedures required by this specification. The capabilities specified by this BR and its REs are used to protect the Automation Solution from threats initiated by service provider, subcontractor, and consultant personnel who are not aware of their standard security responsibilities (i.e. security best practices). All too often, security compromises are the result of personnel taking an action without realizing they are violating a security best practice (e.g. plugging in an unauthorized USB memory stick) or failing to take an appropriate action (e.g. failure to update a perimeter firewall rule after removing an external workstation). Having this capability means that the service provider is able to provide service provider personnel to work on the Automation Solution who are security-aware. Approaches for informing personnel generally include training and/or review of procedures. NOTE 1 Asset owners may ask for acknowledgment of training in writing. NOTE 2 Maturity levels 3 and 4 (see 4.2) are applicable to the enforcement of (complying with) the responsibilities, policies, and procedures.
SP.01.01 RE(1) Solution staffing Training Security requirements – IEC 62443-2-4 No The service provider shall have the capability to ensure that it assigns only subcontractor or consultant personnel to Automation Solution related activities who have been informed of and comply with the responsibilities, policies, and procedures required by this specification. Having this capability means that the service provider is able to provide subcontractor personnel, consultants, and representatives to work on the Automation Solution who are security-aware. See ISO/IEC 27036-3 for additional supply chain organizational requirements.
SP.01.02 BR Solution staffing Training Security requirements – asset owner No The service provider shall have the capability to ensure that it assigns only service provider, subcontractor or consultant personnel to Automation Solution related activities who have been informed of and comply with the security-related responsibilities, policies, and procedures required by the asset owner.
`;

// Esegui il parsing
console.log("=== PARSING TABELLA PDF ===");
const parsedResult = parseAdvancedPDFTable(testPDFContent);
console.log(JSON.stringify(parsedResult, null, 2));

console.log("\n=== ANALISI STATISTICA ===");
const analysisReport = generateAnalysisReport(parsedResult);
console.log(JSON.stringify(analysisReport.summary, null, 2));

// Esporta le funzioni
module.exports = {
    parsePDFRequirementsTable,
    parseAdvancedPDFTable,
    convertToCSV,
    generateAnalysisReport,
    cleanAndFormatText
};