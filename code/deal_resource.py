import os
import json
import re
import sys
import queue

node_path = "node"
uuid_js_path = "jscode/uuid.js"
from collections import defaultdict
from treelib import Tree, Node

def ifInstanceArray(testlist):
    if not isinstance(testlist, list):
        return False
    count = 0
    for each in testlist:
        if not isinstance(each, list):
            return False
        if len(each) > 1:
            if isinstance(each[0], int) & isinstance(each[1], str):
                count += 1
    if count > 0:
        return True
    else:
        return False

def decodeUuid(hash_code):
    cmd = node_path + " " + uuid_js_path + " " + hash_code
    command = os.popen(cmd)
    result = command.buffer.read().decode("utf-8")
    command.close()
    try:
        result = result.split("\n")[0].split("decompressUuid ")[1]
        return result
    except Exception as ex:
        print(ex)
        result = ""
        return result

def getProOneClass(
    class_list,
    type_list,
    class_num,
    target_list,
    component,
    component_construct_pro,
    first_flag=True,
):
    type = class_list[class_num][0]
    result = defaultdict(str)
    result["type"] = type
    if (type == "cc.Button") or first_flag == False:
        i = -1
        for keyvalue in component:
            i += 1
            if i == 0:
                continue
            c_key = class_list[class_num][1][component_construct_pro[i]]
            c_value = keyvalue
            result[c_key] = c_value
    return result


def getProInClass(
    class_list,
    type_list,
    class_num,
    target_list,
    component,
    component_construct_pro,
    first_flag=True,
):
    type = class_list[class_num][0]
    result = defaultdict(str)
    result["type"] = type
    if True:
        i = -1
        for keyvalue in component:
            i += 1
            if i == 0:
                continue
            c_key = class_list[class_num][1][component_construct_pro[i]]
            c_value = keyvalue
            if isinstance(keyvalue, list) and c_key == "clickEvents":
                type_num = c_value[0][0]
                component_construct = type_list[type_num]
                class_num_c = component_construct[0]
                result[c_key] = getProOneClass(
                    class_list,
                    type_list,
                    class_num_c,
                    target_list,
                    c_value[0],
                    component_construct,
                    first_flag=False,
                )
            else:
                result[c_key] = c_value
    return result

def extractInfo(tmp_json):
    tmp_info = list()
    for key in tmp_json.keys():
        if key == "_name":
            tmp_info.append(tmp_json["_name"])
        if re.findall(r"component_\d", key) and extractComponentInfo(
            tmp_json[key]
        ):
            tmp_info += extractComponentInfo(tmp_json[key])
    return tmp_info

def extractInfoLow(tmp_json):
    tmp_info = list()
    if "_name" in tmp_json:
        tmp_info.append(tmp_json["_name"])
    if "_components" in tmp_json:
        tmp_info += extractComponentInfoLow(tmp_json["_components"])
    return tmp_info

def extractComponentInfoLow(component_jsons):
    component_info = list()
    component_info1 = list()
    for component_json in component_jsons:
        if component_json == None:
            continue
        if "_name" in component_json:
            component_info.append(component_json["_name"])
        if "__type__" in component_json:
            if component_json["__type__"] == "cc.Button":
                if "clickEvents" in component_json:
                    clickEvents = component_json["clickEvents"]
                    for clickevent in clickEvents:
                        if clickevent == None:
                            continue
                        if "customEventData" in clickevent:
                            component_info.append(
                                clickevent["customEventData"]
                            )
            elif component_json["__type__"] == "cc.Label":
                if "_string" in component_json:
                    component_info.append(component_json["_string"])
        for cinfo in component_info:
            if cinfo != "":
                component_info1.append(cinfo)
    return component_info1

def extractComponentInfo(component_json):
    component_info = list()
    component_info.append(component_json["_name"])
    if component_json["type"] == "cc.Button":
        if "clickEvents" in component_json:
            clickEvents = component_json["clickEvents"]
            if "customEventData" in clickEvents:
                component_info.append(clickEvents["customEventData"])

    elif component_json["type"] == "cc.Label":
        if "_string" in component_json:
            component_info.append(component_json["_string"])
    component_info1 = list()
    for cinfo in component_info:
        if cinfo != "":
            component_info1.append(cinfo)
        print(component_info1)
    return component_info1

