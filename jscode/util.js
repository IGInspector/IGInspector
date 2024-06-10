const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

extends_list = []
all_module_name = []
all_func = {}
all_func_id = {}
all_func_code = {}
all_windowname = {}
module_invoke = {}

let life_cycle_func = ["onLoad", "start", "update", "lateUpdate", "onEnable", "onDisable", "onCollisionEnter", "onDestroy","onBeginContact","onEndContact"]
let cut2_save_func = ["init", "onInit", "OnInit","Init", "schedule", "scheduleOnce","onLoad", "start","onEnable"]
let init_func = ["init", "onInit", "OnInit","Init"]
let show_func = ["show", "load", "onload"]


module.exports = {
    parseModuleName,
    getArrayDifference,
    getInvokeModule,
    processModule,
    findKeyByValue,
    findClass,
    extractInnermostArgumentValue,
    extends_list,
    all_module_name,
    all_func,
    all_func_id,
    all_func_code,
    all_windowname,
    module_invoke,
    life_cycle_func,
    cut2_save_func,
    init_func,
    show_func
};

function findClass(ast_source){
    var node = {}
    estraverse.traverse(ast_source, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    node = enter_node.right.arguments[0]                                         
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
        all_module_name.push(parseModuleName(devr_file_name))
    }
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name 
        if (!devr_file_name){
            continue
        }    
        all_func[devr_file_name] = {}
        all_func_id[devr_file_name] = {}
        all_func_code[devr_file_name] = {}
        let body_node = node.properties[i].value.elements[0].body 
        
        var import_param_ = node.properties[i].value.elements[0].params[0].name
        var self_param_ = node.properties[i].value.elements[0].params[1].name
        var export_param_ = node.properties[i].value.elements[0].params[2].name
        if(body_node.type === "BlockStatement" ){  
            invoke_ = getInvokeModule(body_node, import_param_)
            module_invoke[devr_file_name] = invoke_  
            result_ = processModule(devr_file_name, body_node, export_param_)
            if(result_ != {}){
               for(const key in result_){
                    if(!key.includes('(')){
                        value = result_[key]
                        func_id = value[0]
                        class_ = value[1]
                        class_code_ = value[2]
                        father_name_raw = value[3]
                        
                        all_func[devr_file_name][key] = class_
                        all_func_id[devr_file_name][key] = func_id
                        all_func_code[devr_file_name][key] = class_code_
                    };
                }
            }
        }
    }
}


function findKeyByValue(dictionary, targetValue) {
    for (const key in dictionary) {
      if (dictionary.hasOwnProperty(key) && dictionary[key] === targetValue) {
        return key;
      }
    }
    return null; 
  }


function parseModuleName(input){
    item_string = input.toString();
    if(item_string.endsWith(".js")){
        item_string = item_string.split('.js')[0]
    }
    if(/^\d+$/.test(item_string)){
        item_string = 'digital_'+item_string
    }
    dic_value =item_string.replace(/\W/g, '_');     
    var regex = /^\d/;
    if(regex.test(dic_value)){
        dic_value ="deal_"+dic_value
    }
    return dic_value
}


function getArrayDifference(arr1, arr2) {
    if(!arr2){
        return []
    }
    var difference = arr2.filter(function(item) {
      return arr1.indexOf(item) === -1;
    });
    return difference;
}


function extractInnermostArgumentValue(callExpression, param_set) {
    if (callExpression.arguments.length === 1) {
      var innermostArgument = callExpression.arguments[0];
      if(param_set.has(callExpression.callee.name) && innermostArgument.type === "Literal"){
            mod_name = innermostArgument.value
            if(mod_name && mod_name.toString().includes("\/")){
                var index = mod_name.lastIndexOf("\/");  
                mod_name = mod_name.substring(index + 1,mod_name.length);
            }
            return mod_name
      }
      else if (innermostArgument.type === 'CallExpression') {
            return extractInnermostArgumentValue(innermostArgument, param_set);
      } else {
            return null
      }
    }else{
        return null
    }
}


