/**
 * Parser per strutture di documento complesse con punti alfabetici, numerici e note
 */

function parseDocumentStructure(lines) {
  const result = {
    mainText: [],
    items: [],
    notes: []
  };

  let currentItem = null;
  let currentNote = null;
  let collectingMainText = true;
  let lastItemLevel = null;
  let currentAlphaItemId = null; // Traccia l'ultimo punto alfabetico per le note

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;

    // Identifica NOTE (NOTE 1, NOTE 2, etc.)
    const noteMatch = trimmed.match(/^NOTE\s*(\d*)(.*)$/);
    if (noteMatch) {
      collectingMainText = false;
      
      // Chiudi item precedente se aperto
      if (currentItem) {
        result.items.push(currentItem);
        currentItem = null;
      }
      
      const noteNumber = noteMatch[1] || '';
      const noteText = noteMatch[2].trim();
      
      currentNote = {
        id: noteNumber,
        fullId: noteMatch[1] ? `NOTE ${noteMatch[1]}` : 'NOTE',
        text: noteText ? [noteText] : [],
        level: getIndentLevel(line),
        relatedToItem: currentAlphaItemId // Collega al punto alfabetico corrente
      };
      
      if (noteText) {
        // Se c'è già testo nella stessa riga della NOTE
        currentNote.text = [noteText];
      }
      continue;
    }

    // Identifica punti alfabetici (a), b), c), etc.)
    const alphaMatch = trimmed.match(/^([a-z])\)\s*(.*)$/);
    if (alphaMatch) {
      collectingMainText = false;
      
      // Salva item precedente
      if (currentItem) {
        result.items.push(currentItem);
      }
      
      // Salva nota precedente
      if (currentNote) {
        result.notes.push(currentNote);
        currentNote = null;
      }

      const letter = alphaMatch[1];
      const text = alphaMatch[2];
      
      currentItem = {
        id: letter,
        fullId: `${letter})`,
        type: 'alpha',
        text: text ? [text] : [],
        subItems: [],
        level: getIndentLevel(line)
      };
      
      // Aggiorna il punto alfabetico corrente per le note
      currentAlphaItemId = `${letter})`;
      lastItemLevel = 'alpha';
      continue;
    }

    // Identifica punti numerici (1), 2), etc.)
    // I punti numerici sono SEMPRE sub-item di punti alfabetici
    // MA se siamo dentro una NOTE, sono parte del testo della nota
    const numericMatch = trimmed.match(/^(\d+)\)\s*(.*)$/);
    if (numericMatch) {
      // Se siamo dentro una NOTE, tratta come testo normale della nota
      if (currentNote) {
        currentNote.text.push(trimmed);
        continue;
      }
      
      collectingMainText = false;
      
      // Salva nota precedente se non collegata a item
      if (currentNote && !currentItem) {
        result.notes.push(currentNote);
        currentNote = null;
      }

      const number = numericMatch[1];
      const text = numericMatch[2];
      const level = getIndentLevel(line);
      
      const numericItem = {
        id: number,
        fullId: `${number})`,
        type: 'numeric',
        text: text ? [text] : [],
        level: level
      };

      // I punti numerici sono SEMPRE sub-item
      if (currentItem) {
        // Aggiungi al current item (dovrebbe essere alfabetico)
        if (!currentItem.subItems) currentItem.subItems = [];
        currentItem.subItems.push(numericItem);
      } else {
        // Se non c'è current item, crea un item contenitore implicito
        // Questo gestisce casi dove un punto numerico appare senza punto alfabetico precedente
        const containerItem = {
          id: 'container',
          fullId: '[numeric container]',
          type: 'container',
          text: [],
          subItems: [numericItem],
          level: 0
        };
        result.items.push(containerItem);
      }
      
      lastItemLevel = 'numeric';
      continue;
    }

    // Identifica punti con dash/bullet (—, -, etc.)
    const bulletMatch = trimmed.match(/^[—\-•]\s*(.+)$/);
    if (bulletMatch) {
      collectingMainText = false;
      
      const text = bulletMatch[1];
      const bulletItem = {
        id: 'bullet',
        fullId: '—',
        type: 'bullet',
        text: [text],
        level: getIndentLevel(line)
      };

      if (currentItem) {
        if (!currentItem.subItems) currentItem.subItems = [];
        currentItem.subItems.push(bulletItem);
      } else {
        result.items.push(bulletItem);
      }
      continue;
    }

    // Testo di continuazione
    if (currentNote) {
      // Continua la nota corrente
      currentNote.text.push(trimmed);
    } else if (currentItem) {
      // Se il current item ha sub-items numerici e il testo sembra appartenere all'ultimo sub-item
      if (currentItem.subItems && currentItem.subItems.length > 0) {
        const lastSubItem = currentItem.subItems[currentItem.subItems.length - 1];
        if (lastSubItem.type === 'numeric') {
          // Continua l'ultimo sub-item numerico
          lastSubItem.text.push(trimmed);
        } else {
          // Continua l'item principale
          currentItem.text.push(trimmed);
        }
      } else {
        // Continua l'item corrente normale
        currentItem.text.push(trimmed);
      }
    } else if (collectingMainText) {
      // Testo principale
      result.mainText.push(trimmed);
    } else {
      // Testo generico dopo che abbiamo iniziato con strutture
      result.mainText.push(trimmed);
    }
  }

  // Salva elementi finali
  if (currentItem) {
    result.items.push(currentItem);
  }
  if (currentNote) {
    result.notes.push(currentNote);
  }

  return result;
}

