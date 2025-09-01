// extractor.js (CommonJS)
// Uso: node extractor.js /path/to/config.json 1
const fs = require('fs');
const path = require('path');
const {exitWithError, ensureDirSync, readTextSync, readJSONSync, writeJSONSync, writeFileSync,
  isRegExp, parseRegExp, cleanHiddenUnicodeCharacters} = require('../../utils');
const { analizeArticle } = require('./article_analizer');
const { parseArticleSubSections } = require('./single_article_parser');

const isDebug = false;

function parseStep0(lines) {
  const retval = {
    linesOutOfArticles: [],
    articles: []
  };
  let page = 1;
  let currentArticle = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let skip = line.match(/\s*Article\s+(\d+)\s+(.+)/);
    skip = skip || line.trim() == "National Electrical Code Handbook 2023";
    skip = skip || line.trim() == "2023 National Electrical Code Handbook";
    skip = skip || line.trim() == "•";
    const pageMatch = line.match(/^\s*(\d+)\s*$/);
    if (pageMatch) {
      if (isDebug) console.log("pageMatch", pageMatch);
      page = parseInt(pageMatch[0]);
      skip = true;
    }
    if (!skip) {
      const ARTICLE = line.match(/^\s*ARTICLE(\s+\d+)?/);
      if (isDebug) console.log("ARTICLE", ARTICLE);
      let articleNumber = -1;
      let articleTitle = null;
      if (ARTICLE) {
        if (ARTICLE[1]) {
        } else {
          const nextLine1 = lines[i+1];  
          const nextLine2 = lines[i+2];  
          const nextLine3 = lines[i+3];  
          const nextLine4 = lines[i+4];  
          const matchNumber = nextLine1.match(/^\s*(\d*)\s*(.*)$/);
          if (matchNumber) {
            i++;
            articleNumber = parseInt(matchNumber[1]);  
            if (matchNumber[2]) {
              articleTitle = matchNumber[2].trim();
            } else {
              i++;
              articleTitle = nextLine2.trim();
              /*
              if (nextLine3.trimStart().length < nextLine3.length ) {
                articleTitle += ' ' + nextLine3.trimStart();
                i++;
                
                if (nextLine4.trimStart().length < nextLine4.length ) {
                  articleTitle += ' ' + nextLine4.trimStart();
                  i++;
                }
                
              }
                */
            }
          } 
        }
      }
      if (articleNumber > -1) {
        if (currentArticle) {
          analizeArticle(currentArticle);
          retval.articles.push(currentArticle);
        }
        currentArticle = {
          number: articleNumber,
          title: articleTitle,
          page: page,
          lines: []
        }
      } else {
        if (currentArticle) {
          currentArticle.lines.push({
              page: page,
              text: line
          })
        } else {
          retval.linesOutOfArticles.push({
              page: page,
              text: line
          })
        }
      }
    }
  };
  if (currentArticle) {
    analizeArticle(currentArticle);
    retval.articles.push(currentArticle)
  }
  return retval;
}

function extractTitle(currentArticleSection) {
  let title = "";
  let found = false;
  const newLines = [];
  currentArticleSection.lines.forEach(line => {
    if (found) {
      newLines.push(line);
    } else {
      const index = line.text.indexOf('.');
      if (index < 0) {
        title += line.text;
      } else {
        title += line.text.substring(0, index);
        const newLine = {
          indent: line.indent,
          text: line.text.substring(index+1).trim()
        }
        if (newLine.text.length > 0) { newLines.push(newLine); }
        found = true;
      }
    }
  });
  currentArticleSection.title = title;
  currentArticleSection.lines = newLines;
}

