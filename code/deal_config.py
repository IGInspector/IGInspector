import os
import json
import traceback
import re
from collections import defaultdict

node_path = "node"
uuid_js_path = "jscode/uuid.js"


def fileContainsString(filename, search_string):
    try:
        with open(filename, "r", encoding="utf-8") as file:
            file_content = file.read()
            if search_string in file_content:
                return True
    except Exception as e:
        print("File Reading Error", e)
    return False


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
    if count > 0.9 * len(testlist):
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


def hasDict(arr):
    for item in arr:
        if isinstance(item, dict):
            return True
        elif isinstance(item, list):
            if hasDict(item):
                return True
    return False


def has_empty_strings(arr):
    for item in arr:
        if item[0] == "" or item[1] == "":
            return True
    return False


def getCall_raw(resource_path):
    string_list = list()
    callback_list = list()
    try:
        with open(resource_path, encoding="utf-8") as fr:
            resource_json = json.load(fr)
            if isinstance(resource_json, list):
                for raw in resource_json:
                    if isinstance(raw, dict):
                        try:
                            if "_components" in raw.keys():
                                for component in raw["_components"]:
                                    if "clickEvents" in component:
                                        for handler in component["clickEvents"]:
                                            callback_list.append(
                                                (
                                                    handler["_componentId"],
                                                    handler["handler"],
                                                )
                                            )
                        except Exception as e:
                            print("272", e)
                    elif isinstance(raw, list):
                        for raw_1 in raw:
                            if isinstance(raw_1, dict):
                                try:
                                    if "_components" in raw_1.keys():
                                        for component in raw_1["_components"]:
                                            if "clickEvents" in component:
                                                for handler in component["clickEvents"]:
                                                    callback_list.append(
                                                        (
                                                            handler["_componentId"],
                                                            handler["handler"],
                                                        )
                                                    )
                                except Exception as e:
                                    print("299", e)

                if len(resource_json) > 0 and isinstance(resource_json[0], list):
                    for item in resource_json:
                        for raw in item:
                            if not isinstance(raw, dict):
                                continue
                            try:
                                if "_components" in raw.keys():
                                    for component in raw["_components"]:
                                        if "clickEvents" in component:
                                            for handler in component["clickEvents"]:
                                                callback_list.append(
                                                    (
                                                        handler["_componentId"],
                                                        handler["handler"],
                                                    )
                                                )
                            except Exception as e:
                                print("280", e)
    except Exception as ex:
        print(ex)
        print("error file " + resource_path)
    return string_list, callback_list


