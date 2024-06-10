# IGInspector

IGInspector is a static analysis tool designed for aggressive Ad behavior detection in instant-games. It takes the rpk files of instant games as input and outputs the alerts for aggressive advertising behaviors within those instant-games. Currently capable of parallel detection for multiple instant-games.


## Environment

- node:  v16.11.0
- python: 3.8
- java：11

## Installing
```
npm install

pip3 install -r requirements.txt
```
## Usage

Run the following command in the root directory of the project：

1. Single rpk file

   ``` shell
   python3 ./code/main.py -r test.rpk (-l context_length -t time_limit -od output_dir)
   ```


2. Batch process all rpk files in directory `test_dir`.

   ``` shell
   python3 ./code/main.py -d test_dir (-n thread_nums -t time_limit -l context_length -od output_dir)
   ```

   `-t`: optional, the number of parallel processes (default 8).


3. Read the rpk from the file (each line is an rpk path).

   ``` shell 
   python3 ./code/main.py -f test_file.txt (-n thread_nums -t time_limit -l context_length -od output_dir)
   ```

   `-n`: optional, the number of parallel processes (default 8).
   `-t`: optional, the timeout duration (default 1200 seconds).
   `-l`: optional, the context length for static analysis (default 1).
   `-od`: optional, the directory for saving the output results (default is ./result)


## Output Results

Result Path (default): result/example.rpk/final_result.json
Example of output results:
``` json
{  
   //State 1
   "state": "Error",
   "result": "Ad detection timeout"    //Reason of Error 
}
```

``` json
{  
   //State 2
   "state": "Success",
   "result": [            
      {
         "User operation":[],
         "Triggering condition":[],
         "User interface context":[],
         "Ad type":"",
         "Call path":[], 
         "Aggressive ad behavior": []
      }
    ]
}
```
## Test Cases

get started with 3 rpk files in *test_case* directory:

```
python3 ./code/main.py -d ./test_rpk
```


## Project Structure

```
├── code
│   ├── main.py
│   ├── test.py
│   └── util.py
│   ├── deal_config.py
│   ├── deal_resource.py
├── jscode
│   ├── cut_code2.js
│   ├── cut_code.js
│   ├── deal_es6_code.js
│   ├── deal_source_code.js
│   ├── deal_fake_extends.js
│   ├── deal_syntactic_sugar.js
│   ├── get_key_uuid.js
│   ├── get_start_point.js
│   ├── deal_multi_src_code.js
│   ├── util.js
├── test_case
├── result
```

**code**

- `main.py`: Entry point of the project.
- `log.py`: Logging Tool
- `util.py`: Utility Function for Python
- `deal_config.py`: Game Scene Configuration File analysis
- `deal_resource.py`: Game Scene Resource File analysis

**jscode**

- `deal_source_code.js`: Source Code Preprocessing
- `deal_multi_src_code.js`: Multi-Developer File Handling
- `cut_code.js`: Module Pruning
- `cut_code2.js·`: Function Pruning
- `deal_es6_code.js`: Nesting Elimination
- `deal_fake_extends.js`: Pseudo-Inheritance Implementation
- `deal_syntactic_sugar.js`: Module Name to UUID Mapping
- `get_key_uuid.js`: Module Name to UUID Mapping
- `get_start_point.js`: Entry Point Generation
- `util.js`：Utility Function for Javascript