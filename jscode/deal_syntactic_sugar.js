const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');
const argv = process.argv.splice(2);

const pathToFile = argv[0];
const outfilepath = argv[3];


const fileContent = fs.readFileSync(pathToFile, 'utf-8');
global.resultjs = "var window = {};\nwindow.qg = qg;\n"
let obj_his = [];

function dump_result(jsData, outfilepath) {
    fs.writeFileSync(outfilepath, jsData);
}

function extractWindow(short_assign_left) {
    var js_code = ""
    const regex = /[\[\]]+/;
    const splitArray = short_assign_left.split(regex).filter(Boolean);
    for (const short_ of splitArray) {
        const remove_special = short_.replace(/\s/g, "").replace("&&", "+").replace(/\.getChildByName/g, '+').split(/([+\-*\/()])/).filter(item => !['+', '-', '*', '/'].includes(item));
        for (const short_assign of remove_special) {
            const regex = /^window/;
            const formal_regex = /[^\w]/
            if (regex.test(short_assign) && !short_assign.includes("__extends") && !short_assign.includes("error") && !short_assign.includes("Error")) {
                var arr = short_assign.split(".");
                if (arr.length == 2) {
                    let window_var = arr[1]
                    if (!obj_his.includes(window_var) && window_var != "qg" && !formal_regex.test(window_var)) {
                        obj_his.push(window_var)

                        js_code += 'var ' + window_var + '=' + short_assign + ';\n'
                    }
                } else if (arr.length == 3) {
                    let window_var_parent = arr[1]
                    let window_var_child = arr[2]
                    if (!obj_his.includes(window_var_parent) && window_var_parent != "cc" && window_var_parent != "qg" && !formal_regex.test(window_var_parent)) {
                        obj_his.push(window_var_parent)

                        js_code += 'var ' + window_var_parent + ' = {}\n';

                        js_code += js_code + window_var_parent + '.' + window_var_child + '=' + short_assign + '\n'

                    } else if (!obj_his.includes(window_var_parent + '.' + window_var_child) && !formal_regex.test(window_var_parent) && !formal_regex.test(window_var_child)) {
                        js_code += window_var_parent + '.' + window_var_child + '=' + short_assign + '\n'
                    }
                    obj_his.push(arr[1] + '.' + arr[2])
                } else if (arr.length > 3) {

                    let window_var = arr.slice(1).join('.')
                    if (!obj_his.includes(window_var) && !formal_regex.test(window_var)) {
                        obj_his.push(window_var)

                        js_code += window_var + '=' + short_assign + ';\n'
                    }
                }
            }
        }
    }
    return js_code
}

function main_task() {

    const ast = esprima.parse(fileContent);
    estraverse.traverse(ast, {
        enter(enter_node) {
            if (enter_node.type === "AssignmentExpression" && enter_node.left) {
                let short_assign = escodegen.generate(enter_node.left)
                if (short_assign === "window.__require") {
                    let node = enter_node.right.arguments[0]
                    for (let i = 0; i < node.properties.length; i++) {
                        var name_node = node.properties[i]
                        var devr_file_name = name_node.key.name
                        if (!devr_file_name) {
                            continue
                        }
                        let body_node = node.properties[i].value.elements[0].body
                        if (body_node.type == "BlockStatement") {
                            estraverse.traverse(body_node, {
                                enter(enter_node) {
                                    if (enter_node.type === "AssignmentExpression") {
                                        let short_assign_left = escodegen.generate(enter_node.left)
                                        global.resultjs += extractWindow(short_assign_left)
                                    }
                                    if (enter_node.type === "VariableDeclarator" && enter_node.init && enter_node.init.type === "MemberExpression") {
                                        let mem_ = escodegen.generate(enter_node.init)
                                        if (mem_.startsWith("window.")) {
                                            global.resultjs += extractWindow(mem_)
                                        }
                                    }
                                }
                            })
                        }
                    }
                }
            }
        }
    })
}

main_task()
dump_result(global.resultjs, outfilepath)