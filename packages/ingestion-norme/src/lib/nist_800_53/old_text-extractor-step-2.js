// extractor.js (CommonJS)
// Uso:
//   Step 1: node extractor.js /path/to/config.json 1
//   Step 2: node extractor.js /path/to/config.json 2

const fs = require('fs');
const path = require('path');
const ENH_Utils = require('./extract-control-enhancements');

function exitWithError(msg, code = 1) {
  console.error(`[ERRORE] ${msg}`);
  process.exit(code);
}

function ensureDirSync(filePathOrDir) {
  const dir = fs.existsSync(filePathOrDir) && fs.lstatSync(filePathOrDir).isDirectory()
    ? filePathOrDir
    : path.dirname(filePathOrDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSONSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    exitWithError(`Impossibile leggere o parsare il JSON: ${err.message}`);
  }
}

function readTextSync(filePath) {
  try {
    let text = fs.readFileSync(filePath, 'utf8');
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // BOM
    return text;
  } catch (err) {
    exitWithError(`Impossibile leggere il file di input: ${err.message}`);
  }
}

function parseNISTControls(linesArray) {
    /**
     * Analizza un array di linee e estrae i controlli NIST
     * @param {string[]} linesArray - Array di linee di testo
     * @returns {Array} Array di oggetti {id, name, lines, startIndex, endIndex}
     */
    
    const controls = [];
    const lines = linesArray || [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Cerca pattern ID (XX-N o XXX-N)
        const idMatch = line.match(/^([A-Z]{2,3}-\d+)/);
        
        if (idMatch) {
            const potentialId = idMatch[1];
            
            // Verifica se è davvero un controllo cercando "Control:" nelle prossime 2-3 linee
            const controlLineIndex = findControlLine(lines, i, 3);
            
            if (controlLineIndex !== -1) {
                // È un controllo valido
                const control = extractControl(lines, i, potentialId, controlLineIndex);
                controls.push(control);
                
                // Salta alla fine di questo controllo per evitare sovrapposizioni
                i = control.endIndex;
            }
        }
    }
    
    return controls;
}

function findControlLine(lines, startIndex, maxDistance) {
    /**
     * Cerca una linea che inizia con "Control:" entro maxDistance linee
     */
    for (let i = startIndex; i < Math.min(lines.length, startIndex + maxDistance + 1); i++) {
        if (lines[i].trim().startsWith('Control:')) {
            return i;
        }
    }
    return -1;
}

function extractControl(lines, idLineIndex, id, controlLineIndex) {
    /**
     * Estrae un singolo controllo completo
     */
    const idLine = lines[idLineIndex].trim();
    
    // Determina il nome del controllo
    let name = '';
    
    // Caso 1: ID e nome sulla stessa riga
    const sameLine = idLine.replace(/^[A-Z]{2,3}-\d+\s*/, '').trim();
    if (sameLine.length > 0) {
        name = sameLine;
    } 
    // Caso 2: Nome nella riga successiva
    else if (idLineIndex + 1 < lines.length) {
        name = lines[idLineIndex + 1].trim();
    }
    
    // Trova l'inizio del prossimo controllo o la fine del documento
    const nextControlIndex = findNextControl(lines, controlLineIndex + 1);
    const endIndex = nextControlIndex === -1 ? lines.length - 1 : nextControlIndex - 1;
    
    // Estrai le linee a partire da "Control:"
    const controlLines = [];
    for (let i = controlLineIndex; i <= endIndex; i++) {
        controlLines.push(lines[i].substring(6));
    }

    const returnedControl =  {
        id: id,
        name: name,
        lines: controlLines,
        startIndex: idLineIndex,
        endIndex: endIndex,
        controlLineIndex: controlLineIndex
    };
    const controlEx = extractControlEnhanements(returnedControl);
    returnedControl.sections = extractControlSections({lines:controlEx.controlLines});
    returnedControl.enhancementLines = controlEx.enhancementLines;
    returnedControl.enhancements = ENH_Utils.parseControlEnhancements(controlEx.enhancementLines);
    return ENH_Utils.extractControlAssignments(returnedControl);
}

