class GraphUtils {

	// Returns the id of the function that the node belongs to (if exists) 
	// Returns null otherwise
	static findFnforNode(nodeId, graph){
		var currNodeId = nodeId;
		while(graph.parent(currNodeId)){
			currNodeId = graph.parent(currNodeId);
		}
		if(graph.node(currNodeId).type == nodeTypes.fn){
			return currNodeId;
		} 
		return null;
	}

	// Returns the id of the immediate loop containing the node (if exists)
	// Returns null otherwise
	static findLoopForNode(nodeId, graph){
		if(graph.parent(nodeId)){
			var parentId = graph.parent(nodeId);
			if(graph.node(parentId).type == nodeTypes.loop){
				return parentId;
			}
		}
		return null;
	}

	// Returns the id of the top level loop containing the node (if exists) 
	// Returns null otherwise
	static findTopMostLoopForNode(nodeId, graph){
		var currNodeId = nodeId;
		while(graph.parent(currNodeId)){
			currNodeId = graph.parent(currNodeId);
			if(graph.node(currNodeId).type == nodeTypes.loop && 
				graph.node(graph.parent(currNodeId)).type != nodeTypes.loop ){
				return currNodeId;
			}
		}
		return null;
	}

	// Creates an updated graph by adding or removing auxiliary nodes
	// based on the parameters provided.
	// NOTE: Functions with loops cannot be auxiliary nodes
	// NOTE: Aux nodes are only proposed for functions now
	// An auxiliary node is a single node replacing a function (with its nodes) 
	// based on the the parameters provided. The node is duplicated across the 
	// graph to simplify the graph layout.
	// NOTE: The auxiliary nodes are duplicated across the graph
	// whenever we encounter an edge between an aux node and non aux node
	// Params:
	//	g: the filtered graph
	//  inDegThresh: the threshold for incoming edges i.e. minimum number
	//		of edges coming to the subgraph
	// 	outDegThresh: the threshold for outgoing edges i.e. minimum number
	//		of edges going out of the subgraph
	//	auxList: the array of aux nodes
	//	nonAuxList: the array of non-aux nodes
	//	minSubgraphSize: the minimum subgraph size to be considered aux nodes 
	//  maxSubgraphSize: the maximum subgraph size to be considered aux nodes 
	//	isFunctionOnly: only functions can be auxiliary nodes for now
	// Returns the graph with updated auxiliary nodes
	static updateAuxNodes(g, inDegThresh, outDegThresh,
		auxList, nonAuxList, minSubgraphSize, maxSubgraphSize, 
		hangingNodes, hangingEdges, isFunctionOnly=true) {

		// Create a final aux node list
		// Copy the function names from input aux list if it exists in 
		// the filtered graph
		let finalAuxList = [];
		for(let fnId of auxList){
			if(g.hasNode(fnId)){
				finalAuxList.push(fnId);
			}
			else if(g.hasNode(Utils.addStrPrefix(fnId, "cluster_"))){
				finalAuxList.push(Utils.addStrPrefix(fnId, "cluster_"));
			}
		}
		
		// create a copy of the graph
		let graph_with_aux_nodes = graphlibDot.read(graphlibDot.write(g));

		// get the function nodes  
		// Among the function nodes make sure that it doesnt contain any loop
		// As well as make sure that it isn't part of the nonAuxList
		let candidateFns = g.nodes().filter(function(nodeId){
			
			// remove if function already in nonAuxList 
			if(nonAuxList.includes(Utils.removeStrPrefix(nodeId, "cluster_"))){
				return false;
			}
			// Also remove if already in auxList
			// Since they are already in the final list
			if(auxList.includes(Utils.removeStrPrefix(nodeId, "cluster_"))){
				return false;
			}
			let nodeObj = g.node(nodeId);
			let children = g.children(nodeId);
			if(nodeObj["type"] !== nodeTypes.fn){
				return false;
			}
			for(let childId of children){
				if(g.node(childId)["type"]	=== nodeTypes.loop){
					return false;
				}
			}  
			return true; 
		});

		// Now lets start filtering these subgraphs based on the input 
		// parameters
		for(let fnId of candidateFns){
			let fnObj = g.node(fnId);
			let leafNodesNum = Filtering.leaves(g).length;
			// convert percentage to numbers if needed
			if(typeof minSubgraphSize !== "number"){
				minSubgraphSize = parseInt(minSubgraphSize,10);
				minSubgraphSize = Math.round(minSubgraphSize * leafNodesNum / 100);
			}
			if(typeof maxSubgraphSize !== "number"){
				maxSubgraphSize = parseInt(maxSubgraphSize,10);
				maxSubgraphSize = Math.round(maxSubgraphSize * leafNodesNum / 100);
			}
			let fnLeaves = GraphUtils.getLeavesForNode(g, fnId);
			// If the function size is less than min or greater than max size,
			// ignore the function
			if(fnLeaves.length < minSubgraphSize || fnLeaves.length > maxSubgraphSize){
				continue;
			}

			let inDegree = GraphUtils.computeSubgraphDegree(g, fnLeaves, "in");
			let outDegree = GraphUtils.computeSubgraphDegree(g, fnLeaves, "out");
			if(inDegree >= inDegThresh && outDegree >= outDegThresh){
				finalAuxList.push(fnId);
			}
		}

		// For the functions that pass the criteria, 
		// remove the function nodes and replace them with their auxiliary nodes
		for(let fnId of finalAuxList){
			GraphUtils.removeNodeRecursive(graph_with_aux_nodes, fnId);
			GraphUtils.addAuxNode(graph_with_aux_nodes, fnId, finalAuxList, g);
		}

		GraphUtils.updateHangingNodesEdges(graph_with_aux_nodes, hangingNodes, hangingEdges);

		return graph_with_aux_nodes;

	}

