function parseArticleSubSections(lines) {
  const result = {
    initialText: "",
    items: []
  };
  
  let currentLevel1 = null; // PART I, II, III, ...
  let currentLevel2 = null; // (A), (B), (C), ...
  let currentLevel3 = null; // (1), (2), (3), ...
  let isLevel2WithoutLevel1 = false;
  let isLevel3WithoutLevel2 = false;
    
  let foundFirstLetter = false;
  let initialTextLines = [];
  let previousMatchOrdinal = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text.trim();
    if (!line) continue;
    
    // Livello 0: // PART I, II, III, ...
    let level1Match = line.match(/^\s*Part\s+(I{1,3}|IV|IX|V?I{0,3}|X[IX]?|X{0,3}I{0,3}|XIX|XX)\.\s+([a-zA-Z]+.*)/);
    
    // Livello 1: lettere maiuscole tra parentesi ((A), (B), (C), ...)
    let level2Match = line.match(/^\(([A-Z])\)\s*(.*)/);

    // Livello 2: numeri tra parentesi ((1), (2), (3), ...)
    let level3Match = line.match(/^\((\d+)\)\s*(.*)/);
    
    /*
    console.log("line", '"' + line + '"');
    console.log("level1Match", level1Match);
    console.log("level2Match", level2Match);
    console.log("level3Match", level3Match);
    */
    
    if (level2Match && !currentLevel1) {
      isLevel2WithoutLevel1 = true
    }
    if (level3Match && !currentLevel2) {
      isLevel3WithoutLevel2 = true
    }
    
    if (level1Match) {

      if (!foundFirstLetter) {
        result.initialText = initialTextLines.join(" ");
        foundFirstLetter = true;
      }
      const ordinal = level1Match[1];
      const text = level1Match[2];
      console.log("line", '"' + line + '"');
      console.log("level1Match", level1Match);
      console.log("ordinal, text", ordinal, text);
      currentLevel1 = {
        kind: 'PART',
        ordinal: ordinal,
        text: text,
        items: []
      };
      console.log("currentLevel1", currentLevel1);
      result.items.push(currentLevel1);
      currentLevel2 = null;
      currentLevel3 = null;
      isLevel2WithoutLevel1 = false;
      isLevel3WithoutLevel2 = false;
      previousMatchOrdinal = ordinal;

    } else if (level2Match) {
      
      const ordinal = level2Match[1];
      const text = level2Match[2];
      //console.log("line", '"' + line + '"');
      //console.log("level2Match", ordinal, text);
      currentLevel2 = {
        kind: "subsection",
        ordinal: ordinal,
        text: text,
        items: []
      };
      if (isLevel2WithoutLevel1) {
        if (!foundFirstLetter) {
          result.initialText = initialTextLines.join(" ");
          foundFirstLetter = true;
          result.items.push(currentLevel2);
        }
      } else {
          currentLevel1.items.push(currentLevel2);
      }
      currentLevel3 = null;
      isLevel3WithoutLevel2 = false;
      previousMatchOrdinal = ordinal;

    } else if (level3Match) {
      
      // Nuovo paeagrafo numerico
      const ordinal = level3Match[1];
      const text = level3Match[2];
      //console.log("line", '"' + line + '"');
      //console.log("level3Match", ordinal, text);
      currentLevel3 = {
        kind: "paragraph",
        ordinal: ordinal,
        text: text,
        items: []
      };
      if (currentLevel2) {
          currentLevel2.items.push(currentLevel3);
      } else if (currentLevel1) {
          currentLevel1.items.push(currentLevel3);
      } else {
        if (!foundFirstLetter) {
            result.initialText = initialTextLines.join(" ");
            foundFirstLetter = true;
          }
          result.items.push(currentLevel3);
      } 
      previousMatchOrdinal = ordinal;
    
    } else if (!foundFirstLetter) {
      // Testo iniziale
      initialTextLines.push(line);
      
    } else {
      // Continua il testo dell'elemento corrente
      if (currentLevel3) {
        currentLevel3.text += " " + line;
      } else if (currentLevel2) {
        currentLevel2.text += " " + line;
      } else if (currentLevel1) {
        currentLevel1.text += " " + line;
      }
    }
  }
  
  if (!foundFirstLetter) {
    result.initialText = initialTextLines.join(" ");
  }
  
  return {
      metadata: { 
          parser: "parseArticleSubSections", 
          source: __filename,
      },
      result: result,
  };
}

// Esempio d'uso con i dati che hai fornito
const articleLines = [
  {
     text: "This is the introductory text of the article.",
  },
  {
     text: "Part I. General",
  },
  {
     text: "(A) For the purposes of the ... shall submit:",
  },
  {
     text: "(1) an early warning notification .... ;",
  },
  {
     text: "(2) unless the relevant information has at least the following:",
  },
  {
     text: "(B) Additional requirements may include:",
  },
  {
     text: "(1) documentation of processes;",
  },
  {
     text: "(2) verification procedures."
  },
];

// Funzione per visualizzare la struttura in modo leggibile
function printStructure(data) {
  console.log("\n=== Struttura Articolo ===");
  
  if (data.initialText) {
    console.log("Testo iniziale:", data.initialText);
    console.log();
  }
  
  data.items.forEach(part => {
    console.log(`${part.kind} ${part.ordinal}. ${part.text}`);
    part.items.forEach(subsection => {
      console.log(`  ${subsection.kind} (${subsection.ordinal}) ${subsection.text}`);
      subsection.items.forEach(paragraph => {
        console.log(`      ${paragraph.kind} (${paragraph.ordinal}) ${paragraph.text}`);
      });
    });
    console.log();
  });
}

async function main() {
    console.log("=== Risultato Parsing ===");
    const parsed = parseArticleSubSections(articleLines);
    console.log(JSON.stringify(parsed.result, null, 2));
    printStructure(parsed.result);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArticleSubSections
}