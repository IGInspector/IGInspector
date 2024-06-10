import subprocess
import sys
import os
import shutil
import argparse
from log import Log
import json
import traceback
from util import (
    removeRedundantControlChain,
    removeRedundantControlChain_illegal,
    getUserCodePath,
    getCaseName,
    unzipCodes,
    readWalaResult,
    mergeOutputFiles,
    dealMutliFile,
    process_test_list_by_multiprocessing,
    check_rpk_version,
    changecode,
)

from deal_resource import deal_resource

sys.path.append("./code")
logger = Log()

dir_config = {
    "jscode_dir": "jscode",
    "out_dir": "result",
    "result_dir": "result",
    "resource_dir": "resource",
    "unzip_dir":"unzip"
}

js_index_dict = {
    "deal_source_code": os.path.join(
        dir_config["jscode_dir"], "deal_source_code.js"
    ),
    "deal_fake_extends": os.path.join(
        dir_config["jscode_dir"], "deal_fake_extends.js"
    ),
    "get_key_uuid": os.path.join(dir_config["jscode_dir"], "get_key_uuid.js"),
    "deal_scene_json": os.path.join(
        dir_config["jscode_dir"], "deal_scene_json.js"
    ),
    "deal_syntactic_sugar": os.path.join(
        dir_config["jscode_dir"], "deal_syntactic_sugar.js"
    ),
    "get_start_point": os.path.join(
        dir_config["jscode_dir"], "get_start_point.js"
    ),
    "cut_code": os.path.join(dir_config["jscode_dir"], "cut_code.js"),
    "cut_code_2": os.path.join(dir_config["jscode_dir"], "cut_code2.js"),
    "deal_es6_code": os.path.join(
        dir_config["jscode_dir"], "deal_es6_code.js"
    ),
    "makeup_scene_data": os.path.join(
        dir_config["jscode_dir"], "makeup_scene_data.js"
    ),
    "deal_multi_src_code": os.path.join(
        dir_config["jscode_dir"], "deal_multi_src_code.js"
    ),
}
resource_file_path = {
    "file_external": os.path.join(
        dir_config["resource_dir"], "external_method.js"
    ),
    "wala_path": os.path.join(dir_config["resource_dir"], "expertSystem.jar"),
    "node": "node",
}


def completeModule(this_config):
    logger.debug("Start source code preprocessing")
    cmd_command = " ".join(
        [
            resource_file_path["node"],
            js_index_dict["deal_source_code"],
            this_config["sourcecode_path"],
            this_config["outdir"],
            this_config["case_name"],
            this_config["fix_file_path"],
        ]
    )
    subprocess.run(cmd_command, shell=True)
    logger.debug("Start pseudo-inheritance processing module")
    my_list = [
        resource_file_path["node"],
        js_index_dict["deal_fake_extends"],
        this_config["fix_file_path"],
        this_config["outdir"],
        this_config["case_name"],
        this_config["fix_file_path"],
    ]
    cmd_command = " ".join(my_list)
    subprocess.run(cmd_command,shell=True,check=True)
      

def simplifyModule(this_config):
    logger.debug("Module Pruning")
    mylist = [
        resource_file_path["node"],
        js_index_dict["cut_code"],
        this_config["fix_file_path"],
        this_config["cut_file_path"],
    ]
    cmd_command = " ".join(mylist)
    subprocess.run(cmd_command, shell=True,check=True)

    try:
        logger.debug("Function Pruning")
        mylist = [
            resource_file_path["node"],
            js_index_dict["cut_code_2"],
            this_config["cut_file_path"],
            this_config["fix_file_path"],
        ]
        cmd_command = " ".join(mylist)
        subprocess.run(cmd_command, shell=True,check=True)
    except Exception as e:
        print(f"Function Pruning Error: {e}")

    logger.debug("Deal ES6")
    mylist = [
        resource_file_path["node"],
        js_index_dict["deal_es6_code"],
        this_config["cut_file_path"],
        this_config["after_es6"],
    ]
    cmd_command = " ".join(mylist)
    subprocess.run(cmd_command, shell=True,check=True)