function getFuncReturn(body){
    var return_id = null
    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression" && enter_node.right.type === "FunctionExpression"){
                if(enter_node.left.type === "MemberExpression"){
                    left_js = escodegen.generate(enter_node.left)
                    const match = left_js.match(/^.*?(?=\.prototype\.)/);
                    if(match){
                        return_id = match[0];
                        return estraverse.VisitorOption.Break 
                    }
                }
            }
        }
    })
    if(return_id){ return return_id}
    
    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression" && enter_node.right.type === "FunctionExpression"){
                if(enter_node.left.type === "MemberExpression"){
                    left_js = escodegen.generate(enter_node.left)
                    const match = left_js.match(/^.*?(?=\.prototype\.)/);
                    if(match){
                        return_id = match[0];
                        return estraverse.VisitorOption.Break 
                    }
                }
            }
            else if(enter_node.type === "ReturnStatement" && enter_node.argument && enter_node.argument.type === "SequenceExpression"){
                exprs = enter_node.argument.expressions
                if(exprs[exprs.length-1].type === "Identifier"){
                    return_id = exprs[exprs.length -1].name
                    return estraverse.VisitorOption.Break 
                }
            }
            
            else if(enter_node.type === "FunctionExpression" && enter_node.body && enter_node.body.type === "BlockStatement"){
                var body_ = enter_node.body.body
                if(body_[body_.length-1] && body_[body_.length-1].type === "ReturnStatement" && body_[body_.length-1].argument.type === "Identifier")
                {
                    return_id = body_[body_.length-1].argument.name
                    return estraverse.VisitorOption.Break 
                }
            }
        }
    })
    return return_id
}


function getProtoStatic(enter_node, this_id){
    let dictionary = {};
    dictionary["property"] = []
    dictionary["proto"] = [] 
    dictionary["static"] = []
    estraverse.traverse(enter_node, {
        enter(enter_node1) {
            if (enter_node1.type === "AssignmentExpression" && enter_node1.left && enter_node1.right ){
                left = enter_node1.left
                right = enter_node1.right 
                if (left.type === "MemberExpression" && right.type ==="FunctionExpression"){
                    if(left.object ){
                        let short_assign = escodegen.generate(left.object)
                        if(this_id)
                        {     
                            if (short_assign.includes(this_id + "."+"prototype")){
                                if (left.property && left.property.type === "Identifier"){
                                    dictionary["proto"].push(left.property.name)
                                }
                            
                            }else if (short_assign === this_id){
                                if (left.property && left.property.type === "Identifier"){
                                    dictionary["static"].push(left.property.name)                                
                                }
                            }
                        }
                        
                        else{
                            if (left.property && left.property.type === "Identifier"){
                                dictionary["proto"].push(left.property.name)
                            }
                        }
                    }
                }
                else if(right.type ==="ObjectExpression"){
                    properties = right.properties
                    for (const property of properties) {
                        if(property.key && property.key.type === "Identifier" && property.value && property.value.type === "FunctionExpression"){        
                            dictionary["proto"].push(property.key.name)
                        }
                    }
                }
            }
        }
    })
    return dictionary
}


function getProtoStatic_code(enter_node, this_id = ""){
    let dictionary = {};
    estraverse.traverse(enter_node, {
        enter(enter_node1) {
            if (enter_node1.type === "AssignmentExpression" && enter_node1.left && enter_node1.right ){
                left = enter_node1.left
                right = enter_node1.right 
                if (left.type === "MemberExpression" && right.type ==="FunctionExpression"){
                    if(left.object){
                        let short_assign = escodegen.generate(left.object)
                        let code = escodegen.generate(enter_node1)
                        if (short_assign.includes(this_id+"."+"prototype")){
                            if (left.property && left.property.type === "Identifier"){
                                dictionary[left.property.name] = code 
                            }
                        }else if (short_assign === this_id){
                            if (left.property && left.property.type === "Identifier"){
                                dictionary[left.property.name] = code                            
                            }
                        }
                    }
                }
                else if(right.type ==="ObjectExpression"){
                    properties = right.properties
                    for (const property of properties) {
                        if(property.key && property.key.type === "Identifier" && property.value && property.value.type === "FunctionExpression"){
                            let code = escodegen.generate(property.value)
                            dictionary[property.key.name] = code
                        }
                    }
                }
            }
        }
    })
    return dictionary
}