def getResourceTmpJsonScene(resource_json):
    string_list = list()
    callback_list = list()
    result = {}
    parent_child_tree_list = list()
    node_id = 0
    try:
            if isinstance(resource_json, list):
                class_list = resource_json[3]
                type_list = resource_json[4]
                instance_list_total = []
                total_length = 0 
                count = 0  
                if ifInstanceArray(resource_json[5]):
                    instance_list_total.append(resource_json[5])
                    total_length += len(resource_json[5])
                    count += 1
                else:
                    for each in resource_json[5]:
                        if ifInstanceArray(each):
                            instance_list_total.append(each)
                            total_length += len(each)
                            count += 1
                        elif isinstance(each, list):
                            for eeach in each:
                                if ifInstanceArray(eeach):
                                    instance_list_total.append(eeach)
                                    total_length += len(eeach)
                                    count += 1
                                    pointer_list = each[-1]

                for instance_list in instance_list_total:
                    id = -1
                    for instance_item in instance_list:
                        id += 1
                        if isinstance(instance_item, list):
                            instance_type = instance_item[0]
                            type_item = type_list[instance_type]
                            type_type = type_item[0]
                            type_item = type_item[1:-1]
                            i = 0
                            type = class_list[type_type][0]
                            node_dic = {"type": type}
                            node_id += 1
                            for keyvalue in type_item:
                                try:
                                    i += 1
                                    if True:
                                        key_ = class_list[type_type][1][
                                            keyvalue
                                        ]
                                        if key_ == "_name":
                                            node_dic["_name"] = instance_item[
                                                i
                                            ]
                                        elif key_ == "_components":
                                            components_value = instance_item[i]
                                            component_id = 0
                                            for component in components_value:
                                                component_id += 1
                                                component_construct_num = (
                                                    component[0]
                                                )
                                                component_construct = (
                                                    type_list[
                                                        component_construct_num
                                                    ]
                                                )
                                                class_num = (
                                                    component_construct[0]
                                                )
                                                target_list = [
                                                    "cc.Label",
                                                    "cc.Button",
                                                ]
                                                result_pro = getProInClass(
                                                    class_list,
                                                    type_list,
                                                    class_num,
                                                    target_list,
                                                    component,
                                                    component_construct,
                                                )
                                                component_string = (
                                                    "component_"
                                                    + str(component_id)
                                                )
                                                node_dic[
                                                    component_string
                                                ] = result_pro
                                        elif key_ == "_parent":
                                            node_dic[
                                                "_parent"
                                            ] = instance_item[i]
                                        elif key_ == "_children":
                                            node_dic[
                                                "_children"
                                            ] = instance_item[i]
                                        elif key_ == "node":
                                            node_dic["node"] = instance_item[i]
                                        elif key_ == "_string":
                                            node_dic[
                                                "_string"
                                            ] = instance_item[i]
                                        elif key_ == "scene":
                                            node_dic["scene"] = instance_item[
                                                i
                                            ]
                                        elif key_ == "clickEvents":
                                            c_value=instance_item[i]
                                            type_num = c_value[0][0]
                                            component_construct = type_list[type_num]
                                            class_num_c = component_construct[0]
                                            result_clickevents = getProOneClass(
                                                class_list,
                                                type_list,
                                                class_num_c,
                                                target_list,
                                                c_value[0],
                                                component_construct,
                                                first_flag=False,
                                            )
                                            print(result)
                                            node_dic["clickEvents"] = result_clickevents
                                            print(1)
                                        else:
                                            node_dic[key_] = instance_item[i]
                                        node_string = "node_" + str(
                                            node_id - 1
                                        )
                                        result[node_string] = node_dic
                                except Exception as ex:
                                    print(ex)
                                    print("deal node error " + type)
                    parent_child_tree = Tree()
                    parent_child_tree.create_node(
                        tag="node_1", identifier="node_1"
                    )
                    parent_child_tree_list.append(parent_child_tree)
                    clkBtnList = list()
                    for node_id, rst in result.items():
                        ifExist = False
                        for key in rst.keys():
                            if key == "_parent":
                                parent_id = "node_" + str(rst["_parent"])
                                for cur_tree in parent_child_tree_list:
                                    if cur_tree.contains(parent_id):
                                        cur_tree.create_node(
                                            tag=node_id,
                                            identifier=node_id,
                                            parent=parent_id,
                                        )
                                        ifExist = True
                                if not ifExist:
                                    parent_child_tree_new = Tree()
                                    parent_child_tree_new.create_node(
                                        tag=parent_id, identifier=parent_id
                                    )
                                    parent_child_tree_new.create_node(
                                        tag=node_id,
                                        identifier=node_id,
                                        parent=parent_id,
                                    )
                                    parent_child_tree_list.append(
                                        parent_child_tree_new
                                    )
                            if re.findall(r"component_\d", key):
                                if (rst[key]["type"] == "cc.Button")|("clickEvents" in rst[key]):
                                    clkBtnList.append(node_id)
                            if key=="type":
                                if rst[key]=="cc.Button":
                                    clkBtnList.append(node_id) 
                        if "_parent" not in rst:
                            for cur_tree in parent_child_tree_list:
                                if cur_tree.contains(node_id):
                                    ifExist=True
                            if not ifExist:
                                parent_child_tree_new = Tree()
                                parent_child_tree_new.create_node(
                                    tag=node_id,
                                    identifier=node_id
                                )
                                parent_child_tree_list.append(
                                            parent_child_tree_new
                                )
                    result["parent_child_tree"] = list()
                    for pctree in parent_child_tree_list:
                        result["parent_child_tree"].append(pctree.to_dict())
                    if not len(clkBtnList):
                        break
                    result["pscstr"] = dict()
                    print(clkBtnList)
                    for clkBtnNode in clkBtnList:
                        strDict = dict()
                        strDict["siblings"], strDict["children"] = (
                            list(),
                            list(),
                        )
                        for parent_child_tree in parent_child_tree_list:
                            if parent_child_tree.contains(clkBtnNode):
                                strDict["self"] = extractInfo(
                                    result[clkBtnNode]
                                )
                                if not parent_child_tree.get_node(
                                    clkBtnNode
                                ).is_root():
                                    strDict["parent"] = extractInfo(
                                        result[
                                            parent_child_tree.parent(
                                                clkBtnNode
                                            ).tag
                                        ]
                                    )
                                for snode in parent_child_tree.siblings(
                                    clkBtnNode
                                ):
                                    strDict["siblings"] += extractInfo(
                                        result[snode.tag]
                                    )
                                for cnode in parent_child_tree.children(
                                    clkBtnNode
                                ):
                                    strDict["children"] += extractInfo(
                                        result[cnode.tag]
                                    )
                                result["pscstr"][clkBtnNode] = strDict
    except Exception as ex:
        print(ex)
        # print("error file " + resource_path)
    return result, parent_child_tree_list

