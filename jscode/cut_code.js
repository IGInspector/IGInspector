const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');                      
const util = require('./util');
const { globalAgent } = require('http');


const argv = process.argv.splice(2);
let pathToFile = argv[0];          //fix.js
let outfile = argv[1];             //cut_result.js

const fileContent = fs.readFileSync(pathToFile, 'utf-8');
let work_list_0 = []
global.result_data = "" 

var node = {}


let set_his_0 = new Set([])
let his_target = new Set([]) 
var all_global_var = new Set([]) 

var module_dependency = {}
var is_exports = {}
var return_name = {}

function dump_result(jsData, outfile){
    fs.writeFileSync(outfile, jsData); 
}

//**************************** Module Pruning *******************************
function scheme_Module(){
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name 
        if (!devr_file_name){
            continue
        }    

        module_dependency[devr_file_name] = new Set([])
        let body_node = name_node.value.elements[0].body 
        if(body_node.type === "BlockStatement" ){
            getSink(body_node, devr_file_name); 
        } 
    }

    explicit_Import()
    implicit_Import()

    console.log(module_dependency)

    while(work_list_0.length != 0){
        const this_work = work_list_0.pop()
        if(!his_target.has(this_work))
        {
            his_target.add(this_work)
            set_his_0.add(this_work)
            Object.keys(module_dependency).forEach(function (key) {
                var value = module_dependency[key];
                if(value.has(this_work)){
                    work_list_0.push(key);
                }
            });
            if(module_dependency[this_work]){
                for(let item of module_dependency[this_work]){
                    work_list_0.push(item)
                }
            }
        }
    }
}

function getSink(body, module_name){
    body_js = escodegen.generate(body)
    const regex = /qg\.create.*Ad/
    if(regex.test(body_js)){
        work_list_0.push(module_name)
        return
    }
}

function getAllGloablVar(){
    const window_Content = fs.readFileSync(pathToFile.replace("fix","window"), 'utf-8');
    const ast = esprima.parse(window_Content);
    estraverse.traverse(ast, { 
        enter(enter_node) {
            if(enter_node.type === "VariableDeclarator"  && enter_node.id.name !== "window"){
                all_global_var.add(enter_node.id.name)
            }
        }
    })    
}


function explicit_Import(){ 
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name     
  
        let import_file = node.properties[i].value.elements[1]
        let import_js = escodegen.generate(import_file)    
        
        const dictObj =   eval(`(${import_js})`);   
        const values = Object.values(dictObj)    
        const set1 = new Set(values);

        set1.forEach(element =>{
            if(element){
                set1.add(util.parseModuleName(element))
            }
        })

        module_dependency[devr_file_name] = set1

        var import_function_ = node.properties[i].value.elements[0].params[0].name
        let body_node = name_node.value.elements[0].body  
        if(body_node.type == "BlockStatement" ){
            invokeExternalFunction(body_node, import_function_, devr_file_name)  
        }
    }        
}

