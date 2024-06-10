# encoding: utf-8
from functools import partial
import json
import hashlib
import re
import os
import subprocess
from multiprocessing import Pool
from log import Log
import codecs
import chardet
logger = Log()


def getDirFiles(file_path):
    file_list_js = []
    file_list_json = []
    for file_path, sub_dirs, filenames in os.walk(file_path):
        if filenames:
            for filename in filenames:
                if filename.split(".")[-1] == "js":
                    file_list_js.append(os.path.join(file_path, filename))
                elif filename.split(".")[-1] == "json":
                    file_list_json.append(os.path.join(file_path, filename))
    return file_list_js, file_list_json


def getDirSize(dir_path):
    file_list = []
    for file_path, sub_dirs, filenames in os.walk(dir_path):
        if filenames:
            for filename in filenames:
                if filename.split(".")[-1] == "js":
                    this_file = os.path.join(file_path, filename)
                    # file_size = os.path.getsize(this_file)
                    file_size = os.stat(this_file).st_size
                    file_list.append((this_file, file_size))
    return file_list


def deduplicateArrays(arr):
    result_set = set()
    for sub_arr in arr:
        sub_arr_tuple = tuple(sub_arr)
        result_set.add(sub_arr_tuple)
    result = [list(sub_arr) for sub_arr in result_set]
    return result


def removeRedundantControlChain(input_file, output_file):
    this_test_file = input_file
    with open(this_test_file, "r", encoding="utf-8") as file:
        data2 = json.load(file)
    raw_data = data2["detection"]
    my_data = []
    for item in raw_data:
        site = 0
        for i, obj in reversed(list(enumerate(item))):
            if obj.find("fakestart") > -1:
                site = i
                break
            if obj.find("liveCallWala") > -1:
                site = i
                break
        this_list = []
        pre = ""
        for item_s in item[site:]:
            if pre != item_s:
                pre = item_s
                this_list.append(item_s)
        my_data.append(this_list)
    my_data = deduplicateArrays(my_data)

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(my_data, file, indent=4, ensure_ascii=False)


def deduplicateArrays_illegal(arr: list, labels: list, tags: list):
    result_set = set()
    to_delete = []
    labels_result = []
    tags_result = []
    for i, sub_arr in enumerate(arr):
        sub_arr_tuple = tuple(sub_arr)
        if sub_arr_tuple in result_set:
            to_delete.append(i)
        result_set.add(sub_arr_tuple)
    for i in range(len(arr)):
        if i not in to_delete:
            labels_result.append(labels[i])
            tags_result.append(tags[i])
    result = [list(sub_arr) for sub_arr in result_set]
    result.sort(key=arr.index)
    return result, labels_result, tags_result


def removeRedundantControlChain_illegal(
    input_file, output_file, labels_file, tags_file, labels_remove_dup, tags_remove_dup
):
    logger.debug("Start remove Redundant ControlChain")
    this_test_file = input_file
    with open(this_test_file, "r", encoding="utf-8") as file:
        data2 = json.load(file)
    with open(labels_file, "r", encoding="utf-8") as f:
        labels = f.readlines()
    tags = {}
    with open(tags_file, "r", encoding="utf-8") as f:
        tags = json.load(f)
    tags = tags["tags"]
    raw_data = data2["detection"]
    my_data = []
    for item in raw_data:
        site = 0
        for i, obj in reversed(list(enumerate(item))):
            if obj.find("fakestart") > -1:
                site = i
                break
            if obj.find("liveCallWala") > -1:
                site = i
                break
        this_list = []
        pre = ""
        for item_s in item[site:]:
            if pre != item_s:
                pre = item_s
                this_list.append(item_s)
        my_data.append(this_list)
    my_data, labels, tags = deduplicateArrays_illegal(my_data, labels, tags)

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(my_data, file, indent=4, ensure_ascii=False)
    with open(labels_remove_dup, "w", encoding="utf-8") as f:
        f.writelines(labels)
    with open(tags_remove_dup, "w", encoding="utf-8") as f:
        json.dump(tags, f, ensure_ascii=False)