def extractButtonText(resource_result: dict, tmp_json: dict):
    if "pscstr" in resource_result.keys():
        pscstr = resource_result["pscstr"]
    else:
        return []
    buttons = {}
    resource_result.pop("pscstr")
    resource_result.pop("parent_child_tree")
    for key in pscstr.keys():
        node = resource_result[key]
        for i in node.keys():
            if i.startswith("component"):
                if "clickEvents" in node[i]:
                    componentId = node[i]["clickEvents"].get("_componentId")
                    if componentId in tmp_json.keys():
                        if(node[i]["clickEvents"]["handler"]==""):
                            continue
            
                        button_function = (
                            tmp_json[componentId]
                            + "*"
                            + node[i]["clickEvents"]["handler"]
                        )
                        buttons[key] = button_function
            if(i=="clickEvents"):
                componentId = node["clickEvents"].get("_componentId")
                if componentId in tmp_json.keys():
        
                    button_function = (
                        tmp_json[componentId]
                        + "*"
                        + node["clickEvents"]["handler"]
                    )
                    buttons[key] = button_function
    button_texts = []
    for key in buttons.keys():
        node_str = pscstr[key]
        text = set()
        for strs in node_str.values():
            for s in strs:
                if isinstance(s, list):
                    continue
                text.add(s)
        button_describe = {}
        button_describe["function"] = buttons[key].replace("*", "_")
        button_describe["componentId"] = buttons[key].split("*")[0]
        button_describe["handler"] = buttons[key].split("*")[1]
        button_describe["text"] = node_str
        iterator = iter(button_texts)
        try:
            while True:
                button_text = next(iterator)
                if button_describe["function"] == button_text["function"]:
                    for key in button_describe["text"].keys():
                        if(key not in button_text["text"].keys()):
                            button_text["text"][key] = button_describe["text"][key]
                        else:
                            button_text["text"][key].extend(button_describe["text"][key])
                    # button_text["text"].extend(button_describe["text"])
                    # button_text["text"] = list(set(button_text["text"]))
                    break
        except StopIteration:
            button_texts.append(button_describe)
    return button_texts