function invokeExternalFunction(body , invoke_function, devr_file_name){
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
            // var n = e("../../Utils/VIVOSDK"), o = s(e("../../Utils/OPPOSDK"))
            if (enter_node.type === 'VariableDeclaration') {
                enter_node.declarations.forEach(function (declaration) {
                  if (declaration.init && declaration.init.type === 'CallExpression'){
                    var argumentValue = util.extractInnermostArgumentValue(declaration.init, param_set);
                    if(argumentValue){
                        let out_obj = util.parseModuleName(argumentValue)
                        const Statement =  {
                            "type": "Identifier",
                            "name": out_obj + "_module"
                            }                       
                        declaration.init = Statement
                        module_dependency[devr_file_name].add(out_obj)
                    }
                  }
                   //i = (t('../gxcore/script/core/GxEnum'), a(t('../gxcore/script/util/ResUtil')))
                  else if(declaration.init && declaration.init.type === "SequenceExpression"){
                        var expr = declaration.init.expressions
                        callexpr = expr[expr.length - 1]
                        if(callexpr.type === "CallExpression")
                        {
                            var argumentValue = util.extractInnermostArgumentValue(callexpr, param_set);
                            if(argumentValue){
                                let out_obj = util.parseModuleName(argumentValue)
                                const Statement =  {
                                    "type": "Identifier",
                                    "name": out_obj + "_module"
                                    }                       
                                declaration.init = Statement
                                module_dependency[devr_file_name].add(out_obj)
                            }
                        }
                    }
                });
            }
            // r = t('../SDK/Platforms/QuickGame/Platforms_QuickGame').default;
            if (enter_node.type === "MemberExpression" && enter_node.object) {
                if (enter_node.object.type === 'CallExpression'){
                var argumentValue = util.extractInnermostArgumentValue(enter_node.object, param_set);
                if(argumentValue){
                    let out_obj = util.parseModuleName(argumentValue)
                    const  Statement =  {
                        "type": "Identifier",
                        "name": out_obj + "_module"
                        }                       
                    enter_node.object = Statement
                    module_dependency[devr_file_name].add(out_obj)
                }
                }
            };

            //var o, n = (o = t('../gxcore/script/GxGame')) && o.__esModule ? o : {default: o};
            if (enter_node.type === "AssignmentExpression") {
                if (enter_node.right && enter_node.right.type === 'CallExpression'){
                    var argumentValue = util.extractInnermostArgumentValue(enter_node.right, param_set);
                    if(argumentValue){
                        let out_obj = util.parseModuleName(argumentValue)
                        const Statement =  {
                            "type": "Identifier",
                            "name": out_obj + "_module"
                            }                       
                        enter_node.right = Statement
                        module_dependency[devr_file_name].add(out_obj)
                    }
                }
            };
        }
    })
}

function extract_var_name(input){
    if(input.startsWith("cc.global")){
        return input
    }
    parts = input.split('window.');
    if(parts.length > 1){
        input = parts[1]
    }
    parts = input.split('.');
    return parts.length > 1 ? parts[0] : input;
}


function implicit_Import(){ 
    getAllGloablVar()

    global_var_declr = {}
    all_global_var.forEach(element => {
        global_var_declr[element] = new Set([]);
    });

    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name     
        let body_node = name_node.value.elements[0].body  
        if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === "AssignmentExpression" && enter_node.left){
                        left_js = escodegen.generate(enter_node.left)

                        if(left_js.startsWith("cc.global")){
                            global_var_declr[left_js] = new Set([]);
                            global_var_declr[left_js].add(devr_file_name)
                        }
                        else{
                            left_js = extract_var_name(left_js)
                            if(all_global_var.has(left_js)){ 
                                global_var_declr[left_js].add(devr_file_name)
                            }
                        }
                    }  
                }
            })
        }
    }

    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name     
        let body_node = name_node.value.elements[0].body  
        if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    //var c= globalvar.script
                    if(enter_node.type === "VariableDeclarator" && enter_node.init){
                        init_js =escodegen.generate(enter_node.init)
                        init_js = extract_var_name(init_js)
                        if(all_global_var.has(init_js) || (init_js.startsWith("cc.global") && global_var_declr[init_js])){
                            module_dependency[devr_file_name] = new Set([...module_dependency[devr_file_name], ...global_var_declr[init_js],])
                        }
                    } 
                    //z = globalvar.script
                    if(enter_node.type === "AssignmentExpression" && enter_node.right){
                        right_js =escodegen.generate(enter_node.right)
                        right_js = extract_var_name(right_js)
                        if(all_global_var.has(right_js) || (right_js.startsWith("cc.global") && global_var_declr[right_js])){
                            module_dependency[devr_file_name] = new Set([...module_dependency[devr_file_name], ...global_var_declr[right_js]])
                        }
                    } 
                    //globalvar.script.showad();
                    if(enter_node.type === "CallExpression" && enter_node.callee){
                        callee_js =escodegen.generate(enter_node.callee)
                        callee_js = extract_var_name(callee_js)
                        if(all_global_var.has(callee_js) || (callee_js.startsWith("cc.global") && global_var_declr[callee_js])){
                            module_dependency[devr_file_name] = new Set([...module_dependency[devr_file_name], ...global_var_declr[callee_js]])
                        }
                    }  
                    //this.instance = new qxygameVivoManager()
                    if(enter_node.type === "NewExpression" && enter_node.callee){
                        callee_js = escodegen.generate(enter_node.callee)
                        callee_js = extract_var_name(callee_js)
                        if(all_global_var.has(callee_js) || callee_js.startsWith("cc.global")){
                            module_dependency[devr_file_name] = new Set([...module_dependency[devr_file_name], ...global_var_declr[callee_js]])
                        }
                    }
                }
            })
        }
    }        
}
//*******************************************************************


