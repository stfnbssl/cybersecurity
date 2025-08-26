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

// Export per uso come modulo
module.exports = {
    writeJSONSync,
    ensureDirSync,
    readJSONSync,
    readTextSync
};