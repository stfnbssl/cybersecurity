const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

const ControlTypes = ["Preventive" , "Detective", "Corrective"];
const InformationSecurityProperties = ["Confidentiality", "Integrity", "Availability"];
const CybersecurityConcepts = ["Identify", "Protect", "Detect", "Respond", "Recover"];
const OperationalCapabilities = [
  "Governance", 
  "Asset_management",
  "Information_protection", 
  "Human_resource_security", 
  "Physical_security", 
  "System_and_network_security", 
  "Application_security", 
  "Secure_configuration", 
  "Identity_and_access_management",
  "Threat_and_vulnerability_management", 
  "Continuity", 
  "Supplier_relationships_security", 
  "Legal_and_compliance", 
  "Information_security_event_management", 
  "Information_security_assurance"
];
const SecurityDomains = ["Governance_and_Ecosystem", "Protection",  "Defence",  "Resilience"];
const SecurityDomainsFull = [
  { 
    name: "Governance and Ecosystem", 
    includes: [
      "Information System Security Governance",
      "Risk Management", 
      "Ecosystem cybersecurity management"
    ]
  },{
    name: "Protection", 
    includes:[
      "IT Security Architecture", 
      "IT Security Administration",
      "Identity and access management", 
      "IT Security Maintenance",
      "Physical and environmental security"
    ]
  }, {
    name: "Defence", 
    includes:[
      "Detection",
      "Computer Security Incident Management" 
    ]
  }, {
    name: "Resilience",
    includes:[
      "Continuity of operations",
      "Crisis management"
    ] 
  } 
];

function setControlAttributes(obj) {
    if (!obj.attributes) {
        obj.attributes = {
          ControlType: null,
          InformationSecurityProperties: [],
          CybersecurityConcepts: [],
          OperationalCapabilities: [],
          SecurityDomains: [],    
        }
    }
}

function processAttribute(obj, attributeLines) {
  console.log('attributeLines.join()', attributeLines.join(''));
  const keys = attributeLines.join('').split(['#']);
  keys.forEach(key => {
    const trimmed = key.trim();
    console.log('key', trimmed, [...trimmed].map(c => c.charCodeAt(0)));
    // console.log("Char codes:", [...normLine].map(c => c.charCodeAt(0)));    
    if (ControlTypes.indexOf(trimmed) > -1) {
        setControlAttributes(obj);
        obj.attributes.ControlType = trimmed;
    } else if (InformationSecurityProperties.indexOf(trimmed) > -1) {
        setControlAttributes(obj);
        obj.attributes.InformationSecurityProperties.push(trimmed);
    } else if (CybersecurityConcepts.indexOf(trimmed) > -1) {
        setControlAttributes(obj);
        obj.attributes.CybersecurityConcepts.push(trimmed);
    } else if (OperationalCapabilities.indexOf(trimmed) > -1) {
        setControlAttributes(obj);
        obj.attributes.OperationalCapabilities.push(trimmed);     
    } else if (SecurityDomains.indexOf(trimmed) > -1) {
        setControlAttributes(obj);
        obj.attributes.SecurityDomains.push(trimmed);           
    }    
  });
}

function processJsonObject(obj) {
  const sectionHeaders = ["Control", "Purpose", "Guidance", "Other information"];
  const lines = obj.lines;
  
  if (!lines || !Array.isArray(lines)) {
    return obj;
  }
  
  let currentSection = null;
  let currentContent = [];
  let attributeLines = [];
  
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
    } else {
        attributeLines.push(trimmedLine);
    }
  }
  
  // Salva l'ultima sezione se presente
  if (currentSection && currentContent.length > 0) {
    obj[currentSection] = currentContent.join('\n');
  }

  processAttribute(obj, attributeLines);
  
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

  /*
  block.l1Sections.forEach(element => {
    element.children.forEach(control => {
        processJsonObject(control);
    });
  });
  */
  block.structure.forEach(control => {
    processJsonObject(control);
  });
  ensureDirSync(outputJSONPath);
  writeJSONSync(outputJSONPath, block);
  console.log(`✅ Creato file ${outputJSONPath} con successo!`);
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