function  cut_code(){
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name

        if (devr_file_name  === ""){
            continue
        }  

        if(!set_his_0.has(devr_file_name)){
            continue
        }

        var oo_ = ""
        if (node.properties[i].value.elements[0].params[2] )
            oo_ = node.properties[i].value.elements[0].params[2].name
        var Second__oo = ""
        if (node.properties[i].value.elements[0].params[1] )
            Second__oo = node.properties[i].value.elements[0].params[1].name        
        let body_node = node.properties[i].value.elements[0].body

        if(body_node.type == "BlockStatement"){
            if(return_name[devr_file_name]){
                oo_ = return_name[devr_file_name];
                Second__oo = return_name[devr_file_name];
            }

            const returnStatement = {
                type: 'ReturnStatement',
                argument: { type: 'Identifier', name: oo_ },
            };
            const returnStatement2 = {
                type: 'ReturnStatement',
                argument: {
                    type:'MemberExpression',
                    object:{
                        type:'Identifier',
                        name:Second__oo

                    },
                    property:{
                        type:'Identifier',
                        name:'exports'
                    }
                } 
                
            }    
            var body_length = body_node.body.length            
            var js_return = escodegen.generate(node.properties[i].value.elements[0])
            if (is_exports[devr_file_name] && !js_return.includes("cc.Class(")) {
                body_node.body.splice(body_length, 0, returnStatement2);              
            } else {
                body_node.body.splice(body_length, 0, returnStatement);              
            }           
        }   
    }
    fakeExtends_Patch(); 
    decorateAssign_Patch();

    his_module = new Set([])
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i] 
        var devr_file_name = name_node.key.name
        if (devr_file_name  === ""){
            continue
        }  
        if(!set_his_0.has(devr_file_name) || his_module.has(devr_file_name)){
            continue
        }
        his_module.add(devr_file_name)
        try{
            var js = escodegen.generate(name_node.value.elements[0])  
        }catch(error){
            console.log(error, devr_file_name)
        }
            
        let my_code = "var " +  devr_file_name + "_module"+ " = " + js
        my_code += "(function(){},{},{}) \n\n";
        global.result_data += my_code 
    }
    dump_result(global.result_data, outfile)
}


function parseCode2AST(){
    const ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) {
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    node = enter_node.right.arguments[0]                                         
                }
            }
        }
    })   
    util.findClass(ast) 
}

