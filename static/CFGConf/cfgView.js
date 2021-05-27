class CFGView {

  svgElem;
  // map from the graph nodes and edges to DOM nodes 
  nodeSVGMap = {};
  edgeSVGMap = {};
  // variables related to rendering the graph 
  renderVars = {
    "inner": null,
    "zoom": null,
    "isBrushEnabled": false,
    "brushInitialized": false
  };

  // reference to the model
  model;
  svgId;
  divId;

  _hoverEvent;
  _clickEvent;
  _brushStartEvent;
  _brushEndEvent;

  constructor(model, svgId, divId){
    this.model = model;
    this.svgId = svgId;
    this.divId = divId;
  }

  // Render the graph using viz.js
  _render(model, svgId, divId, thisObj){
    
    loopify_dagre.init(model.filteredDotString, model.filteredGraph, model["CFGConfJSON"]);
    // // loopify_dagre.init(graphlibDot.write(graph_hg_edges), graph_hg_edges);
    // // loopify_dagre.init(graphlibDot.write(model.graphWithAuxNodes), 
    // // model.graphWithAuxNodes);
    
    // var modifiedDotFile = loopify_dagre.modifiedDotFile;
    let modified_graph = loopify_dagre.modified_graph;

    //remove port routing for edges whose incident nodes
    // belong to different functions
    thisObj.removeInterFuncPortRouting(modified_graph);

    var graphWithAuxNodes = thisObj.applyAuxRules(modified_graph, 
    	model["CFGConfJSON"]["rendering"]["function"]["collapsingRules"], 
    	model.filteredGraph._hangingNodes,
    	model.filteredGraph._hangingEdges);
    console.log("Graph with Aux Nodes: ");
    console.log(graphWithAuxNodes);
    model.graphWithAuxNodes = graphWithAuxNodes;
    
    // let graph_hg_edges = thisObj.renderHangingEdges(model.filteredGraph);
	// let graph_hg_edges = thisObj.renderHangingEdges(modified_graph, 
	//   	model.filteredGraph._hangingNodes, model.filteredGraph._hangingEdges);
	let graph_hg_edges = thisObj.renderHangingEdges(graphWithAuxNodes, 
	  	model.filteredGraph._hangingNodes, model.filteredGraph._hangingEdges);  	    
    let modifiedDotFile = graphlibDot.write(graph_hg_edges);
    console.log(modifiedDotFile);

    var viz = new Viz();
    // viz.renderSVGElement(model.dotString)
    // viz.renderSVGElement(model.filteredDotString)
    viz.renderSVGElement(modifiedDotFile)
    .then(function(svgElem) {
      // Remove any svg elem if already exists
      d3.select("#" + svgId).remove();
      svgElem.id = svgId;
      thisObj.svgElem = svgElem;
      document.getElementById(divId).appendChild(svgElem);
      thisObj.setupZoom(svgId, thisObj);
      thisObj.createSVGNodeEdgeMaps(svgElem, thisObj);
      
      // highlight the selected nodes
      thisObj.highlightSelNodes(model["CFGConfJSON"]["filtering"]["selectedNodes"], thisObj.nodeSVGMap);

      if(model["CFGConfJSON"]["rendering"]["loop"]["background"]){
        // highlights back edges as well
        loopify_dagre.addBackground("bgFill", thisObj.svgId, thisObj.nodeSVGMap, thisObj.edgeSVGMap);
      }
      
      thisObj.updateHgNodeIcon(graph_hg_edges, thisObj.nodeSVGMap, thisObj.edgeSVGMap, thisObj);
      
    })
    .catch(error => {
      // Create a new Viz instance (@see Caveats page for more info)
      viz = new Viz();
      // Possibly display the error
      console.error(error);
      alert(error);
    });
  
  }

  renderGraph(){
    this._render(this.model, this.svgId, this.divId, this);
  };

  // Render the hanging nodes and edges 
  // renderHangingEdges(graph, svgElem){
  renderHangingEdges(graph, hangingNodes, hangingEdges){

  	if(!hangingNodes || !hangingEdges){
  		return graph;
  	}

  	// create a copy of the graph and modify it  
  	let graphToReturn = graphlibDot.read(graphlibDot.write(graph));
  	// NOTE: Graph writing will lose the information about hanging nodes
  	// and edges. So, we pass these parameters as well
  	
  	// Stores the hanging predecessors and successors of the graph nodes
  	let predHanging = {};
  	let succHanging = {};

  	// go through the hanging edges 
  	// 	for the endpoint that is part of the main graph 
	// 		add adjacent node to the list of predHanging or succHanging 
	//      depending on if the adjacent node is predecessor or successor
  	for (const edgeId of Object.keys(hangingEdges)){
  		// the edgeId is of the form "v w" 
        let v = edgeId.split(" ")[0];
        let w = edgeId.split(" ")[1];
        if(v in hangingNodes){
			if(!predHanging[w]){
				predHanging[w] = new Set();
			}	
			predHanging[w].add(v);
		} else {
			if(!succHanging[v]){
				succHanging[v] = new Set();
			}	
			succHanging[v].add(w);
		}
    }
  	
  	// go through the nodes in the graph
  	for(const nodeId of Filtering.leaves(graph)){
  		// 	Create aggregate nodes with the count and nodeIds of all the 
  		//  predHanging and succHanging nodes
  		// 	Then add these to the nodes and edges of the graph
  		// 	Make these node sizes small by trying out various width and 
  		//  height attributes
  		// 	Set fixedsize to true
  		// 	Change the icon to stacked ellipse icon if its an aggregate node
  		// 	Otherwise use a single ellipse

  		// 	Also try edges with no-constraint and observe the differences  	
  		if(predHanging[nodeId]){
  			let predId = "pred" + nodeId;
  			let nodes = Array.from(predHanging[nodeId]);
  			let nodeObj = {
  				shape: "oval",
  				style: "solid, filled",
          fillcolor: "white",
  				penwidth: 0.7,
  				id: predId,
  				width: 0.3, 
  				height: 0.1, 
  				fixedsize: true, 
  				type: nodeTypes.hangingNode, 
  				count: predHanging[nodeId].size,
  				nodes: nodes,
  				fontsize: 10.0,
  				forcelabels: true,
          label: ""
  			};

  			if(predHanging[nodeId].size === 1){
  				nodeObj["xlabel"] = "";
          nodeObj["tooltip"] = "Nodes: " + nodes.join(', ');
  			} else {
  				nodeObj["xlabel"] = predHanging[nodeId].size;
          nodeObj["tooltip"] = "Count: " + predHanging[nodeId].size +
            "\nNodes: " + nodes.join(', ');
  			}
  			graphToReturn.setNode(predId, nodeObj);
  			let parent = GraphUtils.findFnforNode(nodeId, graph);
  			if(parent) {
  				graphToReturn.setParent(predId, parent);
  			}
  			// Also try edges with no-constraint and observe the differences  	
  			graphToReturn.setEdge(predId, nodeId, 
  				{
  					color: "black", 
  					style: "solid",
  					penwidth: 0.5,
            arrowsize: 0.75,
  					type: edgeTypes.hangingEdge 
  				});
  			// graphToReturn.setEdge(predId, nodeId, 
  			// 	{
  			// 		color: "black", 
  			// 		style: "solid",
  			// 		penwidth: 0.5,
        //    arrowsize: 0.75,
  			// 		type: edgeTypes.hangingEdge, 
  			// 		constraint: false
  			// 	});
  			
  		}

  		if(succHanging[nodeId]){
  			let succId = "succ" + nodeId;
  			let nodes = Array.from(succHanging[nodeId]);
  			let nodeObj = {
  				shape: "oval",
  				style: "solid, filled",
          fillcolor: "white",
  				penwidth: 0.7,
  				id: succId,
  				width: 0.3, 
  				height: 0.1, 
  				fixedsize: true, 
  				type: nodeTypes.hangingNode, 
  				count: succHanging[nodeId].size,
  				nodes: nodes,
  				fontsize: 10.0,
  				forcelabels: true,
          label: ""
  			};
  			if(succHanging[nodeId].size === 1){
  				nodeObj["xlabel"] = "";
          nodeObj["tooltip"] = "Nodes: " + nodes.join(', ');
  			} else {
  				nodeObj["xlabel"] = succHanging[nodeId].size;
          nodeObj["tooltip"] = "Count: " + succHanging[nodeId].size 
            + "\nNodes: " + nodes.join(', ');	 
  			}
  			graphToReturn.setNode(succId, nodeObj);
  			let parent = GraphUtils.findFnforNode(nodeId, graph);
  			if(parent) {
  				graphToReturn.setParent(succId, parent);
  			}

  			// Also try edges with no-constraint and observe the differences  	
  			graphToReturn.setEdge(nodeId, succId, {
  					color: "black", 
  					style: "solid",
  					penwidth: 0.5,
            arrowsize: 0.75,
  					type: edgeTypes.hangingEdge 
  				});
  			// graphToReturn.setEdge(nodeId, succId, {
  			// 		color: "black", 
  			// 		style: "solid",
  			// 		penwidth: 0.5,
        //    arrowsize: 0.75,
  			// 		type: edgeTypes.hangingEdge, 
  			// 		constraint: false
  			// 	});
  		}
  		
  	}

    return  graphToReturn;

  };

  // Update the properties nodeSVGMap and edgeSVGMap to store the 
  // references for DOM nodes for graph nodes and edges
  createSVGNodeEdgeMaps(svgElem, thisObj){
    thisObj.nodeSVGMap = {};
    thisObj.edgeSVGMap = {};
    let svg = d3.select("#" + thisObj.svgId);
    // The id is the nodeId
    svg.selectAll("g.node").each(function(){
      let thisNode = d3.select(this); 
      thisObj.nodeSVGMap[thisNode.attr("id")] = thisNode;
    });

    // The title is of the form "v:port->w:port" where v and w are nodeIds
    // After filtering out the ports we store the edge id in the form of
    // "v->w"

    // Handle the case of aux nodes with function names which can 
    // have multiple colons (:)  
    svg.selectAll("g.edge").each(function(){
      let thisEdge = d3.select(this);
      let title = thisEdge.select("title").text();
      
      let v = title.split("->")[0];
      let w = title.split("->")[1];
      let firstColonPos;
      // NOTE: If there are one or two characters after the : sign, then 
      // assume it is a port
      // TODO: Use regex based or more sophisticated way to detect if
      // the colon specifies the port or is part of the node id
      if(v.length > 2){
        firstColonPos = v.indexOf(":");
        if(firstColonPos >= v.length - 3 && firstColonPos < v.length - 1){
        	v = v.split(":")[0];
        }
      }
      
      if(w.length > 2){
        firstColonPos = w.indexOf(":");
        if(firstColonPos >= w.length - 3 && firstColonPos < w.length - 1){
        	w = w.split(":")[0];
        } 
      }

      // let v = title.split("->")[0].split(":")[0];
      // let w = title.split("->")[1].split(":")[0];
      thisObj.edgeSVGMap[v + "->" + w] = thisEdge;
    });
    console.log(thisObj.nodeSVGMap);
    console.log(thisObj.edgeSVGMap);
  };

  // Setup the zoom levels for the visualization
  setupZoom(svgId, thisObj){

    var svg = d3.select('#' + svgId);
    var inner = d3.select('#' + svgId + ' g');
    var bbox = svg.node().getBBox();  
    // getBBox gives the bounding box of the enclosed elements. 
    // Its width and height can be set to a different value.

    var graph_svg_width = bbox.width;
    var initialScale = parseInt(svg.style("width"), 10) / graph_svg_width;
    
    var zoom = thisObj.renderVars.zoom = d3.behavior.zoom().on("zoom", function() {
      inner.attr("transform", "translate(" + d3.event.translate + ")" +
                                  "scale(" + d3.event.scale + ")");
    });
    
    svg.call(zoom).on("dblclick.zoom", null);

    // zoom
    //     // .translate([0 , 20])
    //     .scale(initialScale)
    //     .event(svg);
  }

  // Highlights the selected nodes 
  highlightSelNodes(selectedNodes, nodeSVGMap){
    for(let nodeId of selectedNodes){
      if(nodeId in nodeSVGMap){	
      	nodeSVGMap[nodeId].classed("highlight", true);
  	  }
    }
  }

  // Remove the port routing for edges whose incident nodes lie in different
  // functions
  removeInterFuncPortRouting(graph){
    for(let edge of graph.edges()){
      // If the edge is between different functions
      if(GraphUtils.findFnforNode(edge.v, graph) !== GraphUtils.findFnforNode(edge.w, graph)){
      	let edgeObj = graph.edge(edge);
        if("headport" in edgeObj){
          delete edgeObj["headport"];
        }
        if("tailport" in edgeObj){
          delete edgeObj["tailport"];
        }
      }
    }
  }

  // Update the hanging nodes and edges
  // Change the icon for aggregate hanging nodes (i.e. representing multiple 
  // nodes) as stacked ellipse
  // Move the hanging node and edge points closer towards its incident node 
  updateHgNodeIcon(graph_hg_edges, nodeSVGMap, edgeSVGMap, thisObj){

    let hangingEdgeIds = graph_hg_edges.edges().filter(function(edgeId){
      return graph_hg_edges.edge(edgeId)["type"] === edgeTypes.hangingEdge;
    });

    for(const edgeId of hangingEdgeIds){
      let nodeV = graph_hg_edges.node(edgeId.v);
      let nodeW = graph_hg_edges.node(edgeId.w);
      let hangingNode, incidentNode, hangingNodeSVG, incidentNodeSVG;
      let hangingEdgeSVG;
      let hasArrowHead;
      if(nodeV["type"] === nodeTypes.hangingNode){
        hangingNode = nodeV;
        incidentNode = nodeW;
        hangingNodeSVG = nodeSVGMap[edgeId.v];
        incidentNodeSVG = nodeSVGMap[edgeId.w];
        hangingEdgeSVG = edgeSVGMap[edgeId.v + "->" + edgeId.w];
        hasArrowHead = false;
      } else {
        hangingNode = nodeW;
        incidentNode = nodeV;
        hangingNodeSVG = nodeSVGMap[edgeId.w];
        incidentNodeSVG = nodeSVGMap[edgeId.v];
        hangingEdgeSVG = edgeSVGMap[edgeId.v + "->" + edgeId.w];
        hasArrowHead = true;
      }

      if(parseInt(hangingNode["count"], 10) > 1){
        // Make the stacked ellipse icon by copying the existing ellipse 
        // and translating the cx and cy values by +1 and -4
        let ellipse = hangingNodeSVG.select("ellipse");
        let ellipse_copy_node = ellipse.node().cloneNode(false);
        ellipse.node().parentNode.appendChild(ellipse_copy_node);
        let ellipse_copy = d3.select(ellipse_copy_node);
        let HCx = Number(ellipse_copy.attr("cx"));
        let HCy = Number(ellipse_copy.attr("cy"));
        HCx += 1;
        HCy -= 4;
        ellipse_copy.attr("cx", HCx);
        ellipse_copy.attr("cy", HCy);
      }

      // Translate the hanging node and its corresponding edge end points
      // towards its incident node

      // HCx, HCy is the center of the hanging node
      // NCx, NCy is the center of the incident node
      // H'Cx, H'Cy is the new center of the hanging node
      // H'Cx = NCx + 1/2(HCx - NCx)
      // i.e. translate by 1/2(NCx - HCx, NCy - HCy)
      // Translate the hanging node center, edge endpoint, and edge arrowhead 
      // by this amount

      // Center of the incident node 
      let NCx, NCy;
      // Center of the hanging node
      let HCx, HCy;
      // End point of the hanging edge
      let edgePtx, edgePty;
      
      [NCx, NCy] = Utils.getCenterPtNode(incidentNodeSVG);
      [HCx, HCy] = Utils.getCenterPtHgNode(hangingNodeSVG);
      [edgePtx, edgePty] = Utils.getEdgeEndPoint(hangingEdgeSVG, hasArrowHead);
      
      let translateX, translateY;
      // translateX = 0.5 * (NCx - HCx);
      // translateY = 0.5 * (NCy - HCy);
      translateX = 0.35 * (NCx - HCx);
      translateY = 0.35 * (NCy - HCy);

      hangingNodeSVG.attr("transform", 
        "translate(" + translateX + ", " + translateY + ")");
      
      edgePtx += translateX;
      edgePty += translateY;

      let isTarget = hasArrowHead;
      let srcX, srcY, tgtX, tgtY;
      if(isTarget){
        // get the source end and update the target end with the new coords
        [srcX, srcY] = Utils.getEdgeEndPoint(hangingEdgeSVG, !isTarget);
        tgtX = edgePtx;
        tgtY = edgePty;

      } else {
        // get the target end and update the source end with the new coords
        srcX = edgePtx;
        srcY = edgePty;
        [tgtX, tgtY] = Utils.getEdgeEndPoint(hangingEdgeSVG, !isTarget);
      }
      hangingEdgeSVG.select("path").attr("d", "M" + srcX + "," + srcY + " L " + 
        tgtX + "," + tgtY);
      
      // Move the arrow head as well
      if(hasArrowHead){
        // get the arrow head
        let arrowHead = hangingEdgeSVG.select("polygon");
        let arrowHeadNode = arrowHead.node();
        // insert a g node and insert the arrow head inside the g node
        let gNode = d3.select(arrowHeadNode.parentNode).append("g"); 
        gNode.node().appendChild(arrowHeadNode);
        // translate the g node
        gNode.attr("transform", 
          "translate(" + translateX + ", " + translateY + ")");
      }

    }
  }

  // Converts the functions to auxiliary nodes based on the options provided
  // Also updates the hanging nodes and edges when function nodes are 
  // replaced by aux nodes
  applyAuxRules(g, auxRuleOpts, hangingNodes, hangingEdges){
    let graph_with_aux_nodes;
    let isSplittingEnabled = auxRuleOpts["isCollapsingEnabled"];
    if(!isSplittingEnabled){
      return g;
    }
    let inDegThresh = auxRuleOpts["minIncomingEdges"];
    let outDegThresh = auxRuleOpts["minOutgoingEdges"];
    let auxList = auxRuleOpts["alwaysCollapseList"];
    let nonAuxList = auxRuleOpts["neverCollapseList"];
    let minSubgraphSize = auxRuleOpts["minCollapseSize"];
    let maxSubgraphSize = auxRuleOpts["maxCollapseSize"];
    let isFunctionOnly = auxRuleOpts["isFunctionOnly"];
    graph_with_aux_nodes = GraphUtils.updateAuxNodes(g, inDegThresh, 
      outDegThresh, auxList, nonAuxList, minSubgraphSize, maxSubgraphSize, 
      hangingNodes, hangingEdges, isFunctionOnly);
    return graph_with_aux_nodes;
  }

}

