class FileUtils {

	// This function adds the nodes and edges from the dot file to
	// the nodes and edges in the JSON
	// NOTE: If there is any node/edge already present in the JSON 
	// with the same id, we keep the object and add missing attributes 
	// from the node in the dot file
	static addFromDotFile(dotString, confJSON){
		if(!("nodes" in confJSON)){
			confJSON["nodes"] = [];
		}
		if(!("edges" in confJSON)){
			confJSON["edges"] = [];
		}
		// create a graph from dot string so we can work with the graph
		var thisGraph = graphlibDot.read(dotString);

		// create a map from nodeId to obj in the JSON for quick lookup
		var nodeMap = {};
		for (let nodeObj of confJSON["nodes"]){
			nodeMap[nodeObj["id"]] = nodeObj;
		}
		for (const nodeId of thisGraph.nodes()) {
			var thisNode = thisGraph.node(nodeId);
			thisNode["id"] = nodeId;
			if(!(nodeId in nodeMap)){
				nodeMap[nodeId] = thisNode;
				confJSON["nodes"].push(nodeMap[nodeId]);
			}	else {
				Utils.fillDefault(nodeMap[nodeId], thisNode);
			}
		}

		// create a map from edge to obj in the JSON for quick lookup
		var edgeMap = {};
		for(let edgeObj of confJSON["edges"]){
			edgeMap[edgeObj["source"] + " " + edgeObj["target"]] = edgeObj;
		}
		for(const edgeId of thisGraph.edges()){
			var thisEdge = thisGraph.edge(edgeId);
			thisEdge["source"] = edgeId.v;
			thisEdge["target"] = edgeId.w;
			if(!(edgeId.v + " " + edgeId.w in edgeMap)){
				edgeMap[edgeId.v + " " + edgeId.w] = thisEdge;
				confJSON["edges"].push(edgeMap[edgeId.v + " " + edgeId.w]);
			}	else {
				Utils.fillDefault(edgeMap[edgeId.v + " " + edgeId.w], thisEdge);
			}
		}

	}

	// This function adds the functions and loops from the analysis json file
	// to the conf json file
	// NOTE: Any pre-existing functions and loops in the confJSON are removed
	static addFromJSONAnlsFile(anlsJSON, confJSON) {
		// if(!("functions" in confJSON)){
			confJSON["functions"] = [];
		// }
		// if(!("loops" in confJSON)){
			confJSON["loops"] = [];
		// }

		for(let fn of anlsJSON["functions"]){
			fn = FileUtils.prepareAnlsFn(fn);
			confJSON["functions"].push(fn);
		}

		// Now process the loops in the functions 
		for(let fn of anlsJSON["functions"]){
			if("loops" in fn){
				let fnName = fn["name"];
				for(let loop of fn["loops"]){
					let loopToAdd = FileUtils.prepareAnlsLoop(loop, fnName);
					confJSON["loops"].push(loopToAdd);
					if("loops" in loop){
						loopToAdd["loops"] = [];
						for(let childLoop of loop["loops"]){
							loopToAdd["loops"].push(FileUtils.addLoopFromAnls(childLoop, fnName));
						}
					}
				}
			}
		}
		
	} 

	// This function converts the function in the analysis JSON file 
	// to the format in the confJSON file
	static prepareAnlsFn(fn){
		// Make a copy of the object
		fn = JSON.parse(JSON.stringify(fn));
		fn["id"] = fn["name"]; 
		fn["nodes"] = fn["basicblocks"].map(function(bb){
			return "B" + bb["id"];
		});
		// remove the extra properties in fn
		delete fn["basicblocks"];
		delete fn["inlines"];
		delete fn["calls"];
		delete fn["vars"];
		delete fn["loops"];
		return fn;
	}

	// This function converts the loop in the analysis JSON file
	// to the format in the confJSON file
	static prepareAnlsLoop(loop, fnName){
		// Make a copy of the object
		loop = JSON.parse(JSON.stringify(loop));
		loop["id"] = fnName + ":" + loop["name"];
		loop["nodes"] = loop["blocks"].map(function(bb){
			return "B" + bb;
		});
		loop["backedges"] = loop["backedges"].map(function(bkEdge){
			return ["B" + bkEdge["from"], "B" + bkEdge["to"]];
		});
		delete loop["blocks"];
		delete loop["loops"];
		return loop;
	}

	// This function adds the loop from the analysis file recursively 
	// to the conf JSON
	static addLoopFromAnls(loop, fnName){
		let loopToAdd = FileUtils.prepareAnlsLoop(loop, fnName);
		if("loops" in loop){
			loopToAdd["loops"] = [];
			for(let childLoop of loop["loops"]){
				loopToAdd["loops"].push(FileUtils.addLoopFromAnls(childLoop, fnName));
			}
		}
		return loopToAdd;
	}

	// Add the nodes, edges, loops, and functions from the graph json file 
	static addFromGraphJSON(graphJSON, confJSON){
		confJSON["nodes"] = graphJSON["nodes"];
		confJSON["edges"] = graphJSON["edges"];	
		
		if("loops" in graphJSON){
			confJSON["loops"] = graphJSON["loops"];
		}
		if("functions" in graphJSON){
			confJSON["functions"] = graphJSON["functions"];
		}
	}

	// Add the loops and functions from the structures json file
	static addFromStructuresFile(strucJSON, confJSON){
		if("loops" in strucJSON){
			confJSON["loops"] = strucJSON["loops"];
		}	else if("loopAnalysis" in strucJSON){
			confJSON["loopAnalysis"] = strucJSON["loopAnalysis"];
		}
		if("functions" in strucJSON){
			confJSON["functions"] = strucJSON["functions"];
		}
	}

}