function replaceWindowQg(){
    var window_qg_dic = []
   for (let i = 0; i < node.properties.length; i++) {
       var name_node = node.properties[i]
       var devr_file_name = name_node.key.name
       if (!devr_file_name){
           continue
       }    
       let body_node = name_node.value.elements[0].body 
       if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "MemberExpression"){
                        js = escodegen.generate(enter_node.init)
                        if(js == "window.qg"){
                            window_qg_dic.push(enter_node.id.name)
                        }
                    }
                    //this.port = window.qg
                    else if(enter_node.type === "AssignmentExpression" && enter_node.left && enter_node.right && enter_node.right.type === "MemberExpression"){
                        right_js = escodegen.generate(enter_node.right)
                        left_js = escodegen.generate(enter_node.left)
                        if(right_js === "window.qg"){
                            parts = left_js.split(".");
                            const s = parts.length > 1 ? parts.pop():left_js;
                            window_qg_dic.push(s);
                        }
                    }
                }
            })
       } 
   } 
   
   for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        let body_node = name_node.value.elements[0].body 
        if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === "MemberExpression"){

                        var prop_js = escodegen.generate(enter_node.property)
                        var obj_js = escodegen.generate(enter_node.object)

                        const regex = /^create.*Ad$/;
                        parts = obj_js.split(".");
                        s = parts.length > 1 ? parts.pop() : obj_js;
                        if(window_qg_dic.includes(s) && regex.test(prop_js)){
                            const qg_identifier= {
                                type: "Identifier",
                                name: "qg"
                              };
                            enter_node.object = qg_identifier
                        }
                    }

                }  
            })
        } 
    } 
}

function moduleExports(){
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        let body_node = name_node.value.elements[0].body 
        let self_param = node.properties[i].value.elements[0].params[1].name
        let export_param = node.properties[i].value.elements[0].params[2].name

        var export_param_set = new Set([export_param])
        var self_param_set = new Set([self_param])

        is_exports[devr_file_name] = false
        cc_class_flag = false
        if(body_node.type == "BlockStatement" ){
            body_code_js = escodegen.generate(body_node)
            if(body_code_js.includes("cc.Class(")){
                cc_class_flag = true    
            }
            estraverse.traverse(body_node, {
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
                    if(enter_node.type === "AssignmentExpression"){
                        left_ = enter_node.left
                        right_ = enter_node.right
                        if(left_.type === "MemberExpression"){
                            if(left_.object && left_.object.type === "Identifier" && left_.property && left_.property.type === "Identifier"){
                                if(self_param_set.has(left_.object.name) && left_.property.name === "exports"){
                                    if(right_.type=== "MemberExpression" || right_.type === "Identifier")
                                    {
                                        right_js = escodegen.generate(right_)
                                        param = right_js.split(".")[0]
                                        if(!export_param_set.has(param)){
                                            is_exports[devr_file_name] = true
                                            return_name[devr_file_name] = left_.object.name
                                            if(cc_class_flag){
                                                return_name[devr_file_name] = export_param
                                            }
                                            return estraverse.VisitorOption.Break
                                        }
                                    }
                                    else if(right_.type === "ObjectExpression"){
                                        is_exports[devr_file_name] = true
                                        return_name[devr_file_name] = left_.object.name   
                                        if(cc_class_flag){
                                            return_name[devr_file_name] = export_param
                                        } 
                                        return estraverse.VisitorOption.Break
                                    }
                                }
                                else if(export_param_set.has(left_.object.name)){
                                    const keys = Object.keys(util.all_func[devr_file_name]);
                                    if(keys.includes(left_.property.name)){
                                        return_name[devr_file_name] = left_.object.name
                                        return estraverse.VisitorOption.Break
                                    }
                                }
                            }
                        }
                        else if(left_.type === "Identifier" && right_.type === "Identifier" && right_.name === "fake_class"){
                            return_name[devr_file_name] = left_.name
                            return estraverse.VisitorOption.Break 
                        }
                    }
                }
            })
        }
    }
}


function decorateAssign(node) {
  if (node.type === 'AssignmentExpression'){
    if(node.right.callee && node.right.callee.name === '__decorate')
        return true
    else if(node.right)
        return decorateAssign(node.right)
  }
  return false
}

function decorateAssign_Patch(){
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        let body_node = name_node.value.elements[0].body  
        if(body_node.type == "BlockStatement" ){
            estraverse.replace(body_node, {
                enter: function(enter_node) {
                    if(enter_node.type === "ExpressionStatement" && enter_node.expression.type ==="AssignmentExpression"){
                        if(decorateAssign(enter_node.expression)){
                            return estraverse.VisitorOption.Remove;
                        }
                    }
                    if (enter_node.type === 'AssignmentExpression') {
                        if(decorateAssign(enter_node)){
                            return estraverse.VisitorOption.Remove;
                        }
                    }           
                }
            });
        }
    }
}