function splitIntoBlocks(cleanedLines) {
  const blocks = [];
  const currentBlock = {
    lines: []
  }
  let currentArticleSection = {
    articleNumber: null,
    pointNumber: null,
    lines: []
  }
  const articleSectionMatch = /^([NAΔ])?\s*(\d+)\.(\d+)\s+(.+)/;
  cleanedLines.forEach((line, idx) => {
      // if (isDebug) console.log("Char codes:", [...line].map(c => c.charCodeAt(0)));
      const match = line.match(articleSectionMatch);
      const prevLine = cleanedLines[idx-1];
      const nextLine = cleanedLines[idx+1];
      let falseMatch = prevLine && prevLine.toLowerCase().indexOf("see also") > -1;
      falseMatch = falseMatch || prevLine && prevLine.indexOf("Exhibit") > -1;
      if (match && !falseMatch) {
        // if (isDebug) console.log("Char codes:", [...line].map(c => c.charCodeAt(0)));
        // if (isDebug) console.log("match", line, match ? match[1] : '');
        if (currentArticleSection.articleNumber != null) {
          extractTitle(currentArticleSection);
          currentArticleSection.parsed = parseArticleSubSections(currentArticleSection.lines)
          currentBlock.lines.push(currentArticleSection);
        }
        currentArticleSection = {
            articlePrefix: match[1] || '',  
            articleNumber: match[2] || '',
            pointNumber: match[3] || '',
            title: null,
            surroundings: [
              prevLine,
              line,
              nextLine,
            ],
            lines: [{
              indent: line.length - line.trimStart().length,
              text: match.slice(4).join(' ')
            }],
            lineRow: idx,
        };
      } else {
        currentArticleSection.lines.push({
             indent: line.length - line.trimStart().length,
             text: line.trim()
        });
      }
  });
  if (currentArticleSection.articleNumber != null) {
    extractTitle(currentArticleSection);
    currentArticleSection.parsed = parseArticleSubSections(currentArticleSection.lines)
    currentBlock.lines.push(currentArticleSection);
  }
  blocks.push(currentBlock);
  
  if (blocks.length === 0) blocks.push({ name: '', lines: [], startIndex: 0 });
  return blocks;
}

function writeArticlesFiles(resultStep0, outputJSONPath, blocksOutputDir) {
  const baseDir = blocksOutputDir
    ? blocksOutputDir
    : path.join(path.dirname(outputJSONPath), 'blocks');

  ensureDirSync(baseDir);
  const outlines = []
  resultStep0.linesOutOfArticles.forEach( line => {
    outlines.push(line.text);
  })
  const filePath = path.join(baseDir, `article_0.md`);
  ensureDirSync(filePath);
  writeFileSync(filePath, outlines.join('\n'))
  resultStep0.articles.forEach( article => {
    outlines.length = 0;
    outlines.push('# Article ' + article.number + ' ' + article.title)
    outlines.push('')
    article.lines.forEach( line => {
      if (!line.deleted) {
        if (line.section) {
          outlines.push('');
          outlines.push(`## Section ${line.section.articleNumber}.${line.section.sectionNumber} ${line.section.title} ${line.section.changeType ? '(change: ' + line.section.changeType + ')' : ''}`);  
        }
        if (line.subSection) {
          outlines.push('');
          outlines.push(`### (${line.subSection.ordinal}) ${line.subSection.title} ${line.subSection.changeType ? '(change: ' + line.subSection.changeType + ')' : ''}`);
        }
        if (line.paragraph) {
          if (article.lines[line.parent] && article.lines[line.parent].paragraph)
            outlines.push(`  - **(${line.paragraph.ordinal})** ${line.text} ${line.paragraph.changeType ? '(change: ' + line.paragraph.changeType + ')' : ''}`);
          else
            outlines.push(`- **(${line.paragraph.ordinal})** ${line.text} ${line.paragraph.changeType ? '(change: ' + line.paragraph.changeType + ')' : ''}`);
        } else if (line.text && line.text.length > 0) {
          outlines.push(line.text);
        }
      }
    })
    let filePath = path.join(baseDir, 'articles', `article_${article.number}.md`);
    ensureDirSync(filePath);
    writeFileSync(filePath, outlines.join('\n'))
    filePath = path.join(baseDir, 'articles', `article_${article.number}.json`);
    writeJSONSync(filePath, article);
  })
}

