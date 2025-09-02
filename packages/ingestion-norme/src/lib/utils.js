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
    exitWithError(`Impossibile leggere o parsare il JSON di configurazione: ${err.message}`);
  }
}

function readTextSync(filePath) {
  try {
    let text = fs.readFileSync(filePath, 'utf8');
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // rimuove BOM iniziale
    return text;
  } catch (err) {
    exitWithError(`Impossibile leggere il file di input: ${err.message}`);
  }
}

async function downloadFromUrlJSONSync(rawUrl) {
    try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // se è JSON
        return data;
        
    } catch (error) {
        console.error('Errore nel download:', error);
    }
}

function writeJSONSync(filePath, document) {
  try {
    fs.writeFileSync(
        filePath, 
        JSON.stringify(document, null, 2), 
        'utf8'
    );
  } catch (err) {
    exitWithError(`Impossibile scrivere JSON : ${err.message}`);
  }
}

function writeFileSync(filePath, document) {
  try {
    fs.writeFileSync(
        filePath, 
        document, 
        'utf8'
    );
  } catch (err) {
    exitWithError(`Impossibile scrivere file : ${err.message}`);
  }
}

/**
 * Verifica se una stringa SEMBRA essere una regular expression
 * Combina validità tecnica + indicatori semantici di "regex-ness"
 * @param {string} text - La stringa da testare
 * @returns {boolean} - true se sembra una regex, false altrimenti
 */
function isRegExp(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  // Prima verifica se è tecnicamente valida
  try {
    new RegExp(text);
  } catch (error) {
    return false;
  }

  // Poi verifica se contiene caratteri tipici di regex
  const regexIndicators = [
    /^\/.+\/[gimsuvy]*$/,        // formato /pattern/flags
    /\\[dDwWsSbBnrtfv]/,         // escape sequences (\d, \w, \s, etc.)
    /[\[\]{}()*+?^$|]/,          // metacaratteri regex
    /\(\?[:=!<]/,                // lookahead/lookbehind
    /\(\?\<\w+\>/,               // named groups
    /\{[\d,]+\}/,                // quantificatori {n,m}
    /\[\^?[\w\s\-\]\\]+\]/       // character classes [a-z], [^abc]
  ];

  return regexIndicators.some(indicator => indicator.test(text));
}

/**
 * Verifica SOLO se una stringa è tecnicamente una RegExp valida
 * (qualsiasi stringa può esserlo)
 * @param {string} text - La stringa da testare  
 * @returns {boolean}
 */
function isValidRegExpPattern(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  try {
    new RegExp(text);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Parsa una stringa in una RegExp, supportando anche il formato /pattern/flags
 * @param {string} text - La stringa da parsare
 * @returns {RegExp} - L'oggetto RegExp creato
 * @throws {Error} - Se la stringa non è una regex valida
 */
function parseRegExp(text) {
  if (typeof text !== 'string') {
    throw new Error(`Expected string, got ${typeof text}`);
  }

  const trimmed = text.trim();
  if (trimmed === '') {
    throw new Error('Cannot parse empty string as RegExp');
  }

  try {
    // Controlla se la stringa è nel formato /pattern/flags
    const regexMatch = trimmed.match(/^\/(.+)\/([gimsuvy]*)$/);
    
    if (regexMatch) {
      // Formato /pattern/flags
      const pattern = regexMatch[1];
      const flags = regexMatch[2];
      return new RegExp(pattern, flags);
    } else {
      // Formato stringa semplice (pattern senza delimitatori)
      return new RegExp(trimmed);
    }
  } catch (error) {
    throw new Error(`Invalid RegExp pattern: ${error.message}`);
  }
}

// ========================================
// FUNZIONI UTILITY AGGIUNTIVE
// ========================================

/**
 * Verifica se una stringa è nel formato /pattern/flags
 * @param {string} text - La stringa da verificare  
 * @returns {boolean}
 */
function isSlashDelimitedRegex(text) {
  if (typeof text !== 'string') return false;
  return /^\/(.+)\/([gimsuvy]*)$/.test(text.trim());
}

/**
 * Estrae pattern e flags da una regex in formato /pattern/flags
 * @param {string} text - La stringa regex delimitata da slash
 * @returns {{pattern: string, flags: string} | null}
 */
function extractRegexParts(text) {
  if (!isSlashDelimitedRegex(text)) return null;
  
  const match = text.trim().match(/^\/(.+)\/([gimsuvy]*)$/);
  return {
    pattern: match[1],
    flags: match[2]
  };
}

/**
 * Versione sicura di parseRegExp che restituisce null invece di lanciare errori
 * @param {string} text - La stringa da parsare
 * @returns {RegExp | null}
 */
function safeParseRegExp(text) {
  try {
    return parseRegExp(text);
  } catch (error) {
    return null;
  }
}

// ========================================
// FUNZIONI UTILITY AGGIUNTIVE
// ========================================

/**
 * Verifica se una stringa è nel formato /pattern/flags
 * @param {string} text - La stringa da verificare  
 * @returns {boolean}
 */
function isSlashDelimitedRegex(text) {
  if (typeof text !== 'string') return false;
  return /^\/(.+)\/([gimsuvy]*)$/.test(text.trim());
}

/**
 * Estrae pattern e flags da una regex in formato /pattern/flags
 * @param {string} text - La stringa regex delimitata da slash
 * @returns {{pattern: string, flags: string} | null}
 */
function extractRegexParts(text) {
  if (!isSlashDelimitedRegex(text)) return null;
  
  const match = text.trim().match(/^\/(.+)\/([gimsuvy]*)$/);
  return {
    pattern: match[1],
    flags: match[2]
  };
}

/**
 * Versione sicura di parseRegExp che restituisce null invece di lanciare errori
 * @param {string} text - La stringa da parsare
 * @returns {RegExp | null}
 */
function safeParseRegExp(text) {
  try {
    return parseRegExp(text);
  } catch (error) {
    return null;
  }
}

function cleanHiddenUnicodeCharacters(text) {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero width spaces
    //.replace(/[\u00A0]/g, ' ') // Non-breaking space -> spazio normale
    //.replace(/[\u0009]/g, ' ') // Tab -> spazio
    //.replace(/[\u000A\u000D]/g, '') // Line feed e carriage return
    .replace(/[\u2000-\u206F]/g, ' ') // Altri spazi Unicode
    .trim();
}
// ========================================
// EXPORT PER COMMONJS
// ========================================
module.exports = {
    exitWithError,
    writeJSONSync,
    writeFileSync,
    ensureDirSync,
    readJSONSync,
    readTextSync,
    downloadFromUrlJSONSync,
    isRegExp,
    parseRegExp,
    isSlashDelimitedRegex,
    extractRegexParts,
    safeParseRegExp,
    cleanHiddenUnicodeCharacters
}