def extractSceneComponents(
    resource_result: dict, parent_child_tree_list: list, tmpjson: dict
):
    scene_components = []
    sceneQueue = queue.Queue()
    name = ""
    if "node_0" in resource_result.keys():
        node_0 = resource_result["node_0"]
        if "type" in node_0:
            # if (node_0["type"] == "cc.SceneAsset") | (
            #     node_0["type"] == "cc.Prefab"
            # ):
            if node_0["type"] == "cc.SceneAsset":
                name = node_0["_name"]
                for parent_child_tree in parent_child_tree_list:
                    for node in parent_child_tree.all_nodes():
                        if node.is_root():
                            node_scene = resource_result[node.tag]
                            for key in node_scene.keys():
                                if key.startswith("component"):
                                    if "type" in node_scene[key]:
                                        component = node_scene[key]["type"]
                                        if len(str(component)) == 23:
                                            if component in tmpjson.keys():
                                                scene_components.append(
                                                    tmpjson[component]
                                                )
                        sceneQueue.put(node.tag)
        
        
    while not sceneQueue.empty():
        scene=sceneQueue.get()
        for parent_child_tree in parent_child_tree_list:
            if parent_child_tree.contains(scene):
                for sceneChildren in parent_child_tree.children(scene):
                    
                    node_scene = resource_result[sceneChildren.tag]
                    if "_active" in node_scene:
                        if(node_scene["_active"]==False):
                            continue
                    
                    for key in node_scene.keys():
                        if key.startswith("component"):
                            if "type" in node_scene[key]:
                                component = node_scene[key]["type"]
                                if len(str(component)) == 23:
                                    if component in tmpjson.keys():
                                        scene_components.append(
                                            tmpjson[component]
                                                )
                    sceneQueue.put(sceneChildren.tag)
    return name, scene_components