function writeBlocksFiles(blocks, outputJSONPath, blocksOutputDir) {
  const baseDir = blocksOutputDir
    ? blocksOutputDir
    : path.join(path.dirname(outputJSONPath), 'blocks');

  ensureDirSync(baseDir);

  const files = [];
  blocks.forEach((b, i) => {
    const idx = i + 1; // progressivo 1-based
    const obj = {
      // content: (b.lines || []).join('\n'),
      lines: b.lines || [],
      name: b.name || '',
      startIndex: typeof b.startIndex === 'number' ? b.startIndex : 0,
      index: idx
    };
    const filePath = path.join(baseDir, `${idx}.json`);
    ensureDirSync(filePath);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
    files.push(filePath);
  });

  return { baseDir, files };
}

function step1(params) {
  const {
    inputTextPath,
    outputJSONPath,
    dirtyLines,
    blockHeaders,
    headersCaseSensitive = false,
    includeHeaderInBlock = true,
    blocksOutputDir // opzionale: dir dove salvare i file 1.json, 2.json, ...
  } = params;

  if (!inputTextPath || !outputJSONPath) {
    exitWithError('Parametri mancanti: servono "inputTextPath" e "outputJSONPath" dentro us_lex_nec_2023.');
  }

  const rawText = readTextSync(inputTextPath);
  const allLines = rawText.split(/\r?\n/);

  if (isDebug) console.log("allLines", allLines.length);
  const cleanedLines = parseStep0(allLines, Array.isArray(dirtyLines) ? dirtyLines : []);
  if (isDebug) console.log("cleanedLines.linesOutOfArticles", cleanedLines.linesOutOfArticles.length);
  if (isDebug) console.log("cleanedLines.articles", cleanedLines.articles.length);
  if (isDebug) console.log("cleanedLines.articles", cleanedLines.articles);
  // const content = cleanedLines.join('\n');
  writeArticlesFiles(cleanedLines, outputJSONPath, blocksOutputDir);
  return;
  //const blocks = splitIntoBlocks(cleanedLines, {
  const blocks = splitIntoBlocks(cleanedLines, {
    blockHeaders,
    headersCaseSensitive,
    includeHeaderInBlock
  });

  // Scrittura per-blocco
  const { baseDir: blocksDir, files: blockFiles } = writeBlocksFiles(blocks, outputJSONPath, blocksOutputDir);

  // Output globale
  const outObj = {
    // content,
    lines: cleanedLines,
    blocks,
    blockFiles // percorsi dei file creati per i blocchi
  };

  ensureDirSync(outputJSONPath);
  try {
    fs.writeFileSync(outputJSONPath, JSON.stringify(outObj, null, 2), 'utf8');
  } catch (err) {
    exitWithError(`Impossibile scrivere il file di output: ${err.message}`);
  }

  console.log(`[OK] Step 1 completato. Output salvato in: ${outputJSONPath}`);
  console.log(`[OK] Scritti ${blockFiles.length} blocchi in: ${blocksDir}`);
}

function main() {
  const [, , configPath, stepArg] = process.argv;
  if (!configPath || !stepArg) {
    console.log('Uso: node extractor.js <config.json> <stepNumber>');
    process.exit(2);
  }

  const stepNumber = Number(stepArg);
  if (!Number.isInteger(stepNumber)) exitWithError('Il numero di step deve essere un intero.');

  const config = readJSONSync(configPath);
  if (!config || typeof config !== 'object' || !config.us_lex_nec_2023) {
    exitWithError('Configurazione non valida: proprietà radice "us_lex_nec_2023" mancante.');
  }

  let params;
  
  switch (stepNumber) {
    case 1:
      params = config.us_lex_nec_2023.step1;
      step1(params);
      break;
    default:
      console.log(`[INFO] Nessuna azione per step ${stepNumber}. Questo script implementa solo lo step 1.`);
      process.exit(0);
  }
}

if (require.main === module) {
  main();
}