function fakeExtends_Patch(){
    var Singleton_module = {}
    var find_father = {}
    var all_module_member_declr = {} 
    var tmp_ = {}
    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        let body_node = name_node.value.elements[0].body  
        if(body_node.type == "BlockStatement" ){
            var tmp_func_name = ""
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === "AssignmentExpression" && enter_node.right && enter_node.right.type === "FunctionExpression" && enter_node.left && enter_node.left.type === "MemberExpression"){
                        if(enter_node.left.property.type === "Identifier" && enter_node.left.property.name === "getInstance"){
                            Singleton_module[devr_file_name] = "getInstance()"
                        }
                        if(enter_node.left.property.type === "Identifier" && enter_node.left.property.name === "getInterface"){
                            Singleton_module[devr_file_name] = "getInterface()"
                        }
                    }

                    if(enter_node.type ==='AssignmentExpression' && enter_node.left && enter_node.right){                        
                        var left_ = enter_node.left
                        var right_ = enter_node.right
                        if(left_.type === 'MemberExpression' && left_.object && left_.property &&  left_.property.type ==='Identifier'){
                            const Obj_pro = left_.property.name 
                            if(Obj_pro === 'default' && right_.type ==='Identifier' ){
                                default_obj = right_.name 
                                tmp_func_name = default_obj
                            }
                            
                        }
                    }
                    if(enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "Identifier"){
                        if(enter_node.init.name.endsWith("_module")){
                            tmp_[enter_node.id.name] = enter_node.init.name.replace("_module","");
                            if(!all_module_member_declr[devr_file_name]){
                                all_module_member_declr[devr_file_name] = "var " + escodegen.generate(enter_node) + ", "
                            }
                            else{
                                all_module_member_declr[devr_file_name] += escodegen.generate(enter_node) + ", "
                            }
                        }
                    }
                }
            })

            if(all_module_member_declr[devr_file_name]){
                all_module_member_declr[devr_file_name] = all_module_member_declr[devr_file_name].replace(/,([^,]*)$/, ';$1');
            }
                    
            
            estraverse.traverse(body_node, {
                enter(enter_node){        
                    if(enter_node.type === "ExpressionStatement" && enter_node.expression.type === "AssignmentExpression"){
                        left_ = enter_node.expression.left
                        right_ = enter_node.expression.right
                        // d = function (t) {...}(a.default);
                        if(left_.type === "Identifier" && left_.name === tmp_func_name){
                            if(right_.type === "CallExpression" && right_.arguments.length === 1 && right_.arguments[0].type === "MemberExpression"){
                                member_expr = right_.arguments[0]
                                if(member_expr.object && member_expr.object.type === "Identifier" && member_expr.property.type === "Identifier" && member_expr.property.name === "default"){
                                    if(tmp_[member_expr.object.name]){
                                        find_father[devr_file_name] = tmp_[member_expr.object.name]
                                    }
                                }
                            }
                        }
                    }
                    if(enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "CallExpression"){
                        if(enter_node.id.type === "Identifier" && enter_node.id.name === tmp_func_name && enter_node.init.callee.type === "FunctionExpression"){
                            arg = enter_node.init.arguments
                            if(arg.length === 1 && arg[0].type === "MemberExpression"){
                                if(arg[0].object.type === "Identifier" && arg[0].property.type === "Identifier" && arg[0].property.name === "default"){
                                    arg_name = arg[0].object.name
                                    if(tmp_[arg_name]){
                                        find_father[devr_file_name] = tmp_[arg_name]
                                    }
                                }
                            }
                        }
                    }
                    //(t('./BaseGameSys').default)
                    if(enter_node.type === "CallExpression" && enter_node.arguments.length === 1){
                        if(enter_node.arguments[0].type === "MemberExpression"){
                            obj = enter_node.arguments[0].object
                            prop = enter_node.arguments[0].property
                            if(prop.type === "Identifier" && prop.name === "default" && obj.name && obj.name.endsWith("_module")){
                                find_father[devr_file_name] = obj.name.replace("_module","")
                            }
                        }
                    }
                }  
            })
        }
    } 

    for (let i = 0; i < node.properties.length; i++) {
        var name_node = node.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    

        if(find_father[devr_file_name]){
            let body_node = name_node.value.elements[0].body  
            var father_name = find_father[devr_file_name]
            if(body_node.type == "BlockStatement" ){
                estraverse.traverse(body_node, {
                    enter(enter_node) {
                        if(enter_node.type === "AssignmentExpression" && enter_node.right && (enter_node.right.type === "FunctionExpression" || enter_node.right.type === 'FunctionDeclaration')){
                            if(all_module_member_declr[father_name] && enter_node.right.id && enter_node.right.id.name.startsWith(father_name)){
                                var insert_code = all_module_member_declr[father_name]
                                var new_var_declr_statement = esprima.parseScript(insert_code)
                                enter_node.right.body.body.unshift(new_var_declr_statement);
                            }
                        }
                    }
                })
            }
        }
    }
}


