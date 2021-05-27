class Filtering { 

  // This function returns the filtered graph from the full graph given the set of nodes to filter on.
  // Uses BFS to retrieve the K-hop graph 
  // Params:
  //  full_graph: the full graph to filter on
  //  setOfNodes: the array of nodes to filter on
  //  numHops: number of hops (K)
  //  minNodes: the minimum number of nodes to retrieve when performing 
  //      K-hop filtering. When this minimum is reached, we stop 
  //      the K hop filtering for next hop.
  //  direction: "up", "down", or "both"
  //    "up" - hops only on predecessors
  //    "down" - hops only on successors
  //    "both" - hops on both direction
  // Returns: a new graph with only the filtered nodes and edges

  // NOTE: Handles hanging nodes and edges, leaf nodes only, 
  // and function and loop filtering

  static getKHopGraph(full_graph, setOfNodes, numHops, minNodes, direction){

    // Perform BFS in the full_graph starting with the input set of nodes in the queue
    // If any edge not in the new graph, store the edge in the new graph

    // If the starting nodes for filtering is empty, 
    // use the first node as starting node
    if(setOfNodes.length == 0){
      setOfNodes = [Filtering.leaves(full_graph)[0]]; 
    }

    var visited = {};

    var queue0 = [];
    var queue1 = [];
    var queues = [queue0, queue1];
    var thisQueue;
    var nextQueue;

    var ctNodes=0;

    // var graphToReturn = graphlibDot.parse("digraph {}");
    var graphToReturn = new graphlib.Graph({ directed: true, compound: true});

    for (var i=0; i<setOfNodes.length; i++){
      visited[setOfNodes[i]] = true;
      queues[0].push(setOfNodes[i]);
      graphToReturn.setNode(setOfNodes[i], full_graph.node(setOfNodes[i]));
      ctNodes++;
    }

    // add all edges in the subgraph. Level 0 has all the nodes and 
    // edges in the subgraph
    Filtering.addSubgraphEdges(full_graph, graphToReturn);

    if(ctNodes >= minNodes){
      Filtering.addFilteredFnLoops(full_graph, graphToReturn);
      return graphToReturn;
    }

    for(var thisLevel = 0; thisLevel < numHops; thisLevel++){

      // console.log("This level " + thisLevel );

      thisQueue = queues[thisLevel%2];
      nextQueue = queues[(thisLevel+1)%2];

      // clear the array while not affecting the reference
      nextQueue.length = 0;

      // console.log("This Queue");
      // console.log(thisQueue.join(" "));

      while (thisQueue.length > 0){
        var this_node = thisQueue.shift();

        // var adj_nodes = full_graph.successors(this_node);
        // Undirected k-hop search
        // var adj_nodes = full_graph.neighbors(this_node);

        var adj_nodes = [];
        var in_nodes = full_graph.predecessors(this_node);
        var out_nodes = full_graph.successors(this_node);

        var out_edges = full_graph.outEdges(this_node);
        var in_edges = full_graph.inEdges(this_node);

        var node_edges = [];

        if(direction == "up"){

          node_edges = in_edges;
          adj_nodes = in_nodes;

        } else if (direction == "down"){

          node_edges = out_edges;
          adj_nodes = out_nodes;

        } else if(direction == "both"){

          // concatenate the two edge lists
          node_edges = out_edges.concat(in_edges);
          adj_nodes = out_nodes.concat(in_nodes);

        }

        for(var i = 0; i<node_edges.length; i++){
          // var this_edge = full_graph._strictGetEdge(node_edges[i]);
          var this_edge = node_edges[i];

          if(!(graphToReturn.hasNode(this_edge.v))){
            graphToReturn.setNode(this_edge.v, full_graph.node(this_edge.v));
            ctNodes++;

          }

          if(!(graphToReturn.hasNode(this_edge.w))){
            graphToReturn.setNode(this_edge.w, full_graph.node(this_edge.w));
            ctNodes++;
          }

          if(!(graphToReturn.hasEdge(this_edge))){
            // graphToReturn.addEdge(this_edge.id, this_edge.u, this_edge.v, full_graph.edge(this_edge.id));
            graphToReturn.setEdge(this_edge, full_graph.edge(this_edge));
          }

          // if(ctNodes >= minNodes){
          //   return graphToReturn;
          // }

        }

        for(var i=0; i<adj_nodes.length; i++){
          if(!visited[adj_nodes[i]]){
            visited[adj_nodes[i]] = true;
            nextQueue.push(adj_nodes[i]);

            // This is already added when adding the edge
            // graphToReturn.addNode(adj_nodes[i], full_graph.node(adj_nodes[i]));

          }
        }

      }

      // NOTE: The number of nodes is checked between hops 
      // To have more control on the number of nodes in the filtered graph, 
      // we can check this for each new node being processed 
      if(ctNodes >= minNodes){
        // add the remaining edges for the current subgraph
        Filtering.addSubgraphEdges(full_graph, graphToReturn);
        Filtering.addFilteredFnLoops(full_graph, graphToReturn);
        return graphToReturn;
      } 

    }

    // add the remaining edges for the current subgraph
    Filtering.addSubgraphEdges(full_graph, graphToReturn);
    Filtering.addFilteredFnLoops(full_graph, graphToReturn);
    return graphToReturn;

  }

  // This function adds the full edges to the subgraph formed by nodes
  // in the input graph
  // Processes the hanging edges here (edges with one node outside the 
  // filtered graph)
  // Params:
  //  full_graph: the full graph to add from
  //  input_graph: the graph to add the edges to

  static addSubgraphEdges(full_graph, input_graph){

    // var nodes = input_graph.nodes();
    var nodes = Filtering.leaves(input_graph);
    
    // clear hanging nodes and edges in the input graph
    input_graph._hangingNodes = {};
    input_graph._hangingEdges = {};

    // go through all nodes in the subgraph
    for(var i=0; i<nodes.length; i++){
    	// go through all the edges of the node
    	var this_node = nodes[i];
    	var inEdges = full_graph.inEdges(this_node);
    	var outEdges = full_graph.outEdges(this_node);
    	var nodeEdges = inEdges.concat(outEdges);

    	for(var j=0; j<nodeEdges.length; j++){
	        // var this_edge = full_graph._strictGetEdge(nodeEdges[j]);
	        var this_edge = nodeEdges[j];

    		// Does this edge have both incident nodes inside the input graph
    		if(input_graph.hasNode(this_edge.v) &&
    			input_graph.hasNode(this_edge.w)){
    			// add this edge if not already in the input graph
    			if(!input_graph.hasEdge(this_edge)){
	    			input_graph.setEdge(this_edge, full_graph.edge(this_edge));
	    		}
    		}	else {
    			// Only one of the incident nodes is inside the subgraph
    			// Add the node not present in the graph as hanging node
    			// and the edge as hanging edge
    			if(input_graph.hasNode(this_edge.v)){
    				Filtering.setHangingNode(input_graph, this_edge.w, full_graph.node(this_edge.w));
    			}	else {
    				Filtering.setHangingNode(input_graph, this_edge.v, full_graph.node(this_edge.v));
    			}
    			Filtering.setHangingEdge(input_graph, this_edge, full_graph.edge(this_edge));
    		}
    	}
    }
  }

  // TODO: numLevels based filtering is not implemented now. (Only default
  // value of -1 is handled i.e. filtering in top level nodes) 
  // Add the loop nodes that intersect the given array of nodes 
  // within numLevels starting from the innermost level. Also adds the outer
  // nodes to the loops (i.e. immediate successor of the loop nodes)
  //  Params:
  //    arrNodes: the array of seed nodes to search the loop nodes
  //    loops: the array of loops from the CFG conf JSON
  //    full_graph: the graph to retreive the outer nodes from
  //      (i.e. successor to loop nodes)  
  //    numLevels: the number of levels to include starting from the 
  //      innermost loop 
  //        1 gets all the innermost loops;
  //        -1 gets all the top most loops
  // Returns: the array of nodes containing the loop nodes that intersect 
  // the given array of nodes within numLevels starting from the innermost level.
  // Also adds the outer nodes to the loops (i.e. immediate successor of the 
  // loop nodes)

  static loopFiltering(arrNodes, loops, full_graph, numLevels = -1){
    // if numLevels == -1 work with all the top level loops
    // Start with the top level loops in the loops array 
    // Precompute the modified height of the loops in the loop tree
    // where height = (min height of children + 1) 
    // Leaf node has the height 0
    // See if the loops with height <= (numLevels - 1) intersects the 
    // setOfNodes. Start from the top level loops.
    // If these levels do not intersect then the loops inside it don't 
    // intersect as well
    // If these levels intersect, then we include it in the returned graph 
    // otherwise we dont include. In either case we terminate after checking
    // this level. 

    // NOTE: We are only getting the top level loops for now
    // For the loopify algorithm to work, we also need the outer nodes
    // which are the nodes immediately outside of the loop
    // i.e. successors to one of the loop nodes
    
    if(!loops){
      return arrNodes;
    }

    let setOfNodes = new Set(arrNodes);
    let setNodesWithLoops = new Set(arrNodes);

    if(numLevels == -1){
      // Go through all the top level loop nodes, see if they intersect 
      // with the set of nodes
      // If they intersect add these nodes to the set of nodes
      // as well as the outer nodes
      for(let loop of loops){
        let loopNodes = new Set(loop["nodes"]);
        let isIntersects = Utils.isIntersects(setOfNodes, loopNodes);
        if(isIntersects){
        	// add these nodes to the set
        	for(let nodeId of loopNodes){
          		setNodesWithLoops.add(nodeId);
          		// add the successors of this node as well
          		for(let succNodeId of full_graph.successors(nodeId)){
	         		setNodesWithLoops.add(succNodeId);
	         	}
      		}
      			
        }
        
      }
    }
    return Array.from(setNodesWithLoops);

  }

  // Returns the leaf nodes in the graph
  static leaves(graph){
    var leafNodes = graph.nodes().filter(function(node){
        return graph.children(node).length == 0;
      });
    return leafNodes;
  }
  
  // Returns the non-leaf nodes in the graph
  static getNonLeaves(graph){
    var nonLeaves = graph.nodes().filter(function(node){
        return graph.children(node).length > 0;
      });
    return nonLeaves;
  }

  // 
  static setHangingNode(graph, nodeId, nodeVal){
    if(!(nodeId in graph._hangingNodes)){
      graph._hangingNodes[nodeId] = nodeVal;
    }
  }

  static setHangingEdge(graph, edgeObj, edgeVal){
    if(!(edgeObj.v + " " + edgeObj.w in graph._hangingEdges)){
      graph._hangingEdges[edgeObj.v + " " + edgeObj.w] = edgeVal;
    }
  }

  // Adds the functions and loops along with the parent child relationship
  // in the filtered graph from the full graph
  static addFilteredFnLoops(full_graph, filtered_graph){

    // Start with the nodes in the filtered graph 
    // They are leaf nodes i.e. do not contain any function or loops

    // Iterate through these nodes and store their parents in a set
    // of nodes to process
    // Go through this set and process the parent nodes
    // When processing, add their parent to the set to process if not 
    // processed already 
    // Continue till we see new nodes

    var processed = new Set(); 
    var toProcess = new Set(filtered_graph.nodes());

    for(let nodeId of toProcess){
    	if(full_graph.parent(nodeId)){
	  		let parentId = full_graph.parent(nodeId);
	    	if(!processed.has(parentId)){
	    		toProcess.add(parentId);
	  		}
		    // add the parent node and the parent relationship 
		    filtered_graph.setNode(parentId, full_graph.node(parentId));
		    filtered_graph.setParent(nodeId, parentId);
		}
      // set this node as processed so it does not get added again to the set 
      processed.add(nodeId);
    }
  	
    // For all nodes in the full graph
    // Remove the cluster_ prefix for the function ids
    // Set the overlap flag for non-leaf nodes to none
    // TODO: Remember the node ids inside the graphlib graph cannot be changed
    // unless the node is deleted and added back with the new id
    // We are changing the "id" only inside the node obj 
    // and not the node id of the graph nodes
    // This needs to be handled separately
    for(let nodeId of Filtering.getNonLeaves(full_graph)){
  		let nodeObj = full_graph.node(nodeId); 
      // set overLapType to none
  		nodeObj["overlapType"] = OverlapTypes.none;
  		// if the node is of type function
      if(nodeObj["type"] == nodeTypes.fn){
        nodeObj["id"] = Utils.removeStrPrefix(nodeObj["id"], "cluster_");
      }
  	}

    let leafNodes = new Set(Filtering.leaves(filtered_graph));

    // After the node overlap flags are reset for all non-leaf nodes in the 
    // full graph,
    // Go through the non-leaf nodes in the filtered graph
    // Set the flag to full/partial depending on whether the filtered graph
    // contains all nodes in the non-leaf node
    for(let nodeId of Filtering.getNonLeaves(filtered_graph)){
    	let nodeObj = filtered_graph.node(nodeId);
      let nodeSet = new Set(nodeObj["nodes"]);
    	let isIntersects = Utils.isIntersects(leafNodes, nodeSet);
    	let overlapType;
    	if(isIntersects){
    		overlapType = OverlapTypes.partial;
    	}	else {
    		overlapType = OverlapTypes.none;
    	}
    	let isSubset = Utils.isSubset(leafNodes, nodeSet);
    	if(isSubset){
    		overlapType = OverlapTypes.full; 
    	}
    	nodeObj["overlapType"] = overlapType;
    	if(nodeObj["type"] == nodeTypes.fn){
    		if(overlapType == OverlapTypes.full){
    			nodeObj["id"] = Utils.addStrPrefix(nodeObj["id"], "cluster_");
    		}
    	}
    }
  }

  //TODO:
  // Add the function nodes that intersect the given array of nodes 
  //  Params:
  //    arrNodes: the array of seed nodes to search the function nodes
  //    functions: the array of functions from the CFG conf JSON
  // Returns: the array of nodes containing the function nodes that intersect 
  // the given array of nodes
  static fnFiltering(arrNodes, functions){

  }

  // TODO:
  // Create a subgraph containing the given set of nodes from the full graph.
  // Also add the loops and functions and the hanging nodes and edges.
  // Use the get khop graph function as reference 
  static getSubGraphFromNodes(arrNodes, full_graph){
    
  }

  
 
}

