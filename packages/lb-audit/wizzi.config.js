/*
    artifact generator: C:\My\wizzi\stfnbssl\wizzi.plugins\packages\wizzi.plugin.js\lib\artifacts\js\module\gen\main.js
    package: @wizzi/plugin.js@0.8.9
    primary source IttfDocument: json:/___template/wizzi.config.js.ittf
    utc time: Mon, 20 Jan 2025 19:37:37 GMT
*/
const path = require('path');
module.exports = {
    wzjobName: "lb-audit/job", 
    wzjobPath: path.join(__dirname, '.wizzi', 'generate.wzjob.ittf'), 
    destPath: __dirname, 
    plugins: [
        "./wizzi.plugin.ai/index.js", 
        "./wizzi.plugin.css/index.js", 
        "./wizzi.plugin.docx/index.js", 
        "./wizzi.plugin.graphql/index.js", 
        "./wizzi.plugin.html/index.js", 
        "./wizzi.plugin.ittf/index.js", 
        "./wizzi.plugin.js/index.js", 
        "./wizzi.plugin.ts/index.js", 
        "./wizzi.plugin.json/index.js", 
        "./wizzi.plugin.md/index.js", 
        "./wizzi.plugin.pandoc/index.js", 
        "./wizzi.plugin.pdf/index.js", 
        "./wizzi.plugin.plain/index.js", 
        "./wizzi.plugin.ppt/index.js", 
        "./wizzi.plugin.prisma/index.js", 
        "./wizzi.plugin.text/index.js", 
        "./wizzi.plugin.toml/index.js", 
        "./wizzi.plugin.svg/index.js", 
        "./wizzi.plugin.vtt/index.js", 
        "./wizzi.plugin.wzjob/index.js", 
        "./wizzi.plugin.wzschema/index.js", 
        "./wizzi.plugin.xml/index.js", 
        "./wizzi.plugin.yaml/index.js"
    ], 
    pluginsBaseFolder: "C:/My/wizzi/stfnbssl/wizzi.plugins/packages", 
    schemas: [
        
    ], 
    globalContext: {
        wzConfigIsDevelopment: true, 
        wzConfigIsPackageDeploy: false, 
        wzConfigIsDocumentation: true
     }
 };