function getFuncInfo(body, func_name, var_dic){
    dep_param = {}
    left_ = null
    right_ = null
    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "VariableDeclarator" && enter_node.id && enter_node.init){
                if(enter_node.id){
                    left_js = escodegen.generate(enter_node.id)
                }     
                if( enter_node.init.type === "CallExpression" && enter_node.init.callee.type === "FunctionExpression"){
                    if(left_js === func_name || (var_dic[func_name] && left_js in var_dic[func_name]))
                    {
                        left_ = left_js
                        func_id.push(left_)

                        dep_param[left_] = ""
                        right_ = enter_node.init
                        
                        if(right_.arguments.length > 0){
                            dep_param[left_] = escodegen.generate(right_.arguments[0])
                        }
                    }
                }
                else if(enter_node.init.type === "SequenceExpression"){
                    var expr = enter_node.init.expressions
                    if(expr[expr.length - 1].type === "CallExpression" && expr[expr.length - 1].callee.type === "FunctionExpression"){
                        if(left_js === func_name || (var_dic[func_name] && left_js in var_dic[func_name]))
                        {
                            left_ = left_js
                            func_id.push(left_)

                            dep_param[left_] = ""
                            right_ = expr[expr.length - 1]
                            
                            if(right_.arguments.length > 0){
                                dep_param[left_] = escodegen.generate(right_.arguments[0])
                            }
                        }
                    }
                }
            }
            else if(enter_node.type === "AssignmentExpression"){
                left_js = escodegen.generate(enter_node.left)
                let call_ = null
                if(enter_node.right.type === "NewExpression" && enter_node.right.callee){
                    call_= enter_node.right.callee
                }else{
                    call_ = enter_node.right
                }
                if(call_.type === "CallExpression" &&call_.callee.type === "FunctionExpression"){
                    if(left_js === func_name)
                    {
                        left_ = left_js
                        dep_param[left_] = ""
                        right_ = call_
                        
                        if(right_.arguments.length > 0){
                            dep_param[left_] = escodegen.generate(right_.arguments[0])
                        }
                    }
                }
            }
        }
    })
    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "CallExpression" && enter_node.callee.type === "MemberExpression"){
                callee_js = escodegen.generate(enter_node.callee)
                if(callee_js === "cc.Class"){
                    if(enter_node.arguments.length > 0 && enter_node.arguments[0].type === "ObjectExpression"){
                        properties = enter_node.arguments[0].properties
                        for(let property of properties){
                            if(property.key.type === "Identifier" && property.key.name === "extends" && property.value){
                                dep_param['fake_class'] = escodegen.generate(property.value)
                            }
                        }
                    }
                }
            }
        }
    })
    if(left_ && right_){ 
        return_id = getFuncReturn(right_)
        console.log(return_id)
        func_ = getProtoStatic(right_, return_id)
        func_code_ = getProtoStatic_code(right_, return_id)
        return [left_, func_ , func_code_, dep_param[left_]]
    }
    return []
}


function isNumeric(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
}


