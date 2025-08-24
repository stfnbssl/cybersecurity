const fs = require('fs');
const path = require('path');

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

function processJsonObject(obj) {
  const sectionHeaders = ["Control", "Purpose", "Guidance", "Other information"];
  const lines = obj.lines;
  
  if (!lines || !Array.isArray(lines)) {
    return obj;
  }
  
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Controlla se la linea corrente è un header di sezione
    if (sectionHeaders.includes(trimmedLine)) {
      // Se stavamo già processando una sezione, salva il contenuto
      if (currentSection && currentContent.length > 0) {
        obj[currentSection] = currentContent.join('\n');
      }
      
      // Inizia una nuova sezione
      currentSection = trimmedLine;
      currentContent = [];
    } else if (currentSection) {
      // Se siamo in una sezione, aggiungi la linea al contenuto
      currentContent.push(line);
    }
  }
  
  // Salva l'ultima sezione se presente
  if (currentSection && currentContent.length > 0) {
    obj[currentSection] = currentContent.join('\n');
  }
  
  return obj;
}

// Esempio di utilizzo:
/*
const data = {
  "id": "5.2",
  "lines": [
    "Testo iniziale",
    "Control",
    "Linea di controllo 1",
    "Linea di controllo 2",
    "Purpose",
    "Scopo del documento",
    "Dettagli sullo scopo",
    "Guidance",
    "Prima guida",
    "Seconda guida",
    "Other information",
    "Informazioni aggiuntive",
    "Note finali"
  ]
};

const result = processJsonObject(data);
console.log(result);

// Output atteso:
// {
//   "id": "5.2",
//   "lines": [...],
//   "Control": "Linea di controllo 1\nLinea di controllo 2",
//   "Purpose": "Scopo del documento\nDettagli sullo scopo",
//   "Guidance": "Prima guida\nSeconda guida",
//   "Other information": "Informazioni aggiuntive\nNote finali"
// }
*/

function step3(params) {
  const step3Cfg = params && params.step3;
  if (!step3Cfg || !step3Cfg.inputJSONPath || !step3Cfg.outputJSONPath) {
    exitWithError('Parametri mancanti per step 2: servono "iec_27001.step3.inputJSONPath" e "iec_27001.step3.outputJSONPath".');
  }
  const {
    inputJSONPath,
    outputJSONPath
  } = step3Cfg;
  // Carica blocco: { content, lines }
  const block = readJSONSync(inputJSONPath);

  block.l1Sections.forEach(element => {
    element.children.forEach(control => {
        processJsonObject(control);
    });
  });
  ensureDirSync(outputJSONPath);
  fs.writeFileSync(outputJSONPath, JSON.stringify(block, null, 2), 'utf8');
}

/* -------------------------------- MAIN ----------------------------------- */

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node text-extractor-step-3.js <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.iec_27001) {
    exitWithError('Configurazione non valida: proprietà radice "iec_27001" mancante.');
  }

  let params;
  
  switch (stepNumber) {
    case 3:
      params = config.iec_27001;
      step3(params);
      break;
    case 23:
      params = config.iec_27002;
      step3(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Implementati step 3 e 23.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