def processSyntacticSugar(this_config):
    logger.debug("Start process SyntacticSugar")
    mylist = [
        resource_file_path["node"],
        js_index_dict["deal_syntactic_sugar"],
        this_config["sourcecode_path"],
        this_config["outdir"],
        this_config["case_name"],
        this_config["window_path"],
    ]
    cmd_command = " ".join(mylist)
    subprocess.run(cmd_command, shell=True,check=True)


def handleConfigFile(this_config):
    logger.debug("Start handle ConfigFile")
    mylist = [
        resource_file_path["node"],
        js_index_dict["get_key_uuid"],
        this_config["sourcecode_path"],
        this_config["outdir"],
        this_config["case_name"],
        this_config["tmp_path"],
    ]
    cmd_command = " ".join(mylist)
    subprocess.run(cmd_command, shell=True,check=True)

    print("Extract button text Begin")
    mylist = [
        this_config["path"],
        this_config["tmp_path"],
        this_config["button_text"],
        this_config["scene_component"],
    ]
    deal_resource(mylist)
    print("Extract button text End")


def entryModule(this_config):
    logger.debug("Start entry point")
    mylist = [
        resource_file_path["node"],
        js_index_dict["get_start_point"],
        this_config["button_text"],
        this_config["sourcecode_path"],
        this_config["fakestart_path"],
        this_config["fix_file_path"],
    ]
    cmd_command = " ".join(mylist)
    subprocess.run(cmd_command, shell=True,check=True)

def makeAdChain(this_config, S2_flag=False):
    logger.debug("Start program call graph generation and ad flow exploration")
    mylist = [
        "java",
        "-jar",
        resource_file_path["wala_path"],
        "-i",
        this_config["file_result"],
        "-o",
        this_config["wala_output"],
        "-l",
        str(this_config["context_length"]),
    ]
    try:
        subprocess.run(mylist, timeout=this_config["time_limit"],check=True)
    except subprocess.TimeoutExpired:
        logger.error(f"{this_config['case_name']} ad detection timeout")
        case_dir = this_config["outdir"]
        resultpath=os.path.join(case_dir, "final_result.json")
        with open(resultpath,"w") as f:
            json.dump({"state":"Error","result":"ad detection timeout"},f,ensure_ascii=False)
        return
    except Exception as e:
        value = sys.exc_info()
        raise value[1]
    logger.info("ad flow exploration End")

    removeRedundantControlChain(
        this_config["wala_output"], this_config["all_chain"]
    )
    try:
        removeRedundantControlChain_illegal(
            this_config["wala_output_illegal"],
            this_config["all_chain_illegal"],
            this_config["labels"],
            this_config["tags"],
            this_config["labels_remove_dup"],
            this_config["tags_remove_dup"],
        )
        mergeOutputFiles(
            this_config["all_chain_illegal"],
            this_config["labels_remove_dup"],
            this_config["tags_remove_dup"],
            this_config["all_chain_illegal_merge"],
            this_config["button_text"],
            this_config["scene_component"],
        )
        logger.info(f"For information on illegal advertising, please see the document {this_config['all_chain_illegal_merge']}")
    except:
        logger.error("removeRedundantControlChain Error")


def mergeFiles(this_config):
    file0 = this_config["window_path"]
    file1 = this_config["after_es6"]
    file2 = this_config["fakestart_path"]
    file_result = this_config["file_result"]
    file_external = resource_file_path["file_external"]

    with open(file1, "r", encoding="utf-8") as f1, open(
        file2, "r", encoding="utf-8"
    ) as f2, open(file_result, "w", encoding="utf-8") as f4, open(
        file0, "r", encoding="utf-8"
    ) as f0, open(
        file_external, "r", encoding="utf-8"
    ) as fe:
        for line in fe:
            f4.write(line)
        f4.write("\n")
        for line in f0:
            f4.write(line)
        f4.write("\n")
        for line in f1:
            f4.write(line)
        f4.write("\n")
        for line in f2:
            f4.write(line)

def removeIntermediateFiles(this_config):
    logger.debug("Start remove IntermediateFiles")
    case_dir = this_config["outdir"]
    for file in os.listdir(case_dir):
        file_path = os.path.join(case_dir, file)
        if os.path.isfile(file_path):
            if file != "final_result.json":
                os.remove(file_path)
    try:
        if os.path.exists(this_config["path"]):
            shutil.rmtree(this_config["path"])
        if os.path.exists(this_config['scene_dir']):
            shutil.rmtree(this_config['scene_dir'])
        print(f"Deleted directory: {this_config['path']}")
    except Exception as e:
        print(f"Error deleting directory: {e}")

