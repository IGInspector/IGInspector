
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const crypto = require('crypto');
const util = require('./util');


const argv = process.argv.splice(2);
let pathToFile = ""
let outfile = ""
pathToFile = argv[0];   

outfile = argv[0]  
fixfile = argv[1] 

const fileContent = fs.readFileSync(pathToFile, 'utf-8');
const fixContent = fs.readFileSync(fixfile, 'utf-8');
let set_his = new Set([])
let result_target = new Set([])
let result_target_instance = new Set([])

let sink_call_name = new Set([])
global.result_data = ""



const startTime = Date.now();
var node = []
var sink_var = {}
var func_work_list = []

function dump_result(jsData, outfile) {
    fs.writeFileSync(outfile, jsData); 
}


function generateMD5(str) {
    const md5 = crypto.createHash('md5');
    md5.update(str);
    return md5.digest('hex');
}


function scheme_2() {
    for (let i = 0; i < node.length; i++) {
        var declrs = node[i].declarations
        
        if (declrs[0].type === "VariableDeclarator") {
            var devr_file_name = declrs[0].id.name      
            if (!devr_file_name) {
                continue
            }    
            let body_node = declrs[0].init
            if (body_node.type == "CallExpression") {
                
                get_sink_var(body_node, devr_file_name)
                if(sink_var[devr_file_name].length > 0){
                    get_sink_func(body_node, devr_file_name)
                }
                console.log("Advertisement related variables: ",devr_file_name, sink_var[devr_file_name])
            }
        }
    }
    console.log("Ad related function calls: ", func_work_list)
    
    while (func_work_list.length != 0) { 
        if (Date.now() - startTime > 10 * 60 * 1000) {
            return true; 
        }
        const this_work = func_work_list.pop()
        searchSinkFunction(node, this_work)
    }
    
    findAllinstanceFunction()
    return false
}


function extractSinkFunc(block_body, devr_file_name){
    js_set = new Set([])
    if(block_body.body[0]){
        expr = block_body.body[0]        
        estraverse.traverse(expr,{
            enter(enter_node){
                if (enter_node.type === "VariableDeclaration") {
                    js_set.add(escodegen.generate(enter_node))
                }   
                else if(enter_node.type === "AssignmentExpression") {        
                    if(enter_node.right && enter_node.right.type === "Literal"){
                        if (typeof enter_node.right.value === 'string') {
                            console.log(escodegen.generate(enter_node))
                        }else{
                            js_set.add(escodegen.generate(enter_node))
                        }
                    }else{
                        js_set.add(escodegen.generate(enter_node))
                    }
                }
                else if(enter_node.type === "CallExpression" && enter_node.callee && enter_node.callee.type === "MemberExpression") {
                    callee_ = enter_node.callee
                    
                    if (callee_.property && callee_.property.type === "Identifier" && sink_call_name.has(callee_.property.name)){
                        enter_node.arguments = []
                        js_set.add(escodegen.generate(enter_node))
                    }
                }
            },
        })
        js_set = new Set(Array.from(js_set).map(item => {
            if (item.endsWith(";")) {
                return item.slice(0, -1);
            }
            return item;
        }));
        
        const resultString = Array.from(js_set).join(';');
        block_body.body[0] = esprima.parseScript(resultString)
    }
}


function findAllSinkFunction(body, devr_file_name){
    estraverse.traverse(body, {
        enter(enter_node) {
             if (enter_node.type === "CallExpression" && enter_node.callee && enter_node.callee.type === "MemberExpression") {
                callee_ = enter_node.callee 
                if (callee_.property && callee_.property.type === "Identifier" && sink_call_name.has(callee_.property.name)){
                    const parents = this.parents().reverse();
                    let first_flag = false
                    for (let i = 0; i < parents.length; i++) {
                        if (parents[i].type === 'FunctionExpression') {
                            var FunctionExpression = parents[i]       
                            if (FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" && FunctionExpression.id) {     
                                var func_id = FunctionExpression.id      
                                if (first_flag === false && func_id.type === "Identifier" && func_id.name.startsWith(devr_file_name.replace("_module", ""))) {    
                                    if (parents[i + 1].type === "AssignmentExpression" || parents[i + 1].type === "Property") {
                                       first_flag = true
                                       extractSinkFunc(FunctionExpression.body, devr_file_name)
                                    }
                                }
                                let body_code = escodegen.generate(FunctionExpression.body)
                                const md5 = generateMD5(body_code);
                                result_target.add(md5)
                            }
                        }
                    }
                }
            } 
        }
    })
}


