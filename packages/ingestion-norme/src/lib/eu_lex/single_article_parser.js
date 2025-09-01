function parseArticleSections(lines) {
  const result = {
    initialText: "",
    points: []
  };
  
  let currentLevel1 = null; // 1., 2., 3., ...
  let currentLevel2 = null; // (a), (b), (c), ...
  let currentLevel3 = null; // (i), (ii), (iii), ...
  
  let foundFirstNumber = false;
  let initialTextLines = [];
  
  let previousMatchNumberLetterRoman = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Livello 1: numeri con punto (1., 2., 3., ...)
    const level1Match = line.match(/^(\d+)\.\s*(.*)/);
    
    // Livello 1b: numeri tra parentesi ((1), (2), (3), ...)
    let level1bMatch = line.match(/^\((\d+)\)\s*(.*)/);

    // Livello 2: lettere tra parentesi ((a), (b), (c), ...)
    let level2Match = line.match(/^\(([a-z])\)\s*(.*)/);

    // Livello 3: numeri romani tra parentesi ((i), (ii), (iii), ...)
    const level3Match = line.match(/^\(([ivx]+)\)\s*(.*)/i);
    
    console.log("line", '"' + line + '"');
    console.log("level1Match", level1Match);
    console.log("level1bMatch", level1bMatch);    
    console.log("level2Match", level2Match);
    console.log("level3Match", level3Match);
    let isLevel2WithoutLevel1 = false;
    if (level2Match && !currentLevel1) {
      const test = line.trim().match(/^\(([a-z])\)\s*(.*)/);
      if (test && test.index == 0) {
          isLevel2WithoutLevel1 = true
      }
    }

    if (level2Match && level3Match && previousMatchNumberLetterRoman != 'h') {
      level2Match = null;
    }

    if (level1Match || level1bMatch) {
      // Nuovo capo principale
      if (!foundFirstNumber) {
        result.initialText = initialTextLines.join(" ");
        foundFirstNumber = true;
      }
      
      const number = level1Match ? parseInt(level1Match[1]) : parseInt(level1bMatch[1]);
      const text = level1Match ? level1Match[2] : level1bMatch[2];

      //console.log("line", '"' + line + '"');
      //console.log("level1Match", number, text);
      
      currentLevel1 = {
        number: number,
        text: text,
        subpoints: []
      };
      
      result.points.push(currentLevel1);
      currentLevel2 = null;
      currentLevel3 = null;

      previousMatchNumberLetterRoman = number;
      
    } else if (level2Match && (currentLevel1 || isLevel2WithoutLevel1)) {
      // Nuovo sottocapo alfabetico
      const letter = level2Match[1];
      const text = level2Match[2];

      //console.log("line", '"' + line + '"');
      //console.log("level2Match", letter, text);
      
      currentLevel2 = {
        letter: letter,
        text: text,
        subpoints: []
      };
      
      if (isLevel2WithoutLevel1) {
        if (!foundFirstNumber) {
          result.initialText = initialTextLines.join(" ");
          foundFirstNumber = true;
        }
        result.points.push(currentLevel2);
      } else {
        currentLevel1.subpoints.push(currentLevel2);
      }
      previousMatchNumberLetterRoman = letter;
      currentLevel3 = null;
    } else if (level3Match && currentLevel2) {
      // Nuovo sottopunto romano
      const roman = level3Match[1];
      const text = level3Match[2];

      //console.log("line", '"' + line + '"');
      //console.log("level3Match", roman, text);
      
      currentLevel3 = {
        roman: roman,
        text: text
      };
      
      currentLevel2.subpoints.push(currentLevel3);
      previousMatchNumberLetterRoman = roman;
      
    } else if (!foundFirstNumber) {
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
  
  if (!foundFirstNumber) {
    result.initialText = initialTextLines.join(" ");
  }
  
    return {
        metadata: { 
            parser: "parseArticleSections", 
            source: __filename,
        },
        result: result,
    };
}

// Funzione helper per convertire numeri romani in decimali
function romanToDecimal(roman) {
  const romanNumerals = {
    'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000
  };
  
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanNumerals[roman[i].toLowerCase()];
    const next = romanNumerals[roman[i + 1]?.toLowerCase()];
    
    if (next && current < next) {
      result += next - current;
      i++; // Skip next character
    } else {
      result += current;
    }
  }
  return result;
}

// Versione con ordinamento automatico dei numeri romani
function parseArticleSectionsWithSorting(lines) {
  const result = parseArticleSections(lines);
  
  // Ordina i sottopunti romani per valore numerico
  result.points.forEach(point => {
    point.subpoints.forEach(subpoint => {
      subpoint.subpoints.sort((a, b) => {
        const aVal = romanToDecimal(a.roman);
        const bVal = romanToDecimal(b.roman);
        return aVal - bVal;
      });
    });
  });
  
  return result;
}

// Esempio d'uso con i dati che hai fornito
const articleLines = [
  "This is the introductory text of the article.",
  "2. For the purposes of the ... shall submit:",
  "(a) an early warning notification .... ;",
  "(b) unless the relevant information has at least the following:",
  "(i) a description of ..",
  "(ii) where available, information concerning any ...;",
  "(iii) details about the ..",
  "3. Additional requirements may include:",
  "(a) documentation of processes;",
  "(b) verification procedures."
];


// Funzione per visualizzare la struttura in modo leggibile
function printStructure(data) {
  console.log("\n=== Struttura Articolo ===");
  
  if (data.initialText) {
    console.log("Testo iniziale:", data.initialText);
    console.log();
  }
  
  data.points.forEach(point => {
    console.log(`${point.number}. ${point.text}`);
    
    point.subpoints.forEach(subpoint => {
      console.log(`  (${subpoint.letter}) ${subpoint.text}`);
      
      subpoint.subpoints.forEach(subpoint => {
        console.log(`    (${subpoint.roman}) ${subpoint.text}`);
      });
    });
    console.log();
  });
}

async function main() {
    console.log("=== Risultato Parsing ===");
    const parsed = parseArticleSections(articleLines);
    console.log(JSON.stringify(parsed, null, 2));
    printStructure(parsed);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArticleSections
}