function processModule(devr_file_name, body, export_param, self_param){
    var result = {}
    var export_param_set = new Set([export_param])
    var self_param_set = new Set([self_param])

    func_id = []
    func_def = {}
    func_code = {}
    dep_param = {}
    var_dic = {}
    func_prop = {}

    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "Identifier"){
                left = enter_node.id.name
                right = enter_node.init.name
                if(export_param_set.has(right)){
                    export_param_set.add(left)
                }
                if(self_param_set.has(right)){
                    self_param_set.add(left)
                }
            }
            if(enter_node.type === "AssignmentExpression" && enter_node.left && enter_node.right && enter_node.right.type === "Identifier"){ 
                if(enter_node.right.name === "fake_class"){
                    left_js = escodegen.generate(enter_node.left)
                    var parts = left_js.split('.');
                    
                    var name_ = parts[0];
                    var prop_ = parts.slice(1).join('.');
                    if(export_param_set.has(name_)){
                        func_prop["fake_class"] = prop_
                    }
                }
                else if(enter_node.left.type === "MemberExpression"){     
                    left_ = enter_node.left
                    if(left_.object.type === "Identifier" && left_.property.type === "Literal"){
                        if(export_param_set.has(left_.object.name)){
                            func_prop[enter_node.right.name] = left_.property.value
                        }
                    }
                    else{
                        left_js = escodegen.generate(left_)
                        var parts = left_js.split('.');
                        
                        var name_ = parts[0];
                        var prop_ = parts.slice(1).join('.');
                        if(export_param_set.has(name_)){
                            func_prop[enter_node.right.name] = prop_
                        }
                    }
                }
            }
            if(enter_node.type === "AssignmentExpression" && enter_node.left.type === "MemberExpression" && enter_node.right && enter_node.right.type === "NewExpression"
            && enter_node.right.callee.type === "Identifier"){
                left_js = escodegen.generate(enter_node.left)
                var parts = left_js.split('.');
                
                var name_ = parts[0];
                var prop_ = parts.slice(1).join('.');
                if(export_param_set.has(name_)){
                    func_prop[enter_node.right.callee.name] = prop_
                }
            }
            if(enter_node.type === "SequenceExpression"){
                exprs = enter_node.expressions
                exprs.reverse().forEach(function(expr) {
                    if(expr.type === "AssignmentExpression" &&expr.left.type === "Identifier" && expr.right.type === "Identifier"){
                        left_ = expr.left.name
                        right_ = expr.right.name
                        for (let key in var_dic) {
                            if (var_dic.hasOwnProperty(key)) {
                                if(left_ in var_dic[key]){
                                    var_dic[key].push(right_)
                                }
                            }
                        }
                        if(!var_dic[left_]){
                            var_dic[left_] = [left_]
                            var_dic[left_].push(right_)
                        }
                    }
                    else if(expr.type === "AssignmentExpression" && expr.left.type === "MemberExpression" && expr.right.type === "Identifier"){
                        left_js = escodegen.generate(expr.left)
                        var parts = left_js.split('.');
                        
                        var name_ = parts[0];
                        var prop_ = parts.slice(1).join('.');
                        if(export_param_set.has(name_)){
                            func_prop[expr.right.name] = prop_
                        }
                    }
                });
                exprs.reverse()
            }
            if(enter_node.type === "AssignmentExpression" && enter_node.left.type === "MemberExpression" && (enter_node.right.type === "CallExpression" || enter_node.right.type === "NewExpression")){
                
                left_js = escodegen.generate(enter_node.left)
                var parts = left_js.split('.');
                
                var name_ = parts[0];
                var prop_ = parts.slice(1).join('.');

                if(export_param_set.has(name_)){
                    if(enter_node.right.type === "CallExpression" || (enter_node.right.type === "NewExpression" && enter_node.right.callee.type === "CallExpression")){
                        result[prop_] = getFuncInfo(body, left_js, var_dic)
                    }
                }
            }
        }
    })

    console.log(devr_file_name)
    console.log("Export properties:", func_prop)
    for(let func_id in func_prop) {
        
        if(func_prop.hasOwnProperty(func_id) && !isNumeric(func_prop[func_id])){
            result[func_prop[func_id]] = getFuncInfo(body, func_id, var_dic)
        }
    }
    if(Object.keys(result).length !== 0)
    {
        
        if (result.hasOwnProperty('default')) {
            let result_ = {}
            result_['default'] = result['default'];
            return result_;
        } else {
            return result
        }
    }
    estraverse.traverse(body, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression" && enter_node.left.type === "MemberExpression"){
                left_js = escodegen.generate(enter_node.left)
                const regex = /^window\.(.+)/;  
                const match = left_js.match(regex)
                if(match){
                    left_ = match[1]
                    right_ = enter_node.right  
                    if(right_.type === "CallExpression"){
                        return_id = getFuncReturn(right_)
                        dep_param[left_] = ""
                        if(right_.arguments.length > 0){
                            dep_param[left_] = escodegen.generate(right_.arguments[0])
                        }
                        all_windowname[left_] = devr_file_name
                        
                        func_def[left_] = getProtoStatic(enter_node, return_id)
                        func_code[left_] = getProtoStatic_code(enter_node, return_id)
                        result["window_flag"] = []
                        result["window_flag"].push(left_, func_def[left_], func_code[left_], dep_param[left_])
                    }

                    else if(right_.type === "ObjectExpression"){
                        all_windowname[left_] = devr_file_name 
                        func_def[left_] = getProtoStatic(enter_node)
                        func_code[left_] = getProtoStatic_code(enter_node)
                        result["window_flag"] = []
                        result["window_flag"].push(left_, func_def[left_], func_code[left_], "")
                    }

                    else if(right_.type === "SequenceExpression" && right_.expressions && right_.expressions.length > 0){
                        expr = right_.expressions[0]
                        if(expr.type === "AssignmentExpression" && expr.right && expr.right.type==="FunctionExpression"){
                            all_windowname[left_] = devr_file_name 
                            func_def[left_] = getProtoStatic(expr)
                            func_code[left_] = getProtoStatic_code(expr)
                            result["window_flag"] = []
                            result["window_flag"].push(left_, func_def[left_], func_code[left_], "")
                        }
                        else{  
                            estraverse.traverse(body, {
                                enter(node_) {
                                    if(node_.type === "AssignmentExpression" && node_.right && node_.right.type === "FunctionExpression"){
                                        node_left = node_.left
                                        if(node_left.type === "MemberExpression" && node_left.object && node_left.object.type === "Identifier"){
                                            if(node_left.object.name === left_){
                                                all_windowname[left_] = devr_file_name
                                                return estraverse.VisitorOption.Break 
                                            }
                                        }
                                    }
                                }
                            })
                        }
                    }  
                    else{
                        right = escodegen.generate(right_)
                        if(func_id.includes(right)){
                            all_windowname[left_] = devr_file_name
                            result["window_flag"] = getFuncInfo(body, right, var_dic)
                        }
                    }
                }
            } 
        }
    })
    return result
}


