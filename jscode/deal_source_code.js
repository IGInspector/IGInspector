
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

const fs = require('fs');
global.resultjs = ""
global.sinkNum = 0

function dump_result(jsData,out_file){
    fs.writeFileSync(out_file, jsData);
}

function hasMem_eq(str, my_list) {
    str = str.toLowerCase()
    for(let i = 0; i < my_list.length; i++) {
        let member = my_list[i].toLowerCase();
        if (str === member) {
            return true;
        }
    }
    return false;
}


function insertOnEvent(node){
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        let body_node = node.properties[i].value.elements[0].body 
        estraverse.traverse(body_node, {
            enter(enter_node) {
                if(enter_node.type ==="CallExpression" && enter_node.callee){
                    jscode = escodegen.generate(enter_node.callee)
                    str = escodegen.generate(enter_node)
                    substring = str.split(".on").slice(1).join(".on");                    
                    insert_code = "abutton.on"+substring                
                    if (jscode.endsWith(".on")){
                        var parents = this.parents().reverse(); 
                        for (let i = 0; i < parents.length; i++) {              
                            if (parents[i].type === 'SequenceExpression') { 
                                if(i>0){
                                    let site = parents[i].expressions.indexOf(parents[i-1])   
                                    newAst = {}
                                    try {
                                        newAst = esprima.parseScript(insert_code).body[0].expression;    
                                    }catch(error){
                                        console.log('527: ',error.message)           
                                    }                           
                                    parents[i].expressions.splice(site, 0, newAst);                                  
                                }else{
                                    let site = parents[i].expressions.indexOf(enter_node)
                                    newAst = {}
                                    try {
                                        newAst = esprima.parseScript(insert_code).body[0].expression;    
                                    }catch(error){
                                        console.log('527: ',error.message)
                                    }                           
                                    parents[i].expressions.splice(site, 0, newAst);                                   
                                } 
                                break;
                            }else if (parents[i].type === 'BlockStatement'){
                                if(i>0){
                                    let site = parents[i].body.indexOf(parents[i-1])
                                    newAst = {}
                                    try {
                                        newAst = esprima.parseScript(insert_code).body[0];    
                                    }catch(error){
                                        console.log('527: ',error.message)
            
                                    }                           
                                    parents[i].body.splice(site, 0, newAst);                                   
                                        
                                }
                                break
                            }
                        }                    
                    }
                }
            }
        })
    }
}


function hasMemIn(str, my_list) {
    str = str.toLowerCase()
    for(let i = 0; i < my_list.length; i++) {
        let member = my_list[i].toLowerCase();
        if (str.includes(member)) {
            return true;
        }
    }
    return false;
}