def main_task(rpk_path, context_length, time_limit, output_dir):

    case_name=os.path.basename(rpk_path)[:-4]
    jscode_dir = dir_config["jscode_dir"]
    outdir = os.path.join(output_dir, case_name)
    if not os.path.exists(output_dir):
        os.mkdir(output_dir)

    if not os.path.exists(outdir):
        os.mkdir(outdir) 
    else:
        print(f"Unzip directory {outdir} already exists")
    
    file_size = float(round(os.path.getsize(rpk_path)/1024, 2))
    if file_size < 10:
        logger.info(f"instant-game:{case_name} file_size:{file_size}KB")
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": f"File{rpk_path} broken,file_size:{file_size}KB, end processing"}, f, ensure_ascii=False)
        return
    
    path = os.path.join(output_dir, dir_config["unzip_dir"] + "/" + case_name)
    
    try:
        if not os.path.exists(path):
            unzipCodes(rpk_path, path)
        changecode(path)
        sourcecode_path_list = getUserCodePath(path)
    except Exception as e:
        logger.error(f"instant-game:{case_name} Error: {e}")
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": "Unzip Error"}, f, ensure_ascii=False)
        removeIntermediateFiles(this_path_config)
        return
    logger.info(
        f"case_name: {case_name}, file_path: {sourcecode_path_list}, output: {outdir}"
    )
    
    tmp_path = os.path.join(outdir, "tmp.json")
    scene_dir = os.path.join(outdir, "prefab")
    scene_fun_path = os.path.join(outdir, "scene_fun.js")
    fakestart_path = os.path.join(outdir, "fakestart.js")
    fix_file_path = os.path.join(outdir, "fix.js")
    cut_file_path = os.path.join(outdir, "cut_result.js")
    window_path = os.path.join(outdir, "window.js")
    file_result = os.path.join(outdir, "seed.js")
    wala_output = os.path.join(outdir, "wala_result.json")
    wala_output_illegal = os.path.join(outdir, "wala_result_illegal.json")
    all_chain = os.path.join(outdir, "all_chain.json")
    all_chain_illegal = os.path.join(outdir, "all_chain_illegal.json")
    after_es6_file_path = os.path.join(outdir, "after_es6.js")
    button_text = os.path.join(outdir, "button_text.json")
    scene_component = os.path.join(outdir, "scene_component.json")
    labels = os.path.join(outdir, "wala_result_label.txt")
    tags = os.path.join(outdir, "wala_result_tags.json")
    labels_remove_dup = os.path.join(outdir, "wala_result_label_romove.txt")
    tags_remove_dup = os.path.join(outdir, "wala_result_tags_remove.json")
    all_chain_illegal_merge = os.path.join(outdir, "final_result.json")
    this_path_config = {
        "path": path,
        "case_name": case_name,
        "sourcecode_path": [],
        "jscode_dir": jscode_dir,
        "outdir": outdir,
        "tmp_path": tmp_path,
        "scene_dir": scene_dir,
        "scene_fun_path": scene_fun_path,
        "fakestart_path": fakestart_path,
        "fix_file_path": fix_file_path,
        "cut_file_path": cut_file_path,
        "window_path": window_path,
        "file_result": file_result,
        "wala_output": wala_output,
        "all_chain": all_chain,
        "wala_output_illegal": wala_output_illegal,
        "all_chain_illegal": all_chain_illegal,
        "labels": labels,
        "tags": tags,
        "labels_remove_dup": labels_remove_dup,
        "tags_remove_dup": tags_remove_dup,
        "all_chain_illegal_merge": all_chain_illegal_merge,
        "after_es6": after_es6_file_path,
        "button_text": button_text,
        "scene_component": scene_component,
        "context_length": context_length,
        "time_limit": time_limit,
    }
    try:
        result=check_rpk_version(path)
        if("Cocos2" not in result):
            if(result!="obfuscation"):
                logger.error(f"instant-game{case_name} not Cocos2")
                with open(os.path.join(outdir, "final_result.json"), "w") as f:
                    json.dump({"state": "Error", "result": f"engine is {result},end processing"}, f, ensure_ascii=False)
                removeIntermediateFiles(this_path_config)
                return
            else:
                logger.error(f"instant-game{case_name} contains obfuscation code")
                with open(os.path.join(outdir, "final_result.json"), "w") as f:
                    json.dump({"state": "Error", "result": "obfuscation code"}, f, ensure_ascii=False)
                removeIntermediateFiles(this_path_config)
                return
    except Exception as e:
        logger.error(f"instant-game{case_name} Error: {e}")
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": "engine detection Error"}, f, ensure_ascii=False)
        removeIntermediateFiles(this_path_config)
        return
    sourcecode_path = dealMutliFile(
        sourcecode_path_list,
        case_name,
        outdir,
        js_index_dict["deal_multi_src_code"],
    )
    if sourcecode_path is None:
        logger.error(f"Source code processing error: No valid source code file found. case_name: {case_name}")
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": "Developer files missing"}, f, ensure_ascii=False)
        removeIntermediateFiles(this_path_config)
        exit()
    
    this_path_config["sourcecode_path"] = sourcecode_path

    try:
        completeModule(this_path_config)
        handleConfigFile(this_path_config)
        processSyntacticSugar(this_path_config)
        entryModule(this_path_config)
        simplifyModule(this_path_config)
        mergeFiles(this_path_config)
    except Exception as e:
        logger.error(f"instant-game{case_name} Error: {e}")
        exc_type, exc_value, exc_traceback = sys.exc_info()
        traceback_info = traceback.extract_tb(exc_traceback)
        function_name = traceback_info[-2][2]
        module=function_name
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": f"{module} Error"}, f, ensure_ascii=False)
        removeIntermediateFiles(this_path_config)
        return
    try:
        makeAdChain(this_path_config)
    except Exception as e:
        logger.error(f"instant-game{case_name} Error: {e}")
        with open(os.path.join(outdir, "final_result.json"), "w") as f:
            json.dump({"state": "Error", "result": "ad flow exploration Error"}, f, ensure_ascii=False)
        removeIntermediateFiles(this_path_config)
        return
    removeIntermediateFiles(this_path_config)
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="IGInspector Command Argument"
    )
    parser.add_argument("-r", "--rpk_path", type=str)
    parser.add_argument("-d", "--dir_path", type=str)
    parser.add_argument("-f", "--file_path", type=str)
    parser.add_argument("-n", "--threads", type=int, default=8)
    parser.add_argument("-t", "--time_limit", type=int, default=1200)
    parser.add_argument("-l", "--context_length", type=int, default=1)
    parser.add_argument("-od", "--output_dir", type=str, default=dir_config["result_dir"])
    args = parser.parse_args()

    rpk_path = args.rpk_path
    dir_path = args.dir_path
    file_path = args.file_path
    context_length = args.context_length
    time_limit = args.time_limit
    output_dir = args.output_dir
    
    if not (rpk_path or dir_path or file_path):
        parser.print_help()


    if rpk_path:
        if not rpk_path.endswith(".rpk"):
            logger.error(f"Parameter Error: non-rpk file {rpk_path}")
            exit()
        main_task(rpk_path,context_length,time_limit, output_dir)

    elif dir_path:
        if not os.path.exists(dir_path):
            logger.error(f"Parameter Error: Folder path does not exist {dir_path}")
            exit()
        
        rpk_list = [
            os.path.join(dir_path, file)
            for file in os.listdir(dir_path)
            if file.endswith(".rpk")
        ]
        if not len(rpk_list):
            logger.error("Parameter Error: No rpk file in the input folder")

        threads_num = args.threads
        process_test_list_by_multiprocessing(
            [(item,) for item in rpk_list],context_length,time_limit, threads_num, output_dir
        )

    elif file_path:
        if not os.path.exists(file_path):
            logger.error(f"Parameter Error: file path does not exist {file_path}")
            exit()
        rpk_list = []
        with open(file_path, "r", encoding="utf-8") as file:
            for id, line in enumerate(file):
                line = line.strip()
                if line.endswith(".rpk"):
                    rpk_list.append(line)
        if not len(rpk_list):
            logger.error("Parameter Error: The input file content does not contain the rpk file path")
        threads_num = args.threads
        process_test_list_by_multiprocessing(
            [(item,) for item in rpk_list],context_length,time_limit, threads_num, output_dir
        )

