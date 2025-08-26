const { parseTextStructure } = require('./lib/iec_62443_3_2/doc-62443-parser');
const fs = require('fs');

const text = fs.readFileSync('C:/My/wizzi/stfnbssl/cybersecurity/packages/ingestion-norme/src/input/doc-62443-3-2-sample.txt', 'utf-8');
const structure = parseTextStructure(text);
console.log(JSON.stringify(structure, null, 2));