function reNameing(node){
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        
        let devr_file_name = name_node.key.name
        
        if (!devr_file_name){
            continue
        }    
        
        let body_node = node.properties[i].value.elements[0].body 
        if(body_node.type == "BlockStatement" ){
            estraverse.traverse(body_node, {
                enter(enter_node) {    
                    if(enter_node.type === "AssignmentExpression" && enter_node.operator && enter_node.operator ==="=" ){
                        if(enter_node.left ){
                            let def_api = escodegen.generate(enter_node.left)
                            ad_list = ["yuansheng","chaping","hengfu","video","intert","banner","shipin","InterstitialAd"] 
                            list_key1 = ["show","create","refresh"]
                            list_key2 = ["yuansheng","inters","chaping","hengfu","video","intert","banner","shipin","Interstitial","native","screen","custom"] 
                            list_key3 = ["yuansheng"]  
                            black_key = ["image","icon"]                          
                            js_reserve = ["default","do","delete"]
                            var ad_pattern = /show.*ad$/;
                            var ad_pattern2 = /create.*ad$/;                            
                                                         
                            if (hasMemIn(def_api,list_key1) && hasMemIn(def_api,list_key2) && (!black_key.some(keyword => def_api.toLowerCase().includes(keyword)))){
                                if (!enter_node.right.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ];
                                    let sink_name =  lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    enter_node.right.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else if(hasMem_eq(def_api,list_key2)) {
                                if (!enter_node.right.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ];
                                    let sink_name =  lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    enter_node.right.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else if(ad_pattern.test(def_api)) {
                                if (!enter_node.right.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ]; 
                                    let sink_name =  lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    enter_node.right.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else if(ad_pattern2.test(def_api)) {
                                if (!enter_node.right.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ];
                                    let sink_name = lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    enter_node.right.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else{
                                if(!js_reserve.some(keyword => def_api === keyword)){    
                                    if (!enter_node.right.id){
                                        var parts = def_api.split(".");
                                        var lastpart = parts[parts.length -1 ];
                                        let sink_name = lastpart
                                        sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                         
                                        enter_node.right.id = {
                                            type: "Identifier",
                                            name: sink_name
                                        }                                       
                                    }
                                }
                            }
                        }
                    }else if (enter_node.type ==="Property" && enter_node.key && enter_node.value && enter_node.value.type ==="FunctionExpression"){
                        var this_function_expression = enter_node.value         
                        if(enter_node.key ){
                            let def_api = escodegen.generate(enter_node.key)
                            ad_list = ["yuansheng","chaping","hengfu","video","intert","banner","shipin","InterstitialAd"] 
                            list_key1 = ["show","create","refresh"]
                            list_key2 = ["yuansheng","chaping","hengfu","video","intert","banner","shipin","Interstitial","native","screen"] 
                            list_key3 = ["yuansheng"]  
                            black_key = ["image","icon"]                          
                            js_reserve = ["default","do","delete"]                             
                            if (hasMemIn(def_api,list_key1) && hasMemIn(def_api,list_key2) && (!black_key.some(keyword => def_api.toLowerCase().includes(keyword)))){
                                if (!this_function_expression.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ];
                                    let sink_name =  lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    this_function_expression.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else if(hasMem_eq(def_api,list_key2)) {
                                if (!this_function_expression.id){
                                    var parts = def_api.split(".");
                                    var lastpart = parts[parts.length -1 ];   
                                    let sink_name = lastpart
                                    sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');                                    
                                    this_function_expression.id = {
                                        type: "Identifier",
                                        name: sink_name
                                    }                                    
                                }
                            }else{
                                if(!js_reserve.some(keyword => def_api.includes(keyword))){
                                    if (!this_function_expression.id){
                                        var parts = def_api.split(".");
                                        var lastpart = parts[parts.length -1 ];
                                        let sink_name = lastpart
                                        sink_name = devr_file_name+'_'+sink_name.replace(/\W/g, '_');  
                                        this_function_expression.id = {
                                            type: "Identifier",
                                            name: sink_name
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


function fixDigtalSymbol(node){
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        var devr_file_name = ""  
        if (name_node.key.type === "Identifier"){
            devr_file_name = name_node.key.name
        }else if(name_node.key.type === "Literal"){
            name_string = name_node.key.value.toString();
            if(/^\d+$/.test(name_string)){
                name_string = 'digital_'+name_string
            }
            devr_file_name =name_string.replace(/\W/g, '_');     
            var regex = /^\d/;
            if(regex.test(devr_file_name)){
                devr_file_name ="deal_"+devr_file_name
            }                                     
        }      
        if (devr_file_name !== ""){
            name_node.key ={
                type: "Identifier",
                name: devr_file_name
            }          
        }           
    }
}

function ccClass(node){
    for (let i = 0; i < node.properties.length; i++) { 
        var name_node = node.properties[i]
        let devr_file_name = name_node.key.name
        if (!devr_file_name){
            continue
        }    
        var oo_ = "" 
        if (!node.properties[i].value.elements[0].params[2] ){
            while(node.properties[i].value.elements[0].params.length < 3 ){
                my_param = "myparam_"+node.properties[i].value.elements[0].params.length
                node.properties[i].value.elements[0].params.push({
                    type: "Identifier",
                    name: my_param
                })
            }
        }

        self_ = node.properties[i].value.elements[0].params[1].name 
        oo_ = node.properties[i].value.elements[0].params[2].name                
        let body_node = node.properties[i].value.elements[0].body 
        if(body_node.type == "BlockStatement" ){
            var exports_flag = false
            estraverse.traverse(body_node, {
                enter(enter_node) { 
                    if(enter_node.type === "AssignmentExpression" && enter_node.left.type === "MemberExpression"){
                        obj_ = enter_node.left.object
                        prop_ = enter_node.left.property
                        if(prop_ && prop_.type === "Identifier" && prop_.name === "exports"){
                            exports_flag = true
                            estraverse.VisitorOption.Break;
                        }
                    }
                }
            })

            estraverse.traverse(body_node, {
                enter(enter_node) {
                    if(enter_node.type === 'CallExpression' && enter_node.callee){
                        let callee = escodegen.generate(enter_node.callee)
                        if (callee === "cc.Class" && enter_node.arguments){
                            if(enter_node.arguments[0].type === 'ObjectExpression'){
                                let ObjectExpression =enter_node.arguments[0] 
                                let insert_code = "var fake_class = function() { \n\t function t(){ var e = this ; return e } \n\t return ";
                                for(let i = 0 ; i < ObjectExpression.properties.length;i++){
                                    let js_code = ""
                                    let property = ObjectExpression.properties[i]
                                    if (property.value && property.value.type ==='FunctionExpression' && property.key.type =='Identifier'){
                                        let function_name = property.key.name
                                        let function_name_tag = devr_file_name+'_'+property.key.name                                        
                                        let function_body = property.value
                                        function_body.id = {
                                            type: "Identifier",
                                            name: function_name_tag
                                        }     
                                        let function_body_code = escodegen.generate(function_body)
                                        js_code = "t.prototype." + function_name + ' = ' +function_body_code+",";
                                    }
                                    insert_code = insert_code + js_code
                                }
                                insert_code = insert_code +"t}()\n\t"
                                let newAst = {}
                                try {
                                    newAst = esprima.parseScript(insert_code).body[0];    
                                }catch(error){
                                    console.log('204: ',error.message)

                                }
                                body_node.body.push(newAst) 
                                
                                if(exports_flag){
                                    insert_code = oo_ + ' = ' + 'fake_class;'
                                }else{
                                    insert_code = oo_+'.default = ' + 'fake_class;'
                                }
                                try {
                                    newAst = esprima.parseScript(insert_code).body[0];    
                                }catch(error){
                                    console.log('215: ',error.message)
                                }                                
                                body_node.body.push(newAst)                                 
                  
                            }
                        }
                    }
                }
            })
        } 
    }        
}


function main_task(pathToFile,out_dir,case_name,out_file){
    const fileContent = fs.readFileSync(pathToFile, 'utf-8');    
    var ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) { 
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    let all_node_ = enter_node.right.arguments[0]    
                    fixDigtalSymbol(all_node_)                               
                }

            }
        }
    })        
    
    
    estraverse.traverse(ast, {
        enter(enter_node) {    
            let inner_flag = false;
            let return_flag = false;
            let inner_fun_set = new Set([])
            let result_inner = ""
            
            if(enter_node.type === "FunctionExpression"  && enter_node.body){
                estraverse.traverse(enter_node.body, {
                    enter(enter_node1) {
                        
                        if(enter_node1.type === "FunctionDeclaration"  && enter_node1.body){
                            if (enter_node1.id && enter_node1.id.type === "Identifier" ){
                                console.log("**************** enter_node:" + enter_node1.id.name)
                                let inner =  enter_node1.id.name
                                inner_fun_set.add(inner)
                                inner_flag = true 
                            }
                        }
                        var parents = this.parents().reverse(); 
                        if (parents[0] && parents[0].type ==='BlockStatement'){
                            for (let i = 0; i < parents[0].body.length; i++) {     
                                if (parents[0].body[i].type ==='ReturnStatement'){
                                    var returnstatement_node = parents[0].body[i];    
                                    
                                    if(returnstatement_node.type === "ReturnStatement"  && returnstatement_node.argument && returnstatement_node.argument.type === "SequenceExpression"){
                                        console.log("**************** return_stat:\n" + JSON.stringify(escodegen.generate(returnstatement_node)))
                                        estraverse.traverse(returnstatement_node.argument, {
                                            enter(enter_node2) {
                                                
                                                if(enter_node2.type === "MemberExpression" && enter_node2.object && enter_node2.property){
                                                    if (enter_node2.object.type === "Identifier" && enter_node2.property.type ==="Identifier" && enter_node2.property.name === "prototype"){
                                                        let instance =  enter_node2.object.name 
                                                        console.log("**************** instance1:  " + instance)
                                                        if(inner_fun_set.has(instance)){
                                                            result_inner = instance
                                                            return_flag = true
                                                        }
                                                    }
                                                
                                                }else if(enter_node2.type ==='AssignmentExpression' && enter_node2.operator && enter_node2.operator==='='){
                                                    if(enter_node2.left.type ==='MemberExpression' && enter_node2.left.object.type === "Identifier" && enter_node2.left.property.type ==="Identifier"){
                                                        let instance =  enter_node2.left.object.name 
                                                        console.log("**************** instance2:  " + instance)
                                                        if(inner_fun_set.has(instance)){
                                                            result_inner = instance
                                                            return_flag = true
                                                        }
                                                    }


                                                }
                                            }
                                        })
                                        if (return_flag && inner_flag) {
                                            console.log("**************** result_inner:" + result_inner)
                                            
                                            const returnStatement = 
                                            {
                                                    type: "Identifier",
                                                    name: result_inner
                                            }
                                            var body_length = returnstatement_node.argument.expressions.length
                                            returnstatement_node.argument.expressions.splice(body_length, 0, returnStatement);
                                            return estraverse.VisitorOption.Break;
                                        } 
                                    }                                        
                                } 
                            }
                        }
                    }        
                })
            }
        }        
    })
    
    
    estraverse.traverse(ast, {
        enter(enter_node) {    
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    let all_node_ = enter_node.right.arguments[0]    
                    reNameing(all_node_)                                     
                }

            }
        }
    })
    
    estraverse.traverse(ast, {
        enter(enter_node) {   
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    let all_node_ = enter_node.right.arguments[0]    
                    ccClass(all_node_)                               
                }

            }
        }
    })    
    
    estraverse.traverse(ast, {
        enter(enter_node) {  
            if(enter_node.type === "AssignmentExpression"  && enter_node.left){
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require"){
                    let all_node_ = enter_node.right.arguments[0]    
                    insertOnEvent(all_node_)                               
                }

            }
        }
    })      
    var js = escodegen.generate(ast)    
    dump_result(js,out_file)           
}

const argv = process.argv.splice(2);
main_task(argv[0],argv[1],argv[2],argv[3])