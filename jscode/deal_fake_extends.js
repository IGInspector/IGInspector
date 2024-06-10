const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const util = require('./util');
const exp = require('constants');


var ast = {}
var node = {}


function customTopologicalSort(arr) {
    const graph = new Map();
    const inDegree = new Map();
    const isCC = new Set(); 
    arr.forEach(([son, s_prop, father, f_prop]) => {
        if (!graph.has(father)) {
            graph.set(father, []);
            inDegree.set(father, 0);
        }

        if (!graph.has(son)) {
            graph.set(son, []);
            inDegree.set(son, 0);
        }

        graph.get(father).push(son);
        inDegree.set(son, inDegree.get(son) + 1);

        
        if (father === 'cc') {
            isCC.add(son);
        }
    });
    const queue = [];
    inDegree.forEach((degree, node) => {
        if (degree === 0) {
            queue.push(node);
        }
    });
    const result = [];
    while (queue.length > 0) {
        const node = queue.shift();
        if (isCC.has(node)) {
            result.unshift(node);
        } else {
            result.push(node);
        }
        for (const neighbor of graph.get(node)) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }
    return result;
}

function processArray(inputArray) {
    const resultArray = [...inputArray];
    for (const row of inputArray) {
        const valueFromSecondColumn = row[2];
        if (!resultArray.some(([existingValue]) => existingValue === valueFromSecondColumn)) {
            resultArray.push([valueFromSecondColumn, '', '', '']);
        }
    }
    return resultArray;
}


function sortExtendsList(arr){
    const uniqueSet = new Set(arr.map(JSON.stringify));
    arr = Array.from(uniqueSet).map(JSON.parse);
    arr = processArray(arr)
    c_array = customTopologicalSort(arr)
    const orderMap = new Map();
    c_array.forEach((key, index) => {
        orderMap.set(key, index);
    });

    arr.sort((a, b) => {
        const orderA = orderMap.get(a[0]);
        const orderB = orderMap.get(b[0]);
        if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
        } else if (orderA !== undefined) {
        return -1;
        } else if (orderB !== undefined) {
        return 1;
        } else {
        return 0;
        }
    });
    return arr
}


function parse_code2AST(pathToFile){
    const fileContent = fs.readFileSync(pathToFile, 'utf-8');    
    ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) { 
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    node = enter_node.right.arguments[0]                
                    return estraverse.VisitorOption.Break            
                }
            }
        }
    })   

    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name 
        if (!devr_file_name){
            continue
        }    
        util.all_module_name.push(util.parseModuleName(devr_file_name))
    }
}


function findFather(){
    var file_result = {}
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name 
        if (!devr_file_name){
            continue
        }    
        util.all_func[devr_file_name] = {}
        util.all_func_id[devr_file_name] = {}
        util.all_func_code[devr_file_name] = {}
        let body_node = node.properties[i].value.elements[0].body 
        
        var import_param_ = node.properties[i].value.elements[0].params[0].name
        var self_param_ = node.properties[i].value.elements[0].params[1].name
        var export_param_ = node.properties[i].value.elements[0].params[2].name
        if(body_node.type === "BlockStatement" ){
            invoke_ = util.getInvokeModule(body_node, import_param_)
            util.module_invoke[devr_file_name] = invoke_
            result_ = util.processModule(devr_file_name, body_node, export_param_)
            file_result[devr_file_name] = result_
        }
    }

    for(let devr_file_name in file_result){
        result_ = file_result[devr_file_name]
        if(result_ != {}){
            for(const key in result_){
                value = result_[key]
                func_id = value[0]
                class_ = value[1]
                class_code_ = value[2]
                father_name_raw = value[3]

                util.all_func[devr_file_name][key] = class_
                util.all_func_id[devr_file_name][key] = func_id
                util.all_func_code[devr_file_name][key] = class_code_

                if(father_name_raw !== ""){
                    father_ = getFatherName(father_name_raw, devr_file_name)
                    if(father_){
                        util.extends_list.push([devr_file_name, key, father_[0], father_[1]])
                    }
                    else{
                        console.log("filter wrong father: ", devr_file_name, father_name_raw)                   
                    }
                }
            };
        }
    }
    util.extends_list = sortExtendsList(util.extends_list)
    console.log(util.extends_list)
}