def getUserCodePath(path):
    file_list_js = getDirSize(path)
    pattern2 = r"cc((\._RF)|(\[.+?\]))((\.push)|(\[.+?\]))\(.+?,.+?,.+?\)"
    pattern3 = r":\[function\(\w+,\w+,?\w*\)\{(.{0,100};){0,3}"
    file_list = []
    for f in file_list_js:
        try:
            with open(f[0], "r", encoding="utf-8") as js:
                t = js.read().replace(" ", "").replace("\n", "")
                if re.search(pattern3 + pattern2, t):
                    file_list.append(f)
        except UnicodeDecodeError as e:
            with open(f[0], 'rb') as js:
                encoding = chardet.detect(js.read())['encoding']
            with codecs.open(f[0], 'r', encoding) as js:
                content = js.read()
            with codecs.open(f[0], 'w', 'utf-8') as js:
                js.write(content)
            with open(f[0], "r", encoding="utf-8") as js:
                t = js.read().replace(" ", "").replace("\n", "")
                if re.search(pattern3 + pattern2, t):
                    file_list.append(f)
    return file_list


def getCaseName(path):
    last_element = os.path.basename(path)
    return last_element

def changecode(code_path):
    for root, dirs, files in os.walk(code_path):
        for file in files:
            if file.endswith('.js')|file.endswith('.json'):
                file_path = os.path.join(root, file)
                encoding=""
                with open(file_path, 'rb') as js:
                    encoding = chardet.detect(js.read())['encoding']
                if(type(encoding)==str):
                    encoding.lower()
                    if (encoding != 'utf-8') & (encoding!=""):
                        try:
                            with codecs.open(file_path, 'r', encoding) as js:
                                content = js.read()
                            with codecs.open(file_path, 'w', 'utf-8') as js:
                                js.write(content)
                        except Exception as e:
                            continue 

def unzipCodes(rpk_path, target_path):
    import os, zipfile
    print(f"Start Unzip： {rpk_path}")
    zip_path = rpk_path.replace(".rpk", ".zip")
    os.rename(rpk_path, zip_path)
    # unzip file
    zip_file = zipfile.ZipFile(zip_path)
    zip_list = zip_file.namelist()
    for f in zip_list:
        zip_file.extract(f, target_path)
    zip_file.close()
    # restore rpk file
    os.rename(zip_path, rpk_path)

    for file_name in os.listdir(target_path):
        file_path = os.path.join(target_path, file_name)
        if file_path.endswith(".rpk"):
            unzipCodes(file_path, os.path.join(target_path, file_name[:-4]))


def timer(func):
    def func_wrapper(*args, **kwargs):
        from time import perf_counter
        start = perf_counter()
        result = func(*args, **kwargs)
        end = perf_counter()
        print(f"{func.__name__}: {end - start:.6f} seconds")
        return result

    return func_wrapper


def getFileHash(file_path):
    hasher = hashlib.sha256()  
    with open(file_path, "rb") as file:
        buffer = file.read(65536)  
        while len(buffer) > 0:
            hasher.update(buffer)
            buffer = file.read(65536)
    return hasher.hexdigest()


def compareFiles(file_paths):
    unique_files = {} 
    for index, file_path in enumerate(file_paths):
        file_hash = getFileHash(file_path)
        if file_hash not in unique_files:
            unique_files[file_hash] = file_path
    return list(unique_files.values())


def isEmptyWalaResult(file_path):
    with open(file_path, "r") as file:
        file_content = file.read()
        target_content = '{"detection":[]}'
        return target_content in file_content


def readWalaResult(file_path):
    with open(file_path, "r") as file:
        data = json.load(file)
        detection_ = data.get("detection", [])
        return detection_


def getComponentToScene(scene_to_component_file):
    with open(scene_to_component_file, "r", encoding="utf-8") as f:
        scene_to_component = json.load(f)
    scene_to_component = scene_to_component[1]
    component_to_scene = {}
    for scene in scene_to_component:
        for component in scene["components"]:
            if component not in component_to_scene:
                component_to_scene[component] = [scene["name"]]
            else:
                component_to_scene[component].append(scene["name"])
    return component_to_scene

def findAd(tag):
    Ad = ""
    for key in tag:
        if "Ad" in key and key!="Ad closed":
            Ad = key
    return Ad

def makePair(text,textlist):
    for item in textlist:
        if item in text:
            return True
    return False