function get_sink_var(body, devr_file_name) {
    sink_var[devr_file_name] = []
    estraverse.traverse(body, {
        enter(enter_node) {
            let left_, right_ =  null;
            if (enter_node.type === "AssignmentExpression") {
                left_ = enter_node.left
                right_ = enter_node.right
            }
            else if(enter_node.type === "VariableDeclarator"){
                left_ = enter_node.id
                right_ = enter_node.init
            }
            if(left_ && right_){
                if (right_.type === "CallExpression" && right_.callee.type === "MemberExpression") {
                    let callee_api = escodegen.generate(right_.callee)
                    const regex = /.*qg\.create.*Ad$/
                    if (regex.test(callee_api)) {
                        let ad_obj = escodegen.generate(left_)
                        let last = ad_obj
                        if (ad_obj.indexOf(".") !== -1) {
                            let arr = ad_obj.split(".");
                            last = arr[arr.length - 1]
                        }
                        sink_var[devr_file_name].push(last)
                    }
                }
            }
        }
    })
}


function get_sink_func(body, devr_file_name) {
    estraverse.traverse(body, {
        enter(enter_node) {
            if (enter_node.type === "CallExpression" && enter_node.callee.type === "MemberExpression") {
                if (enter_node.callee.object && enter_node.callee.property && enter_node.callee.property.type === "Identifier") {
                    obj_js = escodegen.generate(enter_node.callee.object)
                    if (sink_var[devr_file_name].some(key => obj_js.endsWith(key))){
                        if(util.show_func.includes(enter_node.callee.property.name)){
                            const parents = this.parents().reverse();
                            let first_flag = false
                            for (let i = 0; i < parents.length; i++) {
                                if (parents[i].type === 'FunctionExpression') {
                                    var FunctionExpression = parents[i]
                                    
                                    if (FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" && FunctionExpression.id) {     
                                        var func_id = FunctionExpression.id 
                                        let body_code = escodegen.generate(FunctionExpression.body)
                                        const md5 = generateMD5(body_code);
                                        result_target.add(md5)
                                        if (first_flag === false) {                      
                                            if (parents[i + 1].type === "AssignmentExpression" && func_id.type === "Identifier" && func_id.name.startsWith(devr_file_name.replace("_module", ""))) {
                                                first_flag = true
                                                var AssignmentExpression = parents[i + 1]
                                                if (AssignmentExpression.left) {
                                                    const assign_left = escodegen.generate(AssignmentExpression.left)
                                                    if (assign_left.indexOf(".") !== -1) {
                                                        let arr = assign_left.split(".");
                                                        let last = arr[arr.length - 1]
                                                        func_work_list.push(last)
                                                    }
                                                }
                                            }    
                                            else if(parents[i + 1].type === "Property" &&func_id.type === "Identifier" && func_id.name.startsWith(devr_file_name.replace("_module", ""))){
                                                first_flag = true
                                                var key = parents[i + 1].key
                                                const key_left = escodegen.generate(key)
                                                if (key_left.indexOf(".") !== -1) {
                                                    let arr = key_left.split(".");
                                                    let last = arr[arr.length - 1]
                                                    func_work_list.push(last)
                                                }
                                                else{
                                                    func_work_list.push(key_left)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if(enter_node.type === "Property" && enter_node.key && enter_node.value && enter_node.value.type === "FunctionExpression"){
                let FunctionExpression  = enter_node.value
                if (FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" && FunctionExpression.id) {     
                    var func_id = FunctionExpression.id 
                    if(func_id.name.startsWith(devr_file_name.replace("_module", ""))){
                        func_code = escodegen.generate(FunctionExpression.body)
                        const regex = /.*qg\.create.*Ad$/
                        if (regex.test(func_code)){
                            func_work_list.push(escodegen.generate(enter_node.key))
                        }
                    }
                }
            }
        }
    })
}


function searchSinkFunction(node, this_work) {
    if (!set_his.has(this_work) && !util.life_cycle_func.includes(this_work) && !/callback/i.test(this_work) && this_work !== "on"){
        set_his.add(this_work)
        console.log("this_work: ",this_work)
        sink_call_name.add(this_work)
        for (let i = 0; i < node.length; i++) {
            var declrs = node[i].declarations
            if (declrs[0].type === "VariableDeclarator") {
                var devr_file_name = declrs[0].id.name
                if (!devr_file_name) {
                    continue
                } 
                let body_node = declrs[0].init
                estraverse.replace(body_node, {
                    enter(enter_node) {
                        if (enter_node.type === "CallExpression" && enter_node.callee.type === "MemberExpression") {
                            if (enter_node.callee.object && enter_node.callee.property && enter_node.callee.property.type === "Identifier") {
                                if (enter_node.callee.property.name === this_work) {
                                    const parents = this.parents().reverse();
                                    let first_flag = false               
                                    for (let i = 0; i < parents.length; i++) {
                                        if (parents[i].type === 'FunctionExpression') {
                                            var FunctionExpression = parents[i]             
                                            if (FunctionExpression.body && FunctionExpression.body.type === "BlockStatement" && FunctionExpression.id) {     
                                                var func_id = FunctionExpression.id 
                                                let body_code = escodegen.generate(FunctionExpression.body)
                                                const md5 = generateMD5(body_code);
                                                result_target.add(md5)
                                                if (first_flag === false) {     
                                                    if (parents[i + 1].type === "AssignmentExpression" && func_id.type === "Identifier" && func_id.name.startsWith(devr_file_name.replace("_module", ""))) {
                                                        first_flag = true
                                                        var AssignmentExpression = parents[i + 1]
                                                        if (AssignmentExpression.left) {
                                                            const assign_left = escodegen.generate(AssignmentExpression.left)
                                                            if (assign_left.indexOf(".") !== -1) {
                                                                let arr = assign_left.split(".");
                                                                let last = arr[arr.length - 1]
                                                                func_work_list.push(last)
                                                            }
                                                        }
                                                    }
                                                    else if(parents[i + 1].type === "Property" && func_id.type === "Identifier" && func_id.name.startsWith(devr_file_name.replace("_module", ""))){
                                                        first_flag = true
                                                        var key = parents[i + 1].key
                                                        const key_left = escodegen.generate(key)
                                                        if (key_left.indexOf(".") !== -1) {
                                                            let arr = key_left.split(".");
                                                            let last = arr[arr.length - 1]
                                                            func_work_list.push(last)
                                                        }
                                                        else{
                                                            func_work_list.push(key_left)
                                                        }
                                                    }
                                                }
                                            }
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
}


function findAllinstanceFunction() {
    for (let i = 0; i < node.length; i++) {
        var declrs = node[i].declarations
        
        if (declrs[0].type === "VariableDeclarator") {
            var devr_file_name = declrs[0].id.name
            if (!devr_file_name) {
                continue
            }
            let body_node = declrs[0].init
            if (body_node.type == "CallExpression") {
                estraverse.traverse(body_node, {
                    enter(enter_node) {
                        if (enter_node.type === 'FunctionExpression') {
                            var FunctionExpression = enter_node
                            if (FunctionExpression.body && FunctionExpression.body.type === "BlockStatement") {
                                let body_code = escodegen.generate(FunctionExpression.body)
                                let new_flag = false
                                let return_flag = false
                                if (body_code.indexOf("return ") !== -1) {
                                    return_flag = true
                                }
                                if (body_code.indexOf("new ") !== -1) {
                                    new_flag = true
                                }
                                if(return_flag){
                                    const md5 = generateMD5(body_code);
                                    result_target_instance.add(md5)
                                }
                            }
                        }
                    }
                })
            }
        }
    }
}


function prune_scheme(body_node, devr_file_name) {
    console.log(devr_file_name)
    findAllSinkFunction(body_node, devr_file_name)
}


function cut_code() {
    console.log("sink_call_name:\n",sink_call_name)
    for (let i = 0; i < node.length; i++) {
        var declrs = node[i].declarations
        if (declrs[0].type === "VariableDeclarator") {
            var devr_file_name = declrs[0].id.name 
            if (!devr_file_name) {
                continue
            }
            
            let body_node = declrs[0].init
            if (body_node.type == "CallExpression") {
                prune_scheme(body_node, devr_file_name);
            }
            my_code = escodegen.generate(body_node)
            global.result_data += "var " + devr_file_name + "= "
            global.result_data += my_code + "\n\n"
        }
    }
    dump_result(global.result_data, outfile)
}


function parse_code2AST() {
    const ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) {  
            if (enter_node.type === "Program" && enter_node.body) {
                node = enter_node.body
            }
        }
    })
    const fix_ast = esprima.parse(fixContent);
    util.findClass(fix_ast) 
}

function main_task() {
    parse_code2AST();
    timeout_signal = scheme_2();
    if(!timeout_signal) cut_code()
}

main_task()