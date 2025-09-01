const isDebug = false;

function analizeCR(cr) {
    cr.requirement = null;
    cr.sl_1 = null;
    cr.sl_2 = null;
    cr.sl_3 = null;
    for (let i = 0; i < cr.lines.length; i++) {
        const line = cr.lines[i];
        if (!line.text) continue;
        if (line.deleted) continue;
        if (line.indent == 6) {
            cr.requirement = !cr.requirement ? line.text  : 
            cr.requirement.endsWith('-') ? cr.requirement.substring(0, cr.requirement.length-1) + line.text :  cr.requirement + ' ' + line.text;
        } else if (line.indent == 16 || line.indent == 18) {
            cr.sl_1 = !cr.sl_1 ? line.text :
            cr.sl_1.endsWith('-') ? cr.sl_1.substring(0, cr.sl_1.length-1) + line.text :  cr.sl_1 + ' ' + line.text;
        } else if (line.indent == 26 || line.indent == 28) {
            cr.sl_2 = !cr.sl_2 ? line.text : 
            cr.sl_2.endsWith('-') ? cr.sl_2.substring(0, cr.sl_2.length-1) + line.text :  cr.sl_2 + ' ' + line.text;
        } else if (line.indent == 26 || line.indent == 38 || line.indent == 40) {
            cr.sl_3 = !cr.sl_3 ? line.text : 
            cr.sl_3.endsWith('-') ? cr.sl_3.substring(0, cr.sl_3.length-1) + line.text :  cr.sl_3 + ' ' + line.text;
        }
    }
}

async function main() {
    console.log("=== Risultato Parsing ===");
    const parsed = analizeCR(crLines);
    console.log(JSON.stringify(parsed.result, null, 2));
    printStructure(parsed.result);
}

if (require.main === module) {
    main();
}

module.exports = {
    analizeCR
}