function findNextControl(lines, startIndex) {
    /**
     * Trova l'inizio del prossimo controllo
     */
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        const idMatch = line.match(/^([A-Z]{2,3}-\d+)/);
        
        if (idMatch) {
            // Verifica se è davvero un controllo
            const controlLineIndex = findControlLine(lines, i, 3);
            if (controlLineIndex !== -1) {
                return i;
            }
        }
    }
    return -1;
}

// Funzione di utilità per estrarre sezioni specifiche
function extractControlEnhanements(control) {
  const enhancementLines = [];
  const controlLines = [];
  let seenEnhancements = false;
  for (const line of control.lines) {
      const trimmed = line.trim();
      // Identifica nuove sezioni
      if (trimmed.match(/^(Control Enhancements):\s*/i)) {
          seenEnhancements = true;
          enhancementLines.push(line);
      }
      else if (trimmed.match(/^(References):\s*/i)) {
          seenEnhancements = false;
          controlLines.push(line);
      } else if (seenEnhancements) {
          enhancementLines.push(line);
      } else {
        controlLines.push(line);
      }
  }
  return {
    enhancementLines,
    controlLines
  }
}
function extractControlSections(control) {
    /**
     * Estrae sezioni specifiche (Control, Discussion, etc.) da un controllo
     */
    const sections = {};
    let currentSection = null;
    let currentContent = [];
    
    for (const line of control.lines) {
        const trimmed = line.trim();
        
        // Identifica nuove sezioni
        if (trimmed.match(/^(Control|Discussion|Related Controls?|References?):\s*/i)) {
            // Salva la sezione precedente
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }
            
            // Inizia nuova sezione
            const sectionMatch = trimmed.match(/^([^:]+):\s*(.*)/i);
            currentSection = sectionMatch[1].toLowerCase();
            currentContent = sectionMatch[2] ? [sectionMatch[2]] : [];
        } else if (currentSection && trimmed) {
            // Aggiungi contenuto alla sezione corrente
            currentContent.push(trimmed);
        }
    }
    
    // Salva l'ultima sezione
    if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
    }
    
    return sections;
}


function step2(params) {
  const step2Cfg = params && params.step2;
  if (!step2Cfg || !step2Cfg.inputJSONPath || !step2Cfg.outputJSONPath) {
    exitWithError('Parametri mancanti per step 2: servono "nist_800_53.step2.inputJSONPath" e "nist_800_53.step2.outputJSONPath".');
  }

  const {
    inputJSONPath,
    outputJSONPath,
    includeHeadingInLines = false,   // opzionale
  } = step2Cfg;

  const block = readJSONSync(inputJSONPath);
  let lines = Array.isArray(block?.lines) ? block.lines.slice() : null;
  if (!lines) {
    if (typeof block?.content === 'string') {
      lines = block.content.split(/\r?\n/);
    } else {
      exitWithError('File di input step2 non valido: manca "lines" e "content".');
    }
  }

  const result = parseNISTControls(lines);

  // Metadati utili
  const outObj = {
    meta: {
      source: inputJSONPath,
      extractedAt: new Date().toISOString(),
    },
    ...result
  };

  ensureDirSync(outputJSONPath);
  fs.writeFileSync(step2Cfg.outputJSONPath, JSON.stringify(outObj, null, 2), 'utf8');
  console.log(`[OK] Step 2 completato. Output: ${step2Cfg.outputJSONPath}`);
}

/* -------------------------------- MAIN ----------------------------------- */

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node extractor.js <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.nist_800_53) {
    exitWithError('Configurazione non valida: proprietà radice "nist_800_53" mancante.');
  }

  let params;

  switch (stepNumber) {
    case 2:
      params = config.nist_800_53;
      step2(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Implementato 2.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