	// Returns the leaf nodes that are descendents of the input node
	static getLeavesForNode(g, nodeId){
		let leaves = [];
		// Traverse the graph and get all the leaf nodes
		// Also make sure it is not a hanging node or other special node
		let children = g.children(nodeId);
		for(let childId of children){
			if(g.children(childId).length > 0 ){
				GraphUtils.addLeavesForNode(g, childId, leaves);
			}
			else if(g.node(childId)["type"] !== nodeTypes.hangingNode){
				leaves.push(childId);
			}
		}
		return leaves;
	}

	// Recursively add the leaf nodes
	static addLeavesForNode(g, nodeId, leaves){
		for(let childId of g.children(nodeId)){
			if(g.children(childId).length > 0 ){
				GraphUtils.addLeavesForNode(g, childId, leaves);
			}
			else if(g.node(childId)["type"] !== nodeTypes.hangingNode){
				leaves.push(childId);
			}
		}
	}


	// Computes the degree of the subgraph with respect to the nodes outside it
	// Params:
	//	g: the graph
	// 	nodeList: the array of nodeIds forming the subgraph
	// 	degType: can be one of "in" or "out" 
	// Returns the in degree or out degree 
	// 	based on the degType parameter
	static computeSubgraphDegree(g, nodeList, degType){
		let degree = 0;
		for(let nodeId of nodeList){
			let neighbors;
			if(degType === "in"){
				// take the predecessors 
				neighbors = g.predecessors(nodeId);
			}	else if(degType === "out"){
				// take the successors
				neighbors = g.successors(nodeId);
			}
			// take the set difference between the neighbors and the node list
			degree += Utils.difference(new Set(neighbors), new Set(nodeList)).size;
		}
		return degree;
	}

	// Remove a node recursively (remove the node and its descendents)
	static removeNodeRecursive(g, nodeId){
		let children = g.children(nodeId);
		g.removeNode(nodeId);
		for(let childId of children){
			GraphUtils.removeNodeRecursive(g, childId);	
		}
	}