def hasChinese(text):
    for ch in text:
        if u'\u4e00' <= ch <= u'\u9fff':
            return True
    return False
    
    
def solveText(texts):
    black_list = ["背景"]
    button_illegal_texts = [
        "设置",
        "setting",
        "Setting",
        "shezhi",
        "关闭",
        "下一关",
        "签到",
        "商店",
        "开始",
        "游戏",
        "继续",
        "暂停",
        "武器",
        "wuqi",
        "Weapon",
        "weapon",
        "Shop",
        "Menu",
        "menu",
        "daoju",
        "道具",
        "提示",
        "wanju",
        "规则",
    ]
    result=[]
    for text in texts:
        if (hasChinese(text))&(not makePair(text,black_list)):
            result.append(text)
    if len(result)!=0:
        return result
    else:
        result=[]
        for text in texts:
            if makePair(text,button_illegal_texts):
                result.append(text)
        if len(result)!=0:
            return result
    return []
    

def findbuttontext(button_texts, button_tag):
    select_texts=[]
    # illegal_texts=[]
    button_illegal_texts = [
        "设置",
        "setting",
        "Setting",
        "shezhi",
        "关闭",
        "下一关",
        "签到",
        "商店",
        "开始",
        "游戏",
        "继续",
        "暂停",
        "武器",
        "wuqi",
        "Weapon",
        "weapon",
        "Shop",
        "Menu",
        "menu",
        "daoju",
        "道具",
        "提示",
        "wanju",
        "规则",
    ]
    filename_list=button_tag[0].split("_")[1:]
    function_name=button_tag[1]
    for text in button_illegal_texts:
        if text in function_name:
            select_texts.append(text)
    if(len(select_texts)!=0):
        return "Button Function" + function_name + "matching keywords"+",".join(select_texts)
    filename="_".join(filename_list)
    buttons=button_texts[filename]
    button_text=[]
    for button in buttons:
        if button["function"]== function_name:
            button_text=[button["text"]["self"],button["text"]["children"],button["text"]["parent"],button["text"]["siblings"]]
            break
    nodes=["self", "child node", "parent node", "brother node"]
    for index in range(len(button_text)):
        text=list(set(button_text[index]))
        text=solveText(text)
        if len(text)!=0:
            return "Button related text("+nodes[index]+")"+",".join(text)
            
    