/**
 * Calcola il livello di indentazione di una riga
 */
function getIndentLevel(line) {
  let level = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ') {
      level++;
    } else if (line[i] === '\t') {
      level += 4; // Tab = 4 spazi
    } else {
      break;
    }
  }
  return level;
}

/**
 * Formatta il risultato per output finale
 */
function formatStructure(parsed) {
  return {
    metadata: {
      mainTextLines: parsed.mainText.length,
      totalItems: parsed.items.length,
      totalNotes: parsed.notes.length,
      timestamp: new Date().toISOString()
    },
    structure: {
      mainText: {
        lines: parsed.mainText,
        text: parsed.mainText.join(' ').trim()
      },
      items: parsed.items.map(item => ({
        id: item.id,
        fullId: item.fullId,
        type: item.type,
        level: item.level,
        text: item.text.join(' ').trim(),
        lines: item.text,
        subItems: item.subItems ? item.subItems.map(sub => ({
          id: sub.id,
          fullId: sub.fullId,
          type: sub.type,
          level: sub.level,
          text: sub.text.join(' ').trim(),
          lines: sub.text
        })) : []
      })),
      notes: parsed.notes.map(note => ({
        id: note.id,
        fullId: note.fullId,
        level: note.level,
        text: note.text.join(' ').trim(),
        lines: note.text,
        relatedToItem: note.relatedToItem || null
      }))
    }
  };
}

/**
 * Funzione principale di export
 */
function parseComplexStructure(lines) {
  const parsed = parseDocumentStructure(lines);
  return formatStructure(parsed);
}

// Export per CommonJS
module.exports = {
  parseComplexStructure,
  parseDocumentStructure,
  formatStructure,
  getIndentLevel
};

// Test con i dati di esempio
if (require.main === module) {
  const testLines = [
    "The organization shall define and apply an information security risk treatment process to:",
    "a) select appropriate information security risk treatment options, taking account of the risk",
    "assessment results;",
    "And this:",
    "  1)",         
    "    the size of organization and its type of activities, processes, products and services;", 
    "b) determine all controls that are necessary to implement the information security risk treatment",
    "option(s) chosen;",
    "NOTE 1",
    "    Organizations can design controls as required, or identify them from any source.",
    "c)",
    "compare the controls determined in 6.1.3 b) above with those in Annex  A and verify that no",
    "necessary controls have been omitted;",
    "NOTE 2",
    "    Annex  A contains a list of possible information security controls. Users of this document are",
    "directed to Annex A to ensure that no necessary information security controls are overlooked.",
    "From one organization to another due to:",         
    "  1)",         
    "    the size of organization and its type of activities, processes, products and services;", 
    "NOTE 3",        
    "    The information security controls listed in Annex A are not exhaustive and additional information",         
    "security controls can be included if needed.",
    "d) produce a Statement of Applicability that contains:",
    "— the necessary controls (see 6.1.3 b) and c));",
    "    — justification for their inclusion;",
    "    — whether the necessary controls are implemented or not; and",
    "    — the justification for excluding any of the Annex A controls.",
    "  e) formulate an information security risk treatment plan; and",
    "  f)",
    "    obtain risk owners' approval of the information security risk treatment plan and acceptance of the",
    "    residual information security risks.",
    "  The organization shall retain documented information about the information security risk treatment",
    "  process.",
    "  NOTE 4",
    "      The information security risk assessment and treatment process in this document aligns with the",
    "  principles and generic guidelines provided in ISO 31000[5]."
  ];

  console.log('=== TEST COMPLEX STRUCTURE PARSER ===');
  const result = parseComplexStructure(testLines);
  console.log(JSON.stringify(result, null, 2));
}