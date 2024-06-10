const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const { EventEmitter } = require('stream');

var path = process.argv.slice(2)[0]
fileContent=fs.readFileSync(path, 'utf-8');
function if_obfuscasion(fileContent){
    const ast = esprima.parse(fileContent);
    if(ast.body[0].type!="ExpressionStatement")
        console.log("Obfuscation");
}
if_obfuscasion(fileContent)