def mergeOutputFiles(
    paths_file, labels_file, tags_file, output_file, button_text_file,scene_to_component_file
):
    with open(tags_file, "r", encoding="utf-8") as f:
        tags = json.load(f)
    with open(labels_file, "r", encoding="utf-8") as f:
        labels = f.readlines()
    with open(paths_file, "r", encoding="utf-8") as f:
        paths = json.load(f)
    with open(button_text_file, "r", encoding="utf-8") as f:
        button_texts = json.load(f)
    if (len(paths) != len(labels)) | (len(paths) != len(tags)):
        logger.error("Error while merging out files")
        return
    results = []
    component_to_scene = getComponentToScene(scene_to_component_file)
    
    for i in range(len(paths)):
        label = labels[i].strip().rstrip("|").split("|")
        tag = tags[i]
        result = {}

        user_operation = []
        trigger_condition = []
        user_interface_context = []
        ad_type = ""
        call_path = paths[i]
        aggressive_ad_behavior = []

        for item in label:
            if item == "Pop-up banner ads at regular intervals":
                if "timer" in tag:
                    time = tag["timer"]
                    if len(time) != 0:
                        time = time[0].split(".")[0]
                        if time == "0":
                            trigger_condition.append("timer")
                        else:
                            trigger_condition.append("timer:" + time + " seconds")
                    else:
                        trigger_condition.append("timer")
                    ad_type = findAd(tag)
                aggressive_ad_behavior.append("Unstoppable pop-ups")
            elif item == "Frequent pop-up ads":
                if "timer" in tag:
                    time = tag["timer"]
                    if len(time) != 0:
                        time = time[0].split(".")[0]
                        if time == "0":
                            trigger_condition.append("timer")
                        else:
                            trigger_condition.append("timer:"+ time + " seconds")
                    else:
                        trigger_condition.append("timer")
                    ad_type = findAd(tag)
                aggressive_ad_behavior.append("Unstoppable pop-ups")
            elif item == "Switch scenes to pop up ads":
                if "Lifecircle" in tag:
                    lifecycle = tag["Lifecircle"]
                    if lifecycle[0] == "Scene":
                        scenes = component_to_scene[lifecycle[1]]
                        scenes=list(set(scenes))
                        user_interface_context.append("Scene:"+",".join(scenes))
                        user_interface_context.append("Component: "+lifecycle[1])
                        user_interface_context.append("Function: "+lifecycle[2])
                        aggressive_ad_behavior.append("Interrupting pop-ups")
                    else:
                        user_interface_context.append("Component: "+lifecycle[0])
                        user_interface_context.append("Function："+lifecycle[1])
                        user_interface_context.append(findAd(tag))
                        trigger_condition.append("Component lifecycle functions trigger ads")
                        aggressive_ad_behavior.append("Interrupting pop-ups")
                    ad_type = findAd(tag)
            elif "button" in item:
                if "Button" in tag:
                    filename_list=tag["Button"][0].split("_")[1:]
                    function_name=tag["Button"][1]
                    filename="_".join(filename_list)
                    user_interface_context.append("Button file: "+filename)
                    trigger_condition.append("Button trigger function: "+function_name)
                    user_interface_context.append(findbuttontext(button_texts, tag["Button"]))
                    user_operation.append("Button clicks")
                    ad_type = findAd(tag)
                aggressive_ad_behavior.append("Hijacking pop-ups")
            elif item == "Delay the pop-up Banner AD after the Banner AD is closed":
                if "BannerAdClose" in tag:
                    trigger_condition.append("Ad closed")
                if "delayer" in tag:
                    time = tag["delayer"]
                    if len(time) != 0:
                        time = time[0].split(".")[0]
                        if time == "0":
                            trigger_condition.append("delayer")
                        else:
                            trigger_condition.append("delayer: " + time + "seconds")
                    else:
                        trigger_condition.append("delayer")
                    ad_type = findAd(tag)
                aggressive_ad_behavior.append("Unstoppable pop-ups")
            elif item =="Native template ads pop up during the game":
                if "Lifecircle" in tag:
                    if tag["Lifecircle"][0]=="Scene":
                        user_interface_context.append("Component："+tag["Lifecircle"][1])
                        user_interface_context.append("Function: "+tag["Lifecircle"][2])
                        ad_type = findAd(tag)
                        user_interface_context.append(tag["Lifecircle"][1]+"Component"+tag["Lifecircle"][2]+"Function trigger native template ads")
                    else:
                        user_interface_context.append("Component："+tag["Lifecircle"][0])
                        user_interface_context.append("Function: "+tag["Lifecircle"][1])
                        ad_type = findAd(tag)
                        user_interface_context.append(tag["Lifecircle"][0]+"Component"+tag["Lifecircle"][1]+"Function trigger native template ads")
                        trigger_condition.append("Component State Switching")
                else:
                    aggressive_ad_behavior.append("Interrupting pop-ups")
            elif (item=="Time masking")|(item=="Geolocation masking"):
                user_operation.append("Evasion technique:" + item)
            elif item=="The touch event triggers the interstitial AD":
                ad_type = findAd(tag)
                user_operation.append("Screen Touching")
                aggressive_ad_behavior.append("Interrupting pop-ups")
            elif item=="Touch events trigger incentive video ads":
                ad_type = findAd(tag)
                user_operation.append("Screen Touching")
                aggressive_ad_behavior.append("Interrupting pop-ups")

        result['User operation'] = user_operation
        result['Triggering condition'] = trigger_condition
        result['User interface context'] = user_interface_context
        result['Ad type'] = ad_type
        result['Call path'] = call_path
        result['Aggressive ad behavior'] = aggressive_ad_behavior
        results.append(result)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({"state":"Success","result":results}, f, ensure_ascii=False)