def extractButtonTextLow(resources: list, tmp_json: str):
    parent_child_tree_list = list()
    parent_child_tree = Tree()
    parent_child_tree.create_node(tag=0, identifier=0)
    parent_child_tree_list.append(parent_child_tree)
    clkBtnList = list()
    buttons = {}
    res_result = []
    for res in resources:
        if isinstance(res, list):
            res_result = res
            break
    if res_result == []:
        res_result = resources
    for node_id, rst in enumerate(res_result):
        ifExist = False
        if "_parent" in rst:
            parent_id = rst["_parent"]["__id__"]
            for cur_tree in parent_child_tree_list:
                if cur_tree.contains(parent_id):
                    cur_tree.create_node(
                        tag=node_id, identifier=node_id, parent=parent_id
                    )
                    ifExist = True
            if not ifExist:
                parent_child_tree_new = Tree()
                parent_child_tree_new.create_node(
                    tag=parent_id, identifier=parent_id
                )
                parent_child_tree_new.create_node(
                    tag=node_id, identifier=node_id, parent=parent_id
                )
                parent_child_tree_list.append(parent_child_tree_new)
        if "_components" in rst:
            components = rst["_components"]

            for component in components:
                if component == None:
                    continue
                if "__type__" not in component:
                    continue
                if component["__type__"] == "cc.Button":
                    if "clickEvents" in component:
                        clkBtnList.append(node_id)
                        clickEvents = component["clickEvents"]
                        for clickEvent in clickEvents:
                            if clickEvent == None:
                                continue
                            
                            componentId = clickEvent.get("_componentId")
                            if "handler" not in clickEvent:
                                continue
                            if componentId in tmp_json.keys():
                                button_function = (
                                    tmp_json[componentId]
                                    + "*"
                                    + clickEvent["handler"]
                                )
                                buttons[node_id] = button_function
    button_texts = []
    for key, value in buttons.items():
        # texts = []
        texts={}
        texts["self"]=[]
        texts["parent"]=[]
        texts["siblings"]=[]
        texts["children"]=[]
        for parent_child_tree in parent_child_tree_list:
            if parent_child_tree.contains(key):
                texts["self"]=extractInfoLow(res_result[key])
                
                # texts = extractInfoLow(res_result[key])
                if not parent_child_tree.get_node(key).is_root():
                    texts["parent"]+=extractInfoLow(res_result[parent_child_tree.parent(key).tag])
                    # texts += extractInfoLow(
                    #     res_result[parent_child_tree.parent(key).tag]
                    # )
                for snode in parent_child_tree.siblings(key):
                    # texts += extractInfoLow(res_result[snode.tag])
                    texts["siblings"]+=extractInfoLow(res_result[snode.tag])
                for cnode in parent_child_tree.children(key):
                    # texts += extractInfoLow(res_result[cnode.tag])
                    texts["children"]+=extractInfoLow(res_result[cnode.tag])
        button_describe = {}
        button_describe["function"] = buttons[key].replace("*", "_")
        button_describe["componentId"] = buttons[key].split("*")[0]
        button_describe["handler"] = buttons[key].split("*")[1]
        button_describe["text"] = texts
        iterator = iter(button_texts)
        try:
            while True:
                button_text = next(iterator)
                if button_describe["function"] == button_text["function"]:
                    for key in button_describe["text"].keys():
                        if(key not in button_text["text"].keys()):
                            button_text["text"][key] = button_describe["text"][key]
                        else:
                            button_text["text"][key].extend(button_describe["text"][key])
                    # button_text["text"].extend(button_describe["text"])
                    # button_text["text"] = list(set(button_text["text"]))
                    break
        except StopIteration:
            button_texts.append(button_describe)
    return button_texts, parent_child_tree_list

def extractSceneComponentsLow(
    resources: dict, parent_child_tree_list: list, tmp_json: dict
):
    res_result = []
    for res in resources:
        if isinstance(res, list):
            res_result = res
            break
    sceneQueue = queue.Queue()
    name = ""
    scene_components = []
    for node_id, rst in enumerate(res_result):
        if ("__type__" in rst) and ((rst["__type__"] == "cc.SceneAsset")):
            sceneQueue.put(rst["scene"]["__id__"])
            if "_name" in rst:
                name = rst["_name"]
            break
    
    while(not sceneQueue.empty()):
        scene=sceneQueue.get()
        for parent_child_tree in parent_child_tree_list:
            if parent_child_tree.contains(scene):
                for sceneChildren in parent_child_tree.children(scene):
                    node_scene = res_result[sceneChildren.tag]
                    if("_active" in node_scene):
                        # if("__type__" in node_scene):
                        if(node_scene["_active"]==False):
                            continue
                        
                    if "_components" in node_scene:
                        for componetNode in node_scene["_components"]:
                            if componetNode == None:
                                continue
                            if "__type__" in componetNode:
                                component = componetNode["__type__"]
                                if len(component) == 23:
                                    if component in tmp_json.keys():
                                        scene_components.append(
                                            tmp_json[component]
                                        )
                
                    sceneQueue.put(sceneChildren.tag)
    return name, scene_components

