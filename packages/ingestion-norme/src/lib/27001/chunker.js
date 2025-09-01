const crypto = require('crypto');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync} = require('../utils');

function sha256(data) {
    return crypto
        .createHash('sha256')
        .update(data, typeof data === 'string' ? 'utf8' : undefined)
        .digest('hex');
} 

function finish(params, metadata) {
    const documentObj = readJSONSync(params.inputJSONPath);
    const newChunks = []
    documentObj.structure.forEach(rq => {
      if(rq.details && rq.details.structure && rq.details.structure.mainText) {
        const mainText = rq.details.structure.mainText;
        
        if (mainText.text.endsWith(':')) {
          const items = rq.details.structure.items;
          items.forEach(item => {
            if (item.subItems && item.subItems.length > 0) {
              item.subItems.forEach(subItem => {
                const newChunk = Object.assign({}, metadata, {
                  chunk_id: "IEC-27001:2022/" + rq.level + '/' + item.id + '/' + subItem.id,
                  doc_id: "IEC-27001:2022",
                  section_path: rq.level + '/' + item.id + '/' + subItem.id,
                  parent_id: null,
                  group_id: "IEC-27001:2022/" + rq.level + '/' + item.id + "/" +  subItem.id + "[pUnknown]",
                  seq: 1,
                  normative: true,
                  informative: false,
                  text_normative: mainText.text + ' ' + item.text + ' ' + subItem.text,
                  text_informative: null,
                  context_note: null,
                  sha256: sha256(mainText.text + ' ' +  item.text + ' ' + subItem.text),
                  context: {
                    name: rq.title,
                    page: "Unknown"
                  }
                });
                newChunks.push(newChunk);
              });
            } else {
              const newChunk = Object.assign({}, metadata, {
                chunk_id: "IEC-27001:2022/" + rq.level + '/' + item.id,
                doc_id: "IEC-27001:2022",
                section_path: rq.level + '/' + item.id,
                parent_id: null,
                group_id: "IEC-27001:2022/" + rq.level + '/' + item.id + "/" + "[pUnknown]",
                seq: 1,
                normative: true,
                informative: false,
                text_normative: mainText.text + ' ' + item.text,
                text_informative: null,
                context_note: null,
                sha256: sha256(mainText.text + ' ' +  item.text),
                context: {
                  name: rq.title,
                  page: "Unknown"
                }
              });
              newChunks.push(newChunk);
            }
          });
        } else if (mainText.text && mainText.text.length > 0) {
          const newChunk = Object.assign({}, metadata, {
            chunk_id: "IEC-27001:2022/" + rq.level,
            doc_id: "IEC-27001:2022",
            section_path: rq.level,
            parent_id: null,
            group_id: "IEC-27001:2022/" + rq.level + "/" + "[pUnknown]",
            seq: 1,
            normative: true,
            informative: false,
            text_normative: mainText.text,
            text_informative: null,
            context_note: null,
            sha256: sha256(mainText.text),
            context: {
              name: rq.title,
              page: "Unknown"
            }
          });
          newChunks.push(newChunk);
        }
        const notes = rq.details.structure.notes;
        if (notes && notes.length > 0) {
          const noteBags = {};
          notes.forEach(note => {
              const relatedItem = null;
              const items = rq.details.structure.items;
              items.forEach(item => {
                // console.log("", item.fullId, note.relatedToItem);
                if (item.fullId == note.relatedToItem) {
                  // console.log("item.fullId", item.fullId, note.relatedToItem);
                  let noteBag = null;
                  if (noteBags[item.fullId]) {
                      noteBag = noteBags[item.fullId];
                      noteBag.count++;
                  } else {
                    noteBag = { count: 1 };
                    noteBags[item.fullId] = noteBag;
                  }
                  const newChunk = Object.assign({}, metadata, {
                    chunk_id: "IEC-27001:2022/" + rq.level + "/" + item.id + "[note-" + noteBag.count + "]",
                    doc_id: "IEC-27001:2022",
                    section_path: rq.level + "/" + item.id,
                    parent_id: null,
                    group_id: "IEC-27001:2022/" + rq.level + "/" + item.id + "[pUnknown]",
                    seq: noteBag.count + 1,
                    normative: false,
                    informative: true,
                    text_normative: null,
                    text_informative: note.text,
                    context_note: null,
                    sha256: sha256(note.text),
                    context: {
                      name: rq.title,
                      page: "Unknown"
                    }
                  });
                  newChunks.push(newChunk);
                }
              });
          });
        }
        /*
          "notes": [
            {
              "id": "",
              "fullId": "NOTE",
              "level": 2,
              "text": "Determining these issues refers to establishing the external and internal context of the organization considered in Clause 5.4.1 of ISO 31000:2018[5].",
              "lines": [
                "Determining these issues refers to establishing the external and internal context of the organization",
                "considered in Clause 5.4.1 of ISO 31000:2018[5]."
              ],
              "relatedToItem": null
            }

        */
      }
    });
    ensureDirSync(params.outputJSONPath);
    writeJSONSync(params.outputJSONPath, {
      chunks: newChunks
    })
    console.log(`✅ ${newChunks.length} chunks in ${params.inputJSONPath} con successo!`);
    console.log(`✅ Creato file ${params.outputJSONPath} con successo!`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node iec_27001/chunker.js <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.iec_27001) {
    exitWithError('Configurazione non valida: proprietà radice "iec_27001" mancante.');
  }

  const metadata = config.iec_27001.metadata;
  const params = config.iec_27001["step"+stepNumber];
  if (!params) {
    exitWithError('Configurazione non valida: proprietà radice "iec_27001" ' + stepNumber + ' mancante.');
  }
  console.log("params+metadata", params, metadata);
  finish(params, metadata);
}

if (require.main === module) {
  main();
}
