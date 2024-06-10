
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const  crypto = require('crypto');
const { prependListener, kill } = require('process');
const { transformSync } = require('@swc/core');
const argv = process.argv.splice(2);


const pathToFile = argv[0]
const outfile = argv[1]


const fileContent = fs.readFileSync(pathToFile, 'utf-8');
let result_target = new Set([])

var file_dictionary = {}

global.result_data = "" 

var node = {}


function  dump_result(jsData){
    try{
        const result = transformSync(jsData, {
            "jsc": { 
                "target": "es5", 
                "parser": {
                "syntax": "ecmascript",
                "jsx": false,
                "decorators": false,
                "dynamicImport": false,
                }
            }
        });
        fs.writeFileSync(outfile, result.code);
    }catch(error){
        fs.writeFileSync(outfile, jsData);
    }
}

function generateMD5(str) {
    const md5 = crypto.createHash('md5');
    md5.update(str);
    return md5.digest('hex');
}


function find_all_ES6_function(){
    for (let i = 0; i < node.length; i++) { 
        var name_node = node[i].declarations[0]
        var devr_file_name = ""
        if(name_node.type == "VariableDeclarator"){
            devr_file_name = name_node.id.name
        }
        if (!devr_file_name){
            continue
        }    
        let body_node = name_node.init.callee
        if(body_node.type == "FunctionExpression" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if (enter_node.type === 'VariableDeclaration') {
                        var enter_body =  enter_node.declarations 
                        for(let enteri = 0 ; enteri< enter_body.length ;enteri++ ){
                            const body_state = escodegen.generate(enter_body[enteri])
                            if ( body_state.indexOf("this.__decorate") !== -1 || body_state.indexOf("this.__extends") !== -1 
                            || body_state.indexOf("this.__awaiter") !== -1 || body_state.indexOf("this.__generator") !== -1
                            || body_state.indexOf('\'function\' == typeof Reflect.decorate') !== -1
                            ){
                                
                                estraverse.traverse(enter_body[enteri], {
                                enter(enter_node1) {        
                                    if (enter_node1.type === 'FunctionExpression') {
                                        var FunctionExpression =  enter_node1      
                                        if(FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" ){
                                            let body_code = escodegen.generate(FunctionExpression.body)                                                                 
                                            const md5 = generateMD5(body_code);                                
                                            result_target.add(md5)
                                        }
                                    }
                                } })   
                                if(enter_body[enteri].type ==='VariableDeclarator' ) {
                                    let this_declaration = enter_body[enteri]
                                    if(this_declaration.id && this_declaration.id.type ==='Identifier'){
                                        if (!file_dictionary[devr_file_name]) {
                                            file_dictionary[devr_file_name] = [];
                                            }           
                                        file_dictionary[devr_file_name].push(this_declaration.id.name)
                                    }
                                }                                                              
                            }
                        }
                    }                    
                }
            })
        }
    }
}


function scheme3_supply(body_node ,devr_file_name){
    estraverse.traverse(body_node, {
        enter(enter_node) {
            if (file_dictionary[devr_file_name]&&enter_node.type === 'AssignmentExpression' && enter_node.right.type === 'CallExpression') {
                if(enter_node.right.callee.type ==='Identifier'){
                    if (file_dictionary[devr_file_name].some(keyword => keyword===enter_node.right.callee.name)){
                        var parents = this.parents().reverse(); 
                        for (let i = 0; i < parents.length; i++) {              
                            if (parents[i].type === 'SequenceExpression') { 
                                if(i > 0){
                                    let site = parents[i].expressions.indexOf(parents[i-1])
                                    parents[i].expressions[site] =     {
                                        "type": "BlockStatement",
                                        "body": []
                                        }
                                }else{
                                    let site = parents[i].expressions.indexOf(enter_node)
                                    parents[i].expressions[site] =     {
                                        "type": "BlockStatement",
                                        "body": []
                                        }
                                }
                                break;
                            }else if (parents[i].type === 'BlockStatement'){
                                if(i>0){
                                    let site = parents[i].body.indexOf(parents[i-1])
                                    parents[i].body[site] =     {
                                        "type": "BlockStatement",
                                        "body": []
                                        }                                            
                                }
                                break
                            }
                        }
                    }
                }
            }
        }
    })
}


function cut_ES6_code(){
    for (let i = 0; i < node.length; i++) {
        var name_node = node[i].declarations[0]
        
        var devr_file_name = ""
        if(name_node.type == "VariableDeclarator"){
            devr_file_name = name_node.id.name
        }
        
        if (devr_file_name  === ""){
            continue
        }    
        let body_node = name_node.init.callee
        if(body_node.type == "FunctionExpression" ){
            
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if (enter_node.type === 'FunctionExpression') {
                        var FunctionExpression =  enter_node
                        
                        if(FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" ){
                            let body_code = escodegen.generate(FunctionExpression.body)
                            const md5 = generateMD5(body_code);
                            const empty_body = {
                                    type: "BlockStatement",
                                    body: []
                            }
                            
                            if(result_target.has(md5)){
                                FunctionExpression.body = empty_body
                            }   
                        }
                    }
                }
            })
            
            scheme3_supply(body_node, devr_file_name);
        }
    }
}


function parse_cut_ES6_code2AST(){
    const ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) {
            if(enter_node.type === "Program"){
                node = enter_node.body
            }
        }
    })
}

function complement_code(){
    for (let i = 0; i < node.length; i++) {
        var name_node = node[i].declarations[0]
        var devr_file_name = ""
        if(name_node.type == "VariableDeclarator"){
            devr_file_name = name_node.id.name
        }
        if (devr_file_name  === ""){
            continue
        }  
        var js = escodegen.generate(name_node.init.callee) 
        let my_code = "var " + devr_file_name + " ="
        my_code = my_code + js  +"(function(){},{},{})"+ "\n\n"    
        global.result_data = global.result_data + my_code    
    }
    dump_result(global.result_data)
}

function main_task(){
    parse_cut_ES6_code2AST() 
    find_all_ES6_function()
    cut_ES6_code()       
    complement_code()
}

main_task()