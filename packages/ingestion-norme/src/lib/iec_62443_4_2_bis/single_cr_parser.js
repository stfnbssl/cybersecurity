const isDebug = false;

function parseCategorySections(lines) {
  const result = {
    initialText: "",
    items: []
  };
  
  let currentLevel1 = null; // PART I, II, III, ...
  let currentLevel2 = null; // (A), (B), (C), ...
  let currentLevel3 = null; // (1), (2), (3), ...
  let isLevel2WithoutLevel1 = false;
    
  let foundFirstLetter = false;
  let initialTextLines = [];
  let previousMatchOrdinal = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.deleted) continue;
    
    let level1Match = line.section3
    let level2Match = line.section4
    let level3Match = line.section5

    if (level1Match) {

      if (!foundFirstLetter) {
        result.initialText = initialTextLines.join(" ");
        foundFirstLetter = true;
      }
      currentLevel1 = {
        level: 'n.n.n',
        category: level1Match.categoryNumber,
        number: level1Match.section3Number,
        kind: level1Match.kind,
        title: level1Match.title,
        description: null,
        objectve: null,
        rationale: null,
        items: []
      };
      if (isDebug) console.log("currentLevel1", currentLevel1);
      result.items.push(currentLevel1);
      currentLevel2 = null;
      currentLevel3 = null;

    } else if (level2Match) {

      currentLevel2 = {
        level: "n.n.n.n",
        number: level2Match.section4Number,
        kind: level2Match.kind,
        title: level2Match.title,
        description: null,
        objectve: null,
        rationale: null,
        items: []
      };
      currentLevel1.items.push(currentLevel2);
      currentLevel3 = null;

    } else if (level3Match) {
      
      currentLevel3 = {
        level: "n.n.n.n.n",
        number: level3Match.section5Number,
        title: level3Match.title,
        requirement: null,
        items: []
      };
      currentLevel2.items.push(currentLevel3);
    
    } else if (!foundFirstLetter) {
      // Testo iniziale
      initialTextLines.push(line);
      
    } else {
      // Continua il testo dell'elemento corrente
      if (currentLevel3) {
        currentLevel3.items.push(line);
      } else if (currentLevel2) {
        currentLevel2.items.push(line);
      } else if (currentLevel1) {
        currentLevel1.items.push(line);
      }
    }
  }
  
  if (!foundFirstLetter) {
    result.initialText = initialTextLines.join(" ");
  }
  
  result.items.forEach( item => {
    if (item.kind == 'Description of category') parseDescription_of_category(item);
    else if (item.kind == 'Element') parseElement(item);
    else if (item.kind == 'ElementGroup') parseElementGroup(item);
    else {
      item.items.forEach( subitem => {
        if (subitem.kind == 'Description of category') parseDescription_of_category(item);
        else if (subitem.kind == 'Element') parseElement(item);
        else if (subitem.kind == 'ElementGroup') parseElementGroup(item);
      });
    }
  });

  return {
      metadata: { 
          parser: "parseCategorySections", 
          source: __filename,
      },
      result: result,
  };
}

function parseDescription_of_category(item) {

}

function parseElementGroup(item) {
  parseElement(item)
}

function parseElement(item) {
    let descriptionOn = false;
    let objectveOn = false;
    let rationaleOn = false;
    let requirementsOn = false;
    item.items.forEach( line => {
      // console.log("parseElement", line.level, line.kind, line.title, line.text);
      if (line.level) {
        if (line.kind == 'Element') {
          parseElement(line);
        } else {
          parseRequirement(line); 
        }
      } else {
        if (line.text == 'Description:') { descriptionOn = true; objectveOn = false; rationaleOn = false; requirementsOn = false }
        else if (line.text == 'Objective:') { descriptionOn = false; objectveOn = true; rationaleOn = false; requirementsOn = false  }
        else if (line.text == 'Rationale:') { descriptionOn = false; objectveOn = false; rationaleOn = true; requirementsOn = false  }
        else if (line.text == 'Requirements:') { descriptionOn = false; objectveOn = false; rationaleOn = false; requirementsOn = false }
        else if (descriptionOn) item.description = !item.description ? line.text : item.description + ' ' + line.text;
        else if (objectveOn) item.objectve = !item.objectve ? line.text : item.objectve + ' ' +  line.text;
        else if (rationaleOn) item.rationale = !item.rationale ? line.text : item.rationale + ' ' + line.text;
      }
    });
}

function parseRequirement(item) {
  item.items.forEach( line => {
    item.requirement = !item.requirement ? line.text : item.requirement + ' ' +  line.text;
  });
}


async function main() {
    console.log("=== Risultato Parsing ===");
    const parsed = parseCategorySections(articleLines);
    console.log(JSON.stringify(parsed.result, null, 2));
    printStructure(parsed.result);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseCategorySections
}