function getInvokeModule(body , invoke_function){
    result = {}
    param_set = new Set([invoke_function])
    estraverse.traverse(body, {
        enter(enter_node) {
            
            if(enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "Identifier"){
                left = enter_node.id.name
                right = enter_node.init.name
                if(param_set.has(right)){
                    param_set.add(left)
                }
            }
        }
    })
    estraverse.traverse(body, {
        enter(enter_node) {
            if (enter_node.type === 'VariableDeclaration') {
                enter_node.declarations.forEach(function (declaration) {
                  id = escodegen.generate(declaration.id)
                  if (declaration.init && declaration.init.type === 'CallExpression'){
                    var argumentValue = extractInnermostArgumentValue(declaration.init, param_set);
                    if(argumentValue){
                        let out_obj = parseModuleName(argumentValue)
                        result[id] = [out_obj, ""]
                    }
                  }
                   
                  if(declaration.init && declaration.init.type === "SequenceExpression"){
                        var expr = declaration.init.expressions   
                        callexpr = expr[expr.length - 1]
                        if(callexpr.type === "CallExpression")
                        {
                            var argumentValue = extractInnermostArgumentValue(callexpr, param_set);
                            if(argumentValue){
                                let out_obj = parseModuleName(argumentValue)
                                result[id] = [out_obj,""]
                            }
                        }
                  }
                  if (declaration.init && declaration.init.type === "MemberExpression" && declaration.init.object) {
                    if (declaration.init.object.type === 'CallExpression'){
                        var argumentValue = extractInnermostArgumentValue(declaration.init.object, param_set);
                        if(argumentValue){
                            let out_obj = parseModuleName(argumentValue)
                            let prop = ""
                            if(declaration.init.property && declaration.init.property.type === "Identifier"){
                                prop = declaration.init.property.name
                            }
                            result[id] = [out_obj, prop]
                        }
                    }
                  };
                });
            }
        }
    });
    return result
}