function getFatherName(extends_var, devr_file_name){
    prop = "default"
    let expr;
    if(extends_var && extends_var != "" && !extends_var.includes("function")){
        if(extends_var === "cc.Component"){
            return ["cc.Component", prop]
        }
        try{
            expr = esprima.parseScript(extends_var).body[0].expression
        }
        catch(error){
            console.log("getfather Error:", error)
            return null
        }
        if(expr && expr.type === "Identifier"){
            id = expr.name
            
            if(Object.keys(util.all_windowname).includes(id)){
                return [util.all_windowname[id], "window_flag"]
            }
            
            else if(id in util.module_invoke[devr_file_name]){
                return [util.module_invoke[devr_file_name][id][0], util.module_invoke[devr_file_name][id][1]]
            }
        }
        else if(expr && expr.type === "MemberExpression"){
            obj = expr.object  
            if(obj.type === "Identifier" || obj.type === "CallExpression"){
                obj_js = escodegen.generate(obj)
                prop = ""
                if(expr.property.type === "Identifier"){
                    prop = expr.property.name
                }
                else if(expr.property.type === "Literal"){
                    prop = expr.property.value
                }
                const match = obj_js.match(/'(.+?)'/);
                obj_js = match ? match[1] : obj_js;

                if(obj_js.includes("\/")){
                    var index = obj_js.lastIndexOf("\/");  
                    obj_js = obj_js.substring(index + 1, obj_js.length);
                }
                if(obj_js in util.module_invoke[devr_file_name]){
                    return [util.module_invoke[devr_file_name][obj_js][0], prop]
                }
                else if(util.all_module_name.includes(obj_js)){
                    return [obj_js, prop]
                }
                else if(Object.keys(util.all_windowname).includes(obj_js)){
                    return [util.all_windowname[obj_js], "window_flag"]
                }
            }
            else if(obj.type === "MemberExpression"){
            }  
        }
        extends_var = util.parseModuleName(extends_var)
        if(util.all_module_name.includes(extends_var)){
            return [extends_var, prop]
        }
    }
    return null
}


function  insertFatherCode(this_task, expression_list, inner_id){
    if(!(util.all_func[this_task[0]][this_task[1]] && util.all_func_code[this_task[0]][this_task[1]])){
        console.log("child not found " + this_task)
        return
    }

    if(!(util.all_func[this_task[2]][this_task[3]] && util.all_func_code[this_task[2]][this_task[3]])){
        console.log("father not found " + this_task)
        return
    }
                    
    let child_s = util.all_func[this_task[0]][this_task[1]]["static"]
    let child_p = util.all_func[this_task[0]][this_task[1]]["proto"]

    let father_s = util.all_func[this_task[2]][this_task[3]]["static"]
    let father_p = util.all_func[this_task[2]][this_task[3]]["proto"]

    let to_s = util.getArrayDifference(child_s, father_s)
    let to_p = util.getArrayDifference(child_p, father_p)

    for (i = 0 ;i < to_s.length; i++){
        Cross  = to_s[i]
        str = util.all_func_code[this_task[2]][this_task[3]][Cross]
        substring = str.split(".").slice(1).join(".");
        insert_code = inner_id + "." + substring
        util.all_func[this_task[0]][this_task[1]]['static'].push(Cross)
        util.all_func_code[this_task[0]][this_task[1]][Cross] = insert_code
        newAst = {}
        try {
            newAst = esprima.parseScript(insert_code).body[0].expression;    
            expression_list.splice(expression_list.length-1 , 0, newAst);      
        }catch(error){
            console.log('527: ',error.message)
        }                           
    }

    for (i = 0 ;i < to_p.length; i++){
        Cross  = to_p[i]
        str = util.all_func_code[this_task[2]][this_task[3]][Cross]
        substring = str.split(".").slice(1).join(".");
        insert_code = inner_id + "." + substring
        util.all_func[this_task[0]][this_task[1]]['proto'].push(Cross)
        util.all_func_code[this_task[0]][this_task[1]][Cross] = insert_code
        newAst = {}
        try {
            newAst = esprima.parseScript(insert_code).body[0].expression;
            expression_list.splice(expression_list.length-1 , 0, newAst);         
        }catch(error){
            console.log('542: ',error.message)
        }                                                    
    }                            
}


