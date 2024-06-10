const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse');
const fs = require('fs');

const global_dic = {}
const argv = process.argv.splice(2);
const pathToFile = argv[0];
const case_name = argv[2]
const outfilepath = argv[3]
const fileContent = fs.readFileSync(pathToFile, 'utf-8');

function dump_json_(ast1, filename_, outfilepath) {
    jsonData = JSON.stringify(ast1, null, 2);
    var fiel_path = outfilepath
    fs.writeFileSync(fiel_path, jsonData);
}


function makeup_push(body) {
    estraverse.traverse(body, {
        enter(enter_node) {
            if (enter_node.type === "CallExpression" && enter_node.callee.type === "MemberExpression") {
                if (enter_node.callee.object && enter_node.callee.object.object && enter_node.callee.object.object.type === "Identifier") {
                    if (enter_node.callee.object.object.name === "cc" && enter_node.callee.object.property && enter_node.callee.object.property.type === "Identifier" && enter_node.callee.object.property.name === "_RF") {
                        if (enter_node.arguments[1] && enter_node.arguments[2]) {
                            const uuhash = enter_node.arguments[1].value
                            let filekey = ""
                            if (enter_node.arguments[2].type === "Literal") {

                                item_string = enter_node.arguments[2].value.toString();

                                if (/^\d+$/.test(item_string)) {
                                    item_string = 'digital_' + item_string
                                }
                                filekey = item_string.replace(/\W/g, '_');
                            }
                            global_dic[uuhash] = filekey
                        }
                    }
                }
            }
        }
    })
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
                            makeup_push(body_node)
                        }
                    }
                }
            }
        }
    })
}

main_task()
dump_json_(global_dic, "tmp", outfilepath)