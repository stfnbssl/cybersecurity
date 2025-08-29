/**
 * Parser per estrarre Requirement e Rationale da documenti strutturati
 * Mantiene la struttura gerarchica dei livelli numerici
 */

function parseLevelTitle(text) {
  const trimmed = text.trim();
  
  // Prova regex flessibile
  const match = trimmed.match(/^(\d+(?:\.\d+)*)(?:\s+(.+))?$/);
  
  if (match) {
    return {
      level: match[1],
      title: match[2] || ''
    };
  }
  
  return null;
}

function parse27001Document(lines) {
  const result = {
    structure: []
  };

  let currentSection = null;
  let skipNextLine = false;
  let skipNext2Line = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip linee vuote
    if (!line) continue;

    // Se dobbiamo saltare la prossima linea (titolo del livello)
    if (skipNext2Line) {
      skipNext2Line = false;
      skipNextLine = true;
      continue;
    } else if (skipNextLine) {
      skipNextLine = false;
      continue;
    }

    // Identifica numerazione dei livelli (es: "4", "4.1", "4.2.1", "4.2.1.1")
    // const levelMatch = line.match(/^(\d+(?:\.\d+)*)$/);
    const parsed = parseLevelTitle(trimmed);
    // const [, level, title] = trimmed.match(/^(\d+(?:\.\d+)*)\s+(.+)$/) || [];
    if (parsed && parsed.level && parsed.title) {
      console.log(parsed.level, parsed.title);
      currentSection = {
        level: parsed.level,
        title: parsed.title,
        lines: []
      };
      result.structure.push(currentSection);
    } else if (parsed && parsed.level) {
      // console.log(parsed.level, lines[i+1].trim());
      currentSection = {
        level: parsed.level,
        title: lines[i+1].trim(),
        lines: []
      };
      result.structure.push(currentSection);
      skipNextLine = true;
    } else {
      // Aggiungi la linea alla sezione corrente (se esiste)
      if (currentSection && line.trim().length > 0) {
        // console.log("line", line);
        currentSection.lines.push(line.replace('\t ', ' '));
      }
    }
  }

  return result;
}

function format27001Result(parsed) {
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
function extract27001StructureWithLines(inputData) {
  const lines = inputData.lines || inputData;
  const parsed = parse27001Document(lines);
  return format27001Result(parsed);
}

// Export per CommonJS
module.exports = {
  extract27001StructureWithLines,
  parse27001Document,
  format27001Result
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