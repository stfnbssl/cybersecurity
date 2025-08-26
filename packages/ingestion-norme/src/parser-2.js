/**
 * Parser per estrarre Requirement e Rationale da documenti strutturati
 * Mantiene la struttura gerarchica dei livelli numerici
 */

function parseDocument(lines) {
  const result = {
    structure: []
  };

  let currentSection = null;
  let skipNextLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip linee vuote
    if (!line) continue;

    // Se dobbiamo saltare la prossima linea (titolo del livello)
    if (skipNextLine) {
      skipNextLine = false;
      continue;
    }

    // Identifica numerazione dei livelli (es: "4", "4.1", "4.2.1", "4.2.1.1")
    const levelMatch = line.match(/^(\d+(?:\.\d+)*)$/);
    if (levelMatch) {
      const currentLevel = levelMatch[1];
      
      // La prossima linea dovrebbe contenere il titolo del livello
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        currentSection = {
          level: currentLevel,
          title: nextLine,
          lines: []
        };
        result.structure.push(currentSection);
        skipNextLine = true; // Saltiamo il titolo nella raccolta delle linee
      }
      continue;
    }

    // Aggiungi la linea alla sezione corrente (se esiste)
    if (currentSection && line.trim().length > 0) {
      currentSection.lines.push(line);
    }
  }

  return result;
}

function formatResult(parsed) {
  return {
    metadata: {
      totalSections: parsed.structure.length,
      timestamp: new Date().toISOString()
    },
    structure: parsed.structure.map(section => ({
      level: section.level,
      title: section.title,
      lines: section.lines,
      lineCount: section.lines.length
    }))
  };
}

// Funzione principale di export
function extractStructureWithLines(inputData) {
  const lines = inputData.lines || inputData;
  const parsed = parseDocument(lines);
  return formatResult(parsed);
}

// Export per CommonJS
module.exports = {
  extractStructureWithLines,
  parseDocument,
  formatResult
};

// Esempio di utilizzo con i tuoi dati
if (require.main === module) {
  const testData = {
    "lines": [
      "  4",
      "    Zone, conduit and risk assessment requirements",
      "  4.1",
      "    Overview",
      "  Clause 4 describes the requirements for partitioning an SUC into zones and conduits as well",
      "  as the requirements for assessing the cyber security risk and determining the SL-T for each",
      "  defined zone and conduit. The requirements introduced in Clause 4 are referred to as zone",
      "  and conduit requirements (ZCR). Clause 4 also provides rationale and supplemental guidance",
      "  on each of the requirements. Figure 1 is a workflow diagram outlining the primary steps",
      "  required to establish zones and conduits, as well as to assess risk. The steps are numbered",
      "  to indicate their relationship to the ZCRs.",
      "      Figure 1 – Workflow diagram outlining the primary steps required",
      "        to establish zones and conduits, as well as to assess risk",
      "  4.2",
      "    ZCR 1: Identify the SUC",
      "  4.2.1",
      "      ZCR 1.1: Identify the SUC perimeter and access points",
      "  4.2.1.1",
      "      Requirement",
      "  The organization shall clearly identify the SUC, including clear demarcation of the security",
      "  perimeter and identification of all access points to the SUC.",
      "  4.2.1.2",
      "      Rationale and supplemental guidance",
      "  Organizations typically own and operate multiple control systems, especially larger",
      "  organizations with multiple industrial facilities. Any of these control systems may be defined",
      "  as a SUC. For example, there is generally at least one control system at an industrial facility,",
      "  but oftentimes there are several systems that control various functions within the facility.",
      "  This requirement specifies that SUCs are identified for the purpose of performing cyber",
      "  security analysis. The definition of a SUC is intended to include all IACS assets that are",
      "  needed to provide a complete automation solution.",
      "  System inventory, architecture diagrams, network diagrams and dataflows can be used to",
      "  determine and illustrate the IACS assets that are included in the SUC description.",
      "  NOTE The SUC can include multiple subsystems such as basic process control systems (BPCSs), distributed",
      "  control systems (DCSs), safety instrumented systems (SISs), supervisory control and data acquisition (SCADA)",
      "  and IACS product supplier's packages. This could also include emerging technologies such as the industrial",
      "  Internet of Things (IIoT) or cloud-based solutions."
    ]
  };

  // Test dello script
  console.log('=== TEST DEL PARSER ===');
  const result = extractStructureWithLines(testData);
  console.log(JSON.stringify(result, null, 2));
}