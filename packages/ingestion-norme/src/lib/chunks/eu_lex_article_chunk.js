const crypto = require('crypto');
const { extractSemicololnParagraph, analyzeTextForRelevance } = require('./chunk_utils');

function sha256(data) {
    return crypto
        .createHash('sha256')
        .update(data, typeof data === 'string' ? 'utf8' : undefined)
        .digest('hex');
} 

function createChunks(article, metadata) {
    const newChunks = []
    const articleText = article.parsed.result.initialText;
    let articlePreText = null;
    if (article.parsed.result.points && article.parsed.result.points.length > 0) {
        // console.log(article.number, "article.parsed.result.points.length", article.parsed.result.points.length)
        // articlePreText = extractSemicololnParagraph(article.parsed.result.initialText) || '';
        articlePreText = article.parsed.result.initialText;
    } else {
        // VIA if (articleText && articleText.length > 0 && articleText.trim() != articlePreText.trim()) {
        const newChunk = Object.assign({}, metadata, {
            chunk_id: metadata.framework_code + "/" + article.number,
            doc_id: metadata.framework_code,
            section_path: article.number,
            parent_id: null,
            group_id: metadata.framework_code + "/" + article.number + "/" + "[pUnknown]",
            seq: 1,
            normative: true,
            informative: false,
            text_normative: articleText,
            text_informative: null,
            context_note: null,
            context: {
                title: article.title,
                isRelevantVerb: analyzeTextForRelevance(articleText),
                page: "Unknown"
            },
            sha256: sha256(articleText)
        });
        newChunks.push(newChunk);
    }
    if (article.parsed.result.points && article.parsed.result.points.length > 0) {       
        article.parsed.result.points.forEach( point => {
            const pointkey = point.number || point.letter;
            let pointPreText = null;
            if (point.subpoints && point.subpoints.length > 0) {
                pointPreText = articlePreText + ' ' + point.text;
            } else {
                const newChunk = Object.assign({}, metadata, {
                    chunk_id: metadata.framework_code + "/" + article.number + '/' + pointkey,
                    doc_id: metadata.framework_code,
                    section_path: article.number + '/' + pointkey,
                    parent_id: null,
                    group_id: metadata.framework_code + "/" + article.number + '/' + pointkey + "/" + "[pUnknown]",
                    seq: 1,
                    normative: true,
                    informative: false,
                    text_normative: articlePreText + point.text,
                    text_informative: null,
                    context_note: null,
                    context: {
                        title: article.title,
                        isRelevantVerb: analyzeTextForRelevance(articlePreText + point.text),
                        page: "Unknown"
                    },
                    sha256: sha256(articlePreText  + point.text)
                });
                newChunks.push(newChunk);
            }
            if (point.subpoints && point.subpoints.length > 0) {
                const subpoint1SemicololnParagraph = extractSemicololnParagraph(point.text);
                const subpoint1PreText = subpoint1SemicololnParagraph ? articlePreText + ' ' + subpoint1SemicololnParagraph : articlePreText;
                point.subpoints.forEach( subpoint1 => {
                    const subpoint1Key = subpoint1.number || subpoint1.letter || subpoint1.roman;
                    const subpoint1Path = article.number + '/' + pointkey + '/' + subpoint1Key;
                    let subpoint1PreText = null;
                    if (subpoint1.subpoints && subpoint1.subpoints.length > 0) {
                        subpoint1PreText = articlePreText + ' ' + pointPreText + ' ' + subpoint1.text;
                    } else {
                        const newChunk = Object.assign({}, metadata, {
                            chunk_id: metadata.framework_code + "/" + subpoint1Path,
                            doc_id: metadata.framework_code,
                            section_path: subpoint1Path,
                            parent_id: null,
                            group_id: metadata.framework_code + "/" + subpoint1Path + '/' + "[pUnknown]",
                            seq: 1,
                            normative: true,
                            informative: false,
                            text_normative: pointPreText + subpoint1.text,
                            text_informative: null,
                            context_note: null,
                            context: {
                                title: article.title,
                                isRelevantVerb: analyzeTextForRelevance(pointPreText + subpoint1.text),
                                page: "Unknown"
                            },
                            sha256: sha256(pointPreText + subpoint1.text)
                        });
                        newChunks.push(newChunk);
                    }
                    if (subpoint1.subpoints && subpoint1.subpoints.length > 0) {
                        console.log("point.subpoints.length", point.subpoints.length)
                        const subpoint2SemicololnParagraph = extractSemicololnParagraph(subpoint1.text);
                        const subpoint2PreText = subpoint2SemicololnParagraph ? subpoint1PreText + ' ' + subpoint2SemicololnParagraph : subpoint1PreText;
                        subpoint1.subpoints.forEach( subpoint2 => {
                            const subpoint2Key = subpoint2.number || subpoint2.letter || subpoint2.roman;
                            const subpoint2Path = article.number + '/' + pointkey + '/' + subpoint1Key + '/' + subpoint2Key;
                            const newChunk = Object.assign({}, metadata, {
                                chunk_id: metadata.framework_code + "/" + subpoint2Path,
                                doc_id: metadata.framework_code,
                                section_path: subpoint2Path,
                                parent_id: null,
                                group_id: metadata.framework_code + "/" + subpoint2Path + '/' + "[pUnknown]",
                                seq: 1,
                                normative: true,
                                informative: false,
                                text_normative: subpoint1PreText + subpoint2.text,
                                text_informative: null,
                                context_note: null,
                                context: {
                                    title: article.title,
                                    isRelevantVerb: analyzeTextForRelevance(subpoint1PreText + subpoint2.text),
                                    page: "Unknown"
                                },
                                sha256: sha256(subpoint1PreText + subpoint2.text)
                            });
                            newChunks.push(newChunk);
                        });
                    }
                });
            }
        });
    }
    return newChunks;
}

module.exports = { createChunks };