function getComponent_Patch(){
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name 
        if (!devr_file_name){
            continue
        }    
        let body_node = node.properties[i].value.elements[0].body 
        if(body_node.type === "BlockStatement"){
            estraverse.replace(body_node, {
                enter(enter_node) {
                    if (enter_node.type === 'CallExpression' && enter_node.callee && enter_node.callee.type === "MemberExpression") {
                        if(enter_node.callee.property && enter_node.callee.property.type === "Identifier" && enter_node.callee.property.name === "getComponent")
                        {                        
                            if(enter_node.arguments && enter_node.arguments.length === 1){
                                //getComponent('ui_shop')
                                if(enter_node.arguments[0].type === "Literal"){
                                    var arg = enter_node.arguments[0].value

                                    if(util.all_module_name.includes(arg)){
                                        js_code = ""
                                        const keys = Object.keys(util.all_func[arg]);
                                        insert_prop = keys[0]
                                        if(insert_prop){
                                            js_code = "new " + arg + "_module." + insert_prop + "();"
                                            const replaceNode = esprima.parseScript(js_code).body[0].expression
                                            return replaceNode
                                        }
                                    }
                                }
                                //getComponent(s.default)
                                else if(enter_node.arguments[0].type === "MemberExpression"){
                                    obj_ = enter_node.arguments[0].object
                                    prop_ = enter_node.arguments[0].property
                                    if(obj_.type === "Identifier" && prop_.type === "Identifier"){
                                        if(obj_.name in util.module_invoke[devr_file_name]){
                                            js_code = "new " + util.module_invoke[devr_file_name][obj_.name][0] + "_module." + prop_.name + "();"
                                            const replaceNode = esprima.parseScript(js_code).body[0].expression                                     
                                            return replaceNode
                                        }
                                    }
                                }
                                //getComponent(s)
                                else if(enter_node.arguments[0].type === "Identifier"){
                                    id = enter_node.arguments[0].name
                                    if(id in util.module_invoke[devr_file_name]){
                                        if(!util.module_invoke[devr_file_name][id][1]){
                                            util.module_invoke[devr_file_name][id][1] = "default"
                                        }
                                        js_code = "new " + util.module_invoke[devr_file_name][id][0] + "_module." + util.module_invoke[devr_file_name][id][1] + "();"
                                        const replaceNode = esprima.parseScript(js_code).body[0].expression                                
                                        return replaceNode
                                    }
                                }
                            }
                        }
                    }
                },
            })
        }
    }
}

function main(){
    global.result_data = "" 
    parseCode2AST();
    replaceWindowQg();
    moduleExports();
    getComponent_Patch();

    console.log("Start Module Pruning")
    scheme_Module(); 
    cut_code()     
         
}

main()