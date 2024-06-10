
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const argv = process.argv.splice(2);


const pathToFile = argv[0]
const outfile = argv[1]
const inputContent = fs.readFileSync(pathToFile, 'utf-8');
const outputContent = fs.readFileSync(outfile, 'utf-8');
var insert_node = []
global.result_data = "" 


function parse_code2AST(){
    const ast = esprima.parse(inputContent);
    estraverse.traverse(ast, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    tmp = enter_node.right.arguments[0]      
                    if(tmp.type === "ObjectExpression" && tmp.properties){
                        insert_node = tmp.properties
                        this.break
                    }                                         
                }
            }
        }
    })    
}


function insert_code2AST(){
    const ast = esprima.parse(outputContent);
    var origin= {}
    estraverse.traverse(ast, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    origin = enter_node.right.arguments[0]      
                    if(origin && origin.type === "ObjectExpression" && origin.properties){
                        for(let i = 0; i < insert_node.length; i++)
                        {
                            origin.properties.push(insert_node[i])
                        }
                        this.break
                    }                             
                }
            }
        }
    })
    var jsData = escodegen.generate(ast)
    fs.writeFileSync(outfile, jsData); 
}

function write_code2AST(){
    const ast = esprima.parse(inputContent);
    estraverse.traverse(ast, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    var jsData = escodegen.generate(enter_node)
                    fs.writeFileSync(outfile, jsData);        
                    this.break                             
                }
            }
        }
    })    
}


function main_task(){
    if(outputContent.startsWith("window.__require")){
        parse_code2AST()
        insert_code2AST() 
    }
    else{
        write_code2AST()
    }
}

main_task()