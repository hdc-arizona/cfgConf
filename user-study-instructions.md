Welcome to the evaluation of _CFGConf_. Thank you for taking the time to partipate in the evaluation. Your participation will help us gather valuable feedback to improve the language and the system in the future versions. 

This study has been approved by the University of Arizona Institutional Review Board (IRB). For more details, view the consent information for the [study](irb/Consent-Information-Study.pdf) and the accompanying [survey](irb/Consent-Information-Survey.pdf). Only Sabin Devkota will have access to data regarding whether or not you choose to participate. The other researchers analyzing the results (i.e., Kate Isaacs) will only have access to anonymized data and will not know who participated.

Instead of conducting the study through a remote video session, we are conducting the study offline. You will be asked:

1. To download _CFGConf_ and perform the tasks described below to familiarize yourself with the system.
2. Send us the _CFGConf_ files JSON files you create in the process.
3. Fill out a [survey](https://forms.gle/qgohazefPyHb5C1U6) regarding your experience.

You do not need to perform the tasks in one continuous session. You may leave and return. We estimate all tasks and feedback should take about an hour.

We are evaluating the usefulness of our language/system and **not** your knowledge on CFGs or graph drawing. You can refer to the [CFGConf wiki](https://github.com/devkotasabin/cfgConf/wiki) throughout. If you get stuck or have any questions during or after, please contact devkotasabin@email.arizona.edu.


## Setting up CFGConf

_CFGConf_ is a JSON-based language for visualizing Control Flow Graphs (CFGs) as node-link diagrams. CFGConf is designed to make it convenient to generate CFG-specific drawings with just a few lines of JSON code. Features include filtering the graph to nodes and loops of interest and automatically collapsing and de-emphasizing uninteresting functions.

First, follow the [setup guide](https://github.com/devkotasabin/cfgConf/wiki/Setup-Guide) to create the Hello World example to verify _CFGConf_ is working on your system.


### Troubleshooting

**init.json**: Apart from syntax errors, the most common error is caused by the `init.json` file not pointing to the correct JSON file. For more on troubleshooting, refer to the [troubleshooting section](https://github.com/devkotasabin/cfgConf/wiki/Setup-Guide#troubleshooting).

**syntax errors**: If your CFG does not load after 15 seconds, you may want to validate your JSON file. See [**validating your JSON file**](https://github.com/devkotasabin/cfgConf/wiki/Setup-Guide#optional-validate-your-cfgconf-json-files-with-schema-validator) to find out whether the syntax is correct and the JSON file conforms to the schema.



## Tasks

Please perform the tasks below. Each will ask you to create a _CFGConf_ JSON file. Please save these files and send them to us after the study.

Related files for each task are located in `cfgConf > static > CFGConf > files > tasks`.

Throughout these tasks, you can access any resources, including:

- the [quickstart guide](https://github.com/devkotasabin/cfgConf/wiki/Quickstart-Guide) with  common usage examples of _CFGConf_ 
- the [reference guide](https://github.com/devkotasabin/cfgConf/wiki/Reference-Guide) which describes all available keys


### Task 1: 
Replicate the drawing below i.e create a _CFGConf JSON file_ that creates the provided drawing.
<p align="center">
  <img src="static/CFGConf/files/tasks/task1/graph.png" alt="result" width="20%" align="middle"/>
</p>

### Task 2:

#### Step 2.1
Produce a drawing of the graph from the dot file `t2.dot`. Loops inside the graph are provided in the file `t2_loops.json`. 

#### Step 2.2
Compare the resulting drawing from _CFGConf_ to the drawing produced using _dot graphviz_ on the file `t2.dot`. **These drawings will look different.**

To produce a pdf file using _graphviz_, you can run the following command in the terminal which will output the file `t2.pdf` in the same directory.
```
dot -Tpdf t2.dot -o t2.pdf
```
You do not need to submit this file.

### Task 3:

#### Step 3.1
Produce a filtered drawing using the graph specified in `ltimes.dot` where only node ids are shown inside the nodes, rather than disassembly like the previous example. 

A _dyninst analysis file_ named `ltimes.json` with the functions and loops is also provided. 

Use the following set of nodes as the starting nodes for filtering:
```
"B1973", "B1974", "B1978", "B1986", "B1993", "B4052", "B4183", "B4205", "B4206", "B4430"
```
The filter should be limited to nodes within **3 hops** or a rendered graph of **25 nodes**, whichever comes first. 

#### Step 3.2
Turn off the filtering and note the output.

### Task 4:
Produce a filtered drawing using the same graph files `ltimes.dot` and `ltimes.json` where all the functions are collapsed except the functions containing the loops and the function with the name `__kmpc_fork_call`.

Use the following set of nodes as the starting nodes for filtering:
```
"B3805", "B4451"
```


## Thank you
Thats it! We are done with the tasks. Please fill out the survey regarding _CFGConf_ below:

### <a href="https://forms.gle/qgohazefPyHb5C1U6">Please fill out the survey here</a>

You may upload your JSON files through this survey or email them to devkotasabin@email.arizona.edu

Thank you for giving your valuable time for the evaluation of _CFGConf_. We look forward to your feedback.