	// Add this aux node to the graph
	// Duplicate the node across the graph whenever there is an edge between
	// the aux function node and non-aux node
	// NOTE: Ignores the edges between aux nodes 
	// Params: 
	//	graph_with_aux_nodes: the graph to add the aux node to
	//	nodeId: the nodeId of the aux function 
	//	auxNodeList: the list of all aux nodes (Needed to ignore the edges 
	//		between the aux nodes)
	//	orig_graph: the filtered graph (original) without any aux node 
	static addAuxNode(graph_with_aux_nodes, nodeId, auxNodeList, orig_graph){
		let auxNodePrefix = Utils.removeStrPrefix(nodeId, "cluster_");
		let auxNodeLabel = auxNodePrefix;
		let labelSizeThresh = 14;
		if(auxNodeLabel.length > labelSizeThresh){
			auxNodeLabel = auxNodeLabel.substr(0, labelSizeThresh-3);
			auxNodeLabel += "...";
		}
		auxNodePrefix = "aux" + auxNodePrefix;
		let leafNodes = GraphUtils.getLeavesForNode(orig_graph, nodeId);
		let counter = 0;
		let newNodeId;
		for(let leafNodeId of leafNodes){
			let preds = orig_graph.predecessors(leafNodeId);
			let succs = orig_graph.successors(leafNodeId);
			let nodeObj;
			for(let predId of preds){
				let parent = GraphUtils.findFnforNode(predId, orig_graph);
				if(!parent || !(auxNodeList.includes(parent))){

					// Check if an edge already exists between the predId and
					// the aux node representing the function
					if(GraphUtils.isAuxEdgeExists(graph_with_aux_nodes, predId, auxNodePrefix)){
						let result = GraphUtils.getAuxNode(graph_with_aux_nodes, predId, auxNodePrefix);
						let edgeDir = result.edgeDir;
						let auxNodeId = result.auxNodeId;
						if(edgeDir === "out"){
							graph_with_aux_nodes.setEdge(predId, auxNodeId, {
								type: edgeTypes.auxEdge,
								style: "solid",
								color: "black",
								penwidth: 0.5,
								arrowsize: 0.75
							});
						}
						continue;
					}
					
					newNodeId = auxNodePrefix + counter;
					nodeObj = {
						type: nodeTypes.auxNode,
						id: newNodeId,
						// label: "",
						label: auxNodeLabel,
						// xlabel: auxNodeLabel,
						tooltip: "Aux Node: " 
							+ Utils.removeStrPrefix(auxNodePrefix, "aux")
							+ "\nNode Count: " + leafNodes.length, 
						style: "dotted, filled",
						shape: "box",
						fillcolor: "white",
						// fixedsize: true,
						// width: 1,
						// height: 0.3,
						fontsize: 12.0
						// forcelabels: true

					};
					graph_with_aux_nodes.setNode(newNodeId, nodeObj);
					// graph_with_aux_nodes.setParent(newNodeId, parent);
					graph_with_aux_nodes.setEdge(predId, newNodeId, {
						type: edgeTypes.auxEdge,
						style: "solid",
						color: "black",
						penwidth: 0.5,
						arrowsize: 0.75
					});
					counter++;
				}
			}

			for(let succId of succs){
				let parent = GraphUtils.findFnforNode(succId, orig_graph);
				if(!parent || !(auxNodeList.includes(parent))){

					if(GraphUtils.isAuxEdgeExists(graph_with_aux_nodes, succId, auxNodePrefix)){
						let result = GraphUtils.getAuxNode(graph_with_aux_nodes, succId, auxNodePrefix);
						let edgeDir = result.edgeDir;
						let auxNodeId = result.auxNodeId;
						if(edgeDir === "in"){
							graph_with_aux_nodes.setEdge(auxNodeId, succId, {
								type: edgeTypes.auxEdge,
								style: "solid",
								color: "black",
								penwidth: 0.5,
								arrowsize: 0.75
							});
						}
						continue;
					}
					
					newNodeId = auxNodePrefix + counter;
					nodeObj = {
						type: nodeTypes.auxNode,
						id: newNodeId,
						// label: "",
						label: auxNodeLabel,
						// xlabel: auxNodeLabel,
						tooltip: "Aux Node: " 
							+ Utils.removeStrPrefix(auxNodePrefix, "aux")
							+ "\nNode Count: " + leafNodes.length, 
						style: "dotted, filled",
						shape: "box",
						fillcolor: "white",
						// fixedsize: true,
						// width: 1,
						// height: 0.3,
						fontsize: 12.0
						// forcelabels: true
					};
					graph_with_aux_nodes.setNode(newNodeId, nodeObj);
					// graph_with_aux_nodes.setParent(newNodeId, parent);
					graph_with_aux_nodes.setEdge(newNodeId, succId, {
						type: edgeTypes.auxEdge,
						style: "solid",
						color: "black",
						penwidth: 0.5,
						arrowsize: 0.75
					});
					counter++;
				}
			}

		}	
	}

	// Check if an edge already exists between the node and the aux
	// node representing the function
	static isAuxEdgeExists(graph_with_aux_nodes, nodeId, auxNodePrefix){
		let neighbors = graph_with_aux_nodes.neighbors(nodeId);
		for(let neighbor of neighbors){
			if(neighbor.startsWith(auxNodePrefix)){
				return true;
			}
		}
		return false;
	}

	// Returns the node id of the aux node which has an edge with the 
	// given node (for the given function represented by auxNodePrefix) 
	// Params:
	//		graph_with_aux_nodes: the graph containing the aux nodes
	//		nodeId: the given node
	// 		auxNodePrefix: the prefix for aux node that represents the function
	// Returns the node Id of the aux node as well as the edge direction with 
	// respect to the aux node
	// edgeDir is either "in" or "out" depending on if it is an 
	// inedge or outedge to the aux node
	// Returns null if no such aux node found
	static getAuxNode(graph_with_aux_nodes, nodeId, auxNodePrefix){
		let succs = graph_with_aux_nodes.successors(nodeId);
		let preds = graph_with_aux_nodes.predecessors(nodeId);
		for(let succId of succs){
			if(succId.startsWith(auxNodePrefix)){
				return {
					edgeDir: "in",
					auxNodeId: succId
				};
			}
		}
		for(let predId of preds){
			if(predId.startsWith(auxNodePrefix)){
				return {
					edgeDir: "out",
					auxNodeId: predId
				};	
			}
		}
		return null;
	}
		
	// Update the hanging nodes and edges after the aux nodes are added
	static updateHangingNodesEdges(graph_with_aux_nodes, hangingNodes, hangingEdges){
		// null check
		if(!hangingNodes || !hangingEdges){
			return;
		}

		// Check if all the hanging nodes and edges still exist
		for(let edgeId of Object.keys(hangingEdges)){
			let v = edgeId.split(" ")[0];
			let w = edgeId.split(" ")[1];

			// If both nodes of the hanging edge are not in the new graph,
			// delete the edge and the hanging node
			if(!graph_with_aux_nodes.hasNode(v) && 
					!graph_with_aux_nodes.hasNode(w)){
				delete hangingEdges[edgeId]; 
				// Since this edge is deleted, delete the hanging node
				// associated with it 
				if(v in hangingNodes){
					delete hangingNodes[v];
				} else if(w in hangingNodes){
					delete hangingNodes[w];
				}
			}
		}
	}

}