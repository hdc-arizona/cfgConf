var nodeTypes = {
	loop: "LOOP",
	fn: "FUNCTION",
	cluster: "CLUSTER",
	hangingNode: "HANGINGNODE",	
		// NOTE: Hanging nodes are now referred to as boundary nodes
	auxNode: "AUXILIARYNODE"
		// NOTE: auxiliary nodes are now referred to as split nodes
};

var edgeTypes = {
	hangingEdge: "HANGINGEDGE",
		// NOTE: Hanging edges are now referred to as boundary edges
	auxEdge: "AUXILIARYEDGE"
		// NOTE: auxiliary edges are now referred to as split edges
}

class Defaults {
	static FilterOpts = {
		"selectedNodes": [],
		"isHopFilterOn":false, 
		"maxHops":3, 
		"minNodes":20, 
		"isLoopFilterOn": true, 
		"loopDepth":3,
		"isFunctionFilterOn": false
	};

	// Moved this inside layout options for the function
	// static AuxRulesOpts = {
	// 	"isCollapsingEnabled": true,
	// 	"minIncomingEdges": 10,
	// 	"minOutgoingEdges": 1,
	// 	"alwaysCollapseList": [],
	// 	"neverCollapseList": [],
	// 	"minCollapseSize": 1,
	// 	"maxCollapseSize": "10p",
	// 	"isFunctionOnly": true
	// };

	static LayoutOpts = {
		"node": {
			"shape": "box",
			"style": "solid"
		},
		"edge": {
			"style": "solid",
			"color": "black"
		},
		"loop": {
			"background": true
		},
		"function": {
			"boundary": true,
			"collapsingRules": {
				"isCollapsingEnabled": false,
				"minIncomingEdges": 10,
				"minOutgoingEdges": 0,
				"alwaysCollapseList": [],
				"neverCollapseList": [],
				"minCollapseSize": 1,
				"maxCollapseSize": "10p",
				"isFunctionOnly": true
			}
		}
	};
}

var OverlapTypes = {
	full: "FULL",
	partial: "PARTIAL",
	none: "NONE"
};