function fakeExtends(){
    while(util.extends_list.length !=0 ){
        let this_task = util.extends_list.shift()
        let ch_name = this_task[0]
        let ch_prop = this_task[1]
        if(ch_name === "cc.Component"){
            var cc_insert_dic = {}
            let scheduleOnce_js = "t.prototype.scheduleOnce = function cc_component_scheduleOnce(callback, delay_time) { \n\t  callback() }"
            let schedule_js = "t.prototype.schedule = function cc_component_schedule(a){a() }"
            let onClick_js = "t.prototype.onClick = function cc_Button_onClick(node, a){a() }"

            cc_insert_dic["schedule"] = schedule_js
            cc_insert_dic["scheduleOnce"] = scheduleOnce_js
            cc_insert_dic["onClick"] = onClick_js

            util.all_func[ch_name] = {}
            util.all_func[ch_name]["default"] = {}
            util.all_func_code[ch_name] = {}
            util.all_func_code[ch_name]["default"] = {}
            util.all_func[ch_name]["default"]["proto"] = []

            for (const key in cc_insert_dic) {
                if (cc_insert_dic.hasOwnProperty(key)) {
                    util.all_func[ch_name]["default"]["proto"].push(key)
                    util.all_func_code[ch_name]['default'][key] = cc_insert_dic[key]
                }
            }
        }
        else if(Object.keys(util.all_windowname).includes(ch_name)){
            for (let i = 0; i < node.properties.length; i++) { 
                var name_node = node.properties[i]
                
                let devr_file_name = name_node.key.name
                
                if (devr_file_name != util.all_windowname[ch_name]){
                    continue
                } 
                let body_node = node.properties[i].value.elements[0].body
                let expression_list = null
                let inner_id = null
                estraverse.traverse(body_node, {
                    enter(enter_node) {
                        
                        if(enter_node.type === "ReturnStatement" && enter_node.argument && enter_node.argument.type === "SequenceExpression"){
                            expression_list = enter_node.argument.expressions
                            if(expression_list[expression_list.length-1].type === "Identifier"){
                                inner_id = expression_list[expression_list.length-1].name
                            }
                        }
                    }
                })   
                if(expression_list && inner_id){
                    insertFatherCode(this_task, expression_list, inner_id)
                }
            }
        }
        else if(ch_name && ch_prop){
            var func_id = util.all_func_id[ch_name][ch_prop] 
            for (let i = 0; i < node.properties.length; i++) { 
                var name_node = node.properties[i]
                
                let devr_file_name = name_node.key.name
                
                if (devr_file_name !== ch_name){
                    continue
                } 
                let body_node1 = node.properties[i].value.elements[0].body
                let expression_list = null
                let inner_id = null
                let func_node = null
                estraverse.traverse(body_node1, {
                    enter(enter_node) {
                        
                        if(enter_node.type === "VariableDeclarator" && enter_node.id.type === "Identifier" && enter_node.id.name=== func_id){
                            if(enter_node.init && enter_node.init.type === "CallExpression" && enter_node.init.callee.type === "FunctionExpression")
                            {
                                func_node = enter_node.init
                                return estraverse.VisitorOption.Break;
                            }
                            else if(enter_node.init && enter_node.init.type === "SequenceExpression"){
                                var exprs = enter_node.init.expressions
                                if(exprs[exprs.length-1].type === "CallExpression" && exprs[exprs.length-1].callee.type === "FunctionExpression"){
                                    func_node = exprs[exprs.length-1]
                                    return estraverse.VisitorOption.Break;
                                }
                            }
                        }
                        else if(enter_node.type === "AssignmentExpression" && enter_node.left){
                            left_ = escodegen.generate(enter_node.left)
                            if(left_ === func_id){
                                right_ = enter_node.right
                                if(enter_node.right.type === "NewExpression" && enter_node.right.callee){
                                    right_ = enter_node.right.callee
                                }
                                if(right_.type === "CallExpression" && right_.callee.type === "FunctionExpression"){
                                    func_node = right_
                                    return estraverse.VisitorOption.Break;
                                }
                            }
                        }
                    }
                })   
                if(func_node){
                    main_body = func_node.callee.body.body
                    if(main_body && main_body[main_body.length-1].type === "ReturnStatement"){
                        return_stat = main_body[main_body.length-1]
                        if(return_stat.argument && return_stat.argument.type === "SequenceExpression"){
                            expression_list = return_stat.argument.expressions
                            if(expression_list && expression_list[expression_list.length-1].type === "Identifier"){
                                inner_id = expression_list[expression_list.length-1].name
                            }
                        }
                        else if(return_stat.argument && return_stat.argument.type === "Identifier"){
                            expression_list = main_body
                            inner_id = return_stat.argument.name
                        }
                    }
                }
                if(expression_list && inner_id){
                    insertFatherCode(this_task, expression_list, inner_id)
                }
            }
        }
    } 
}

function dump_result(jsData, out_file){
    fs.writeFileSync(out_file, jsData); 
}

function main_task(pathToFile, out_file){
    parse_code2AST(pathToFile)
    findFather()
    fakeExtends()   
    var js = escodegen.generate(ast)    
    dump_result(js, out_file)     
}

const argv = process.argv.splice(2);
main_task(argv[0],argv[3])