def getProInClass_1(
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
                result[c_key] = getProInClass_1(
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


def getCall(resource_path):
    string_list = list()
    callback_list = list()
    result = {}
    node_id = 0
    try:
        with open(resource_path, encoding="utf-8") as fr:
            resource_json = json.load(fr)
            if isinstance(resource_json, list):
                class_list = resource_json[3]
                type_list = resource_json[4]
                instance_list_total = []

                total_length = 0  
                count = 0  
                if ifInstanceArray((resource_json[5])):
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
                for instance_list in instance_list_total:
                    for instance_item in instance_list:
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
                                        key_ = class_list[type_type][1][keyvalue]
                                        if key_ == "_name":
                                            node_dic["_name"] = instance_item[i]
                                        elif key_ == "_components":
                                            components_value = instance_item[i]
                                            component_id = 0
                                            for component in components_value:
                                                component_id += 1
                                                if not isinstance(component, list):
                                                    continue
                                                if isinstance(component[0], list):
                                                    for component_item in component:
                                                        if not isinstance(
                                                            component_item, list
                                                        ):
                                                            continue
                                                        component_construct_num = (
                                                            component_item[0]
                                                        )
                                                        component_construct = type_list[
                                                            component_construct_num
                                                        ]
                                                        class_num = component_construct[
                                                            0
                                                        ]
                                                        target_list = [
                                                            "cc.Label",
                                                            "cc.Button",
                                                        ]
                                                        result_pro = getProInClass(
                                                            class_list,
                                                            type_list,
                                                            class_num,
                                                            target_list,
                                                            component_item,
                                                            component_construct,
                                                        )
                                                        component_string = (
                                                            "component_"
                                                            + str(component_id)
                                                        )
                                                        node_dic[
                                                            component_string
                                                        ] = result_pro
                                                        if (
                                                            result_pro["type"]
                                                            == "cc.Label"
                                                        ):
                                                            if (
                                                                result_pro["_string"]
                                                                != ""
                                                            ):
                                                                string_list.append(
                                                                    result_pro[
                                                                        "_string"
                                                                    ]
                                                                )
                                                        elif result_pro["clickEvents"]:
                                                            if (
                                                                result_pro[
                                                                    "clickEvents"
                                                                ]
                                                                != ""
                                                            ):
                                                                callback_list.append(
                                                                    (
                                                                        result_pro[
                                                                            "clickEvents"
                                                                        ][
                                                                            "_componentId"
                                                                        ],
                                                                        result_pro[
                                                                            "clickEvents"
                                                                        ]["handler"],
                                                                    )
                                                                )

                                                else:
                                                    component_construct_num = component[
                                                        0
                                                    ]
                                                    if (
                                                        component_construct_num
                                                        < len(type_list)
                                                        and component_construct_num > 0
                                                    ):
                                                        if (
                                                            not component_construct_num
                                                            < len(type_list)
                                                        ):
                                                            continue
                                                        component_construct = type_list[
                                                            component_construct_num
                                                        ]
                                                        class_num = component_construct[
                                                            0
                                                        ]
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
                                                        if (
                                                            result_pro["type"]
                                                            == "cc.Label"
                                                        ):
                                                            if (
                                                                result_pro["_string"]
                                                                != ""
                                                            ):
                                                                string_list.append(
                                                                    result_pro[
                                                                        "_string"
                                                                    ]
                                                                )
                                                        elif result_pro["clickEvents"]:
                                                            if (
                                                                result_pro[
                                                                    "clickEvents"
                                                                ]
                                                                != ""
                                                            ):
                                                                callback_list.append(
                                                                    (
                                                                        result_pro[
                                                                            "clickEvents"
                                                                        ][
                                                                            "_componentId"
                                                                        ],
                                                                        result_pro[
                                                                            "clickEvents"
                                                                        ]["handler"],
                                                                    )
                                                                )
                                        else:
                                            node_dic[key_] = instance_item[i]
                                        node_string = "node_" + str(node_id)
                                        result[node_string] = node_dic
                                except Exception as ex:
                                    print(ex)
                                    traceback.print_tb(ex.__traceback__)
                                    print("error file " + resource_path)

    except Exception as ex:
        print(ex)
        traceback.print_tb(ex.__traceback__)
        print("error file " + resource_path)
    return string_list, callback_list


def getCallAllConfigFile(root_level, dist_path):  
    if not os.path.exists(dist_path):
        os.mkdir(dist_path)
    is_raw_flag = True
    for root, dirs, files in os.walk(root_level):
        for file in files:
            if file.split(".")[0] == "cocos2d-runtime":
                with open(os.path.join(root, file), "r", encoding="utf-8") as js:
                    t = js.read().replace(" ", "").replace("\n", "")
                    iter_ = re.finditer("cc.ENGINE_VERSION=", t)
                    index_list = [i.start() for i in iter_]
                    if len(index_list) == 1:
                        ccVersion = t[index_list[0] + 19 : index_list[0] + 24]
                        if ccVersion > "2.4.0":
                            is_raw_flag = False

    for root, dirs, files in os.walk(root_level):
        for file in files:
            if not file.endswith("json"):
                continue
            file_path = os.path.join(root, file)
            item = file_path
            uuid_decode = item.split("/")[-1].split(".")[0]
            pattern = r"[^a-zA-Z0-9_]"
            uuid_decode = re.sub(pattern, "_", uuid_decode)
            resource_json = item
            if not resource_json.endswith(".json"):
                continue
            if is_raw_flag:
                string_list, callback_list = getCall_raw(resource_json)
            else:
                string_list, callback_list = getCall(resource_json)

            if has_empty_strings(callback_list):
                continue

            dic = {
                "uuid": uuid_decode,
                "string": string_list,
                "call_back": callback_list,
            }
            json_file_name = uuid_decode + ".json"
            json_path = os.path.join(dist_path, json_file_name)
            if len(callback_list) > 0:
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(dic, f, ensure_ascii=False)