def dealMutliFile(sourcecode_path_list, case_name, outdir, deal_multi_src_code_js):
    if len(sourcecode_path_list) > 1:
        all_size = {}
        unique_src_code_list = []
        for item in sourcecode_path_list:
            size = str(item[1])
            if size not in all_size:
                all_size[size] = []
            all_size[size].append(item[0])

        for size, file_list in all_size.items():
            if len(file_list) > 1:
                unique_paths = compareFiles(file_list)
                for i in unique_paths:
                    unique_src_code_list.append([i, size])
            else:
                unique_src_code_list.append([file_list[0], size])

        sourcecode_path = os.path.join(outdir, case_name + "_all_source_code.js")
        with open(sourcecode_path, "w"):
            pass

        for index, pth in enumerate(unique_src_code_list):
            with open(pth[0], "r", encoding="UTF-8") as fr:
                content = fr.read()
                if content.startswith("window.__require"):
                    with open(sourcecode_path, "a", encoding="UTF-8") as w:
                        w.write(content)
                    unique_src_code_list.pop(index)
                    break

        for id, pth in enumerate(unique_src_code_list):
            mylist = ["node", deal_multi_src_code_js, pth[0], sourcecode_path]
            cmd_command = " ".join(mylist)
            subprocess.call(cmd_command, shell=True)
    elif len(sourcecode_path_list) == 1:
        sourcecode_path = sourcecode_path_list[0][0]
    else:
        logger.error(f"The developer file was not found, and subsequent processing is unavailable.case_name: {case_name}")
        return None
    return sourcecode_path

def obfuscation(code_path):
    paths = getUserCodePath(code_path)
    for code_path in paths:
        result = if_obfuscation(code_path[0])
        if not result == "Correct":
            return "Obfuscation"
    return None

def if_obfuscation(path):
    pattern1 = r'\x70\x75\x73\x68'  # push
    pattern2 = r'\u0070\u0075\u0073\u0068'  # push

    try:
        with open(path, 'r', encoding='utf-8') as js:
            t = js.read().replace(' ', '').replace('\n', '')
            cmd=" ".join(["node","jscode/if_obfuscation.js",path])
            command = os.popen(cmd)
            result = command.buffer.read().decode("utf-8").split('\n')[0]
            command.close()
            if result == "Obfuscation":
                return "Obfuscation"
            elif (re.search(re.escape(pattern1), t)):
                return "Obfuscation"
            elif (re.search(re.escape(pattern2), t)):
                return "Obfuscation"
            else:
                return "Correct"
    except Exception as e:
        print(f"Error:{e}")
        return "Error"


def check_rpk_version(code_path):
    if find_laya(code_path):
        return "Laya"
    elif find_cocos(code_path):
        if obfuscation(code_path):
            return "Obfuscation"
        return find_cocos(code_path)
    else:
        return "Others"
def find_laya(game_dir):
    for root, dirs, files in os.walk(game_dir):
        for file in files:
            if file.startswith('laya'):
                return True
    return False


def find_cocos(game_dir):
    version = find_cocos_version(game_dir)
    if version:
        if version.startswith('2'):
            return "Cocos2 version:" + version
        else:
            return "Cocos3 version:" + version 
    return None

def find_cocos_version(code_dir):
    re_str = r'ENGINE_VERSION\s*=\s*"(.*)"'
    file = find_runtime_file(code_dir)
    # print(file)
    if file:
        version="2"
        with open(file, 'r') as f:
            for line in f.readlines():
                if 'ENGINE_VERSION' in line:
                    match = re.findall(re_str, line)
                    if match:
                        version=match[0]
                        break
        return version
    elif find_cocos3_file(code_dir):
        return '3'
    return None



def find_runtime_file(code_dir):
    # find cocos2d-runtime.js
    for root, dirs, files in os.walk(code_dir):
        for file in files:
            pattern = r'^cocos2d-runtime.*\.js$'
            if re.match(pattern, file):
                return os.path.join(root, file)
    return None

def find_cocos3_file(code_dir):
    for root, dirs, files in os.walk(code_dir):
        if 'cocos-js' in dirs:
            return True
    return False

def process_element(context_length,timelimmit,output_dir, rpk_list):
    for rpk_path in rpk_list:
        if rpk_path:
            main_path = "code/main.py"
            cmd_command = " ".join(["python3", main_path, "-r", rpk_path,"-l",str(context_length),"-t",str(timelimmit),"-od", output_dir])
            os.system(cmd_command)


def process_test_list_by_multiprocessing(array,context_length,timelimit, num_threads, output_dir):
    pool = Pool(num_threads)
    pfunc=partial(process_element,context_length,timelimit, output_dir)
    pool.map(pfunc, array)
    pool.close()
    pool.join()
