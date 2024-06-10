
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const util = require('./util');


const fs = require('fs');
const { ifError } = require('assert');
const argv = process.argv.splice(2);

const buttontext_path = argv[0]
const sourcecode_path = argv[1]
const outfilepath = argv[2]
const fix_path = argv[3]

var node2 = {}

var Singleton_module = {}
var singleton_func = ["getInstance", "getInterface", "getIns"]
function dump_result(jsData, outfilepath){
    fs.writeFileSync(outfilepath, jsData); 
}


function main_task(){
    const pathToFile_sourece = sourcecode_path
    const fileContent_sourece = fs.readFileSync(pathToFile_sourece, 'utf-8');    
    const ast_source = esprima.parse(fileContent_sourece);        

    estraverse.traverse(ast_source, {
        enter(enter_node) {
            
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    node2 = enter_node.right.arguments[0]                                         
                }

            }
        }
    })

    const fix_fileContent_sourece = fs.readFileSync(fix_path, 'utf-8');    
    const fix_ast_source = esprima.parse(fix_fileContent_sourece);        

    util.findClass(fix_ast_source);

    global.resultjs = ""
    prefab_list = []

    const pathToFile = buttontext_path
    const fileContent = fs.readFileSync(pathToFile, 'utf-8'); 
    const jsonData = JSON.parse(fileContent);   
    
    for (const key in jsonData) {
        let js_code = ""
        if (jsonData.hasOwnProperty(key)) {
            const uuid = key
            const func_id = "prefab_" + key + "()";
            tmp_prefab_dic = {}
            prefab_list.push(func_id)
            if(Array.isArray(jsonData[uuid])){
                for(let item of jsonData[uuid]){
                    component_name = item["componentId"]
                    handler = item["handler"]
                    if(!tmp_prefab_dic[component_name]){
                        tmp_prefab_dic[component_name] = []
                    }
                    tmp_prefab_dic[component_name].push(handler)
                }
            }
            js_code += "function " + func_id + "{\n"
            for (const module_ in tmp_prefab_dic) {
                if (tmp_prefab_dic.hasOwnProperty(module_)) {
                    if(util.findKeyByValue(util.all_windowname, module_)){
                        window_name = util.findKeyByValue(util.all_windowname, module_)
                        js_code += " var " +  window_name + "_ = " + window_name + "\n"
                    }
                    else{
                        const keys = Object.keys(util.all_func[module_]);
                        insert_prop = keys[0]
                        if(insert_prop){
                            if(Singleton_module.hasOwnProperty(module_)){
                                js_code += "\tvar " +  module_ + "_ = " +  module_ + "_module." +  insert_prop + "." + Singleton_module[module_] + "\n"
                            }
                            else{
                                js_code += "\tvar " +  module_ +"_ = new " +  module_ + "_module." + insert_prop + "(); \n"
                            }
                        }
                        else{
                            if(Singleton_module.hasOwnProperty(module_)){
                                js_code += "\tvar " +  module_ + "_ = " +   module_ + "_module." + Singleton_module[module_] + "\n"
                            }
                            else{
                                js_code += "\tvar " +  module_ +"_ = new " +   module_ + "_module" + "\n"
                            }
                        }
                    }
                }
                for(func_ of tmp_prefab_dic[module_]){
                    js_code += "\t" + module_ + "_." + func_ + "();\n" 
                }
            }
            js_code += "}\n"
        }
        global.resultjs += js_code
    }

    global.resultjs += "function liveCallWala(){ \n\t"   

    for (let i = 0; i < node2.properties.length; i++) {
        var name_node = node2.properties[i]
        var devr_file_name = name_node.key.name  
        if (!devr_file_name){
            continue
        }
        let body_node = node2.properties[i].value.elements[0].body 
        if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === "AssignmentExpression" && enter_node.right && enter_node.right.type === "FunctionExpression" && enter_node.left && enter_node.left.type === "MemberExpression"){
                        if(enter_node.left.property.type === "Identifier"){
                            for(let singleton_ of singleton_func){ 
                                
                                if(enter_node.left.property.name === singleton_){
                                    Singleton_module[devr_file_name] = singleton_ + "()"
                                    return estraverse.VisitorOption.Break;
                                }
                            }
                        }
                    }
                }
            })
        }
    }

    lifecycle_code = ""
    node_his = new Set([])
    for (let i = 0; i < node2.properties.length; i++) {
        var name_node = node2.properties[i]
        var devr_file_name = name_node.key.name
        if (!devr_file_name || node_his.has(devr_file_name)){
            continue
        }
        node_his.add(devr_file_name)
        let js_code = ""  
        let new_var = null 
        if(util.findKeyByValue(util.all_windowname, devr_file_name)){
            window_name = util.findKeyByValue(util.all_windowname, devr_file_name)
            if(!window_name.startsWith("cc.")){
                new_var = window_name
            }
        }
        else{
            const keys = Object.keys(util.all_func[devr_file_name]);
            insert_prop = keys[keys.length - 1] 
            new_var = devr_file_name + "_"
            if(insert_prop){
                if(Singleton_module.hasOwnProperty(devr_file_name)){
                    js_code = " var " +  devr_file_name + "_ = " +   devr_file_name + "_module." +  insert_prop + "." + Singleton_module[devr_file_name] + "\n\t"
                }
                else{
                    js_code = " var " +  devr_file_name+"_ = new " +   devr_file_name + "_module." + insert_prop + "(); \n\t"
                }
            }
            else{
                if(Singleton_module.hasOwnProperty(devr_file_name)){
                    js_code = " var " +  devr_file_name + "_ = " +   devr_file_name + "_module." + Singleton_module[devr_file_name] + "\n\t"
                }
                else{
                    js_code = " var " +  devr_file_name+"_ = new " +   devr_file_name + "_module" + "\n\t"
                }
            }
        }
        if(new_var){ 
            all_func_def = []
            for(let key of Object.keys(util.all_func[devr_file_name])){
                if(util.all_func[devr_file_name][key]){
                    all_func_def.push(...util.all_func[devr_file_name][key]['property']);
                    all_func_def.push(...util.all_func[devr_file_name][key]['proto']);
                    all_func_def.push(...util.all_func[devr_file_name][key]['static']);
                }
            }
            for(let func_name of all_func_def){
                if(util.init_func.some(key => func_name === key)){
                    js_code += new_var +"." + func_name + "(); \n\t";
                }
            
            }
            global.resultjs += js_code  
            for(let func_name of all_func_def){
                if(util.life_cycle_func.some(key => func_name === key)){
                    lifecycle_code += new_var +"." + func_name + "(); \n\t";
                }
            }  
        }  
    }        
    
    global.resultjs += lifecycle_code
    global.resultjs += "}\n"    
    global.resultjs += "function fakestart(){ \n\t"
    global.resultjs += "liveCallWala();\n"

    for (let prefab_ of prefab_list){
        global.resultjs += "\t" + prefab_ +";\n"
    }

    global.resultjs += "}\n"
    global.resultjs += "fakestart() \n\t"    
    dump_result(global.resultjs,outfilepath)
}
main_task()