def complete_button_text(button_texts):
    items=["parent","self","siblings","children"]
    for button_text in button_texts:
        for key in items:
            if key not in button_text["text"].keys():
                button_text["text"][key]=[]

def deal_resource(argv_list):
    if len(argv_list) == 4:
        path = argv_list[0]
        tmp_path = argv_list[1]
        button_text_file = argv_list[2]
        scene_components_file = argv_list[3]
    else:
        print("Wrong Arg Number")
        exit(0)
    with open(tmp_path, "r", encoding="utf-8") as f:
        tmp_json = json.load(f)

    all_button_texts = {}
    all_scene_components = []
    all_scene_component_name = []
    ccVersion = "2.4.0"
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.split(".")[0] == "cocos2d-runtime":
                with open(
                    os.path.join(root, file), "r", encoding="utf-8"
                ) as js:
                    t = js.read().replace(" ", "").replace("\n", "")
                    iter_ = re.finditer("cc.ENGINE_VERSION=", t)
                    index_list = [i.start() for i in iter_]
                    if len(index_list) == 1:
                        ccVersion = t[index_list[0] + 19 : index_list[0] + 24]
                        break
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith(".json"):
                if file.startswith("config"):
                    continue
                if ccVersion < "2.4.0":
                    try:
                        with open(
                            os.path.join(root, file), "r", encoding="utf-8"
                        ) as f:
                            resources = json.load(f)
                    except Exception as ex:
                        print(ex)
                        resources = []
                    (
                        button_texts,
                        parent_child_tree_list,
                    ) = extractButtonTextLow(resources, tmp_json)
                    name, scene_components = extractSceneComponentsLow(
                        resources, parent_child_tree_list, tmp_json
                    )
                    scene_componenet = {}
                    scene_components = list(set(scene_components))
                    if name != "":
                        scene_componenet["name"] = name
                        scene_componenet["components"] = scene_components
                else:
                    try:
                        with open(
                            os.path.join(root, file), "r", encoding="utf-8"
                        ) as f:
                            resources = json.load(f)
                    except Exception as ex:
                        print(ex)
                        resources = []
                    scene_components=[]
                    name=""
                    button_texts=[]
                    if isinstance(resources, list):
                        res_test = resources[0]
                        if isinstance(res_test, int):
                            (
                                resource_result,
                                parent_child_tree_list,
                            ) = getResourceTmpJsonScene(resources)
                            button_texts = extractButtonText(resource_result, tmp_json)
                            name, scene_components = extractSceneComponents(
                                resource_result, parent_child_tree_list, tmp_json
                            )
                        else:
                            (
                            button_texts,
                            parent_child_tree_list,
                            ) = extractButtonTextLow(resources, tmp_json)
                            name, scene_components = extractSceneComponentsLow(
                            resources, parent_child_tree_list, tmp_json
                            )
                    scene_componenet = {}
                    scene_components = list(set(scene_components))
                    if name != "":
                        scene_componenet["name"] = name
                        scene_componenet["components"] = scene_components
                uuid_decode = file.split(".")[0].replace("-", "_")
                if button_texts != []:
                    complete_button_text(button_texts)
                    all_button_texts[uuid_decode] = button_texts
                if scene_componenet != {}:
                    all_scene_component_name.append(scene_componenet)
                all_scene_components.extend(scene_components)
    all_scene_components = list(set(all_scene_components))
    with open(button_text_file, "w", encoding="utf-8") as f:
        json.dump(all_button_texts, f, ensure_ascii=False, indent=2)
    with open(scene_components_file, "w", encoding="utf-8") as f:
        json.dump(
            [all_scene_components, all_scene_component_name],
            f,
            ensure_ascii=False,
            indent=2,
        )

if __name__ == "__main__":
    button_texts=extractButtonText(tempjson,tmp_json)
    print(button_texts)