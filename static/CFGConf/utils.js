class Utils {

	// Checks if the second set is subset of the first set
	static isSubset(set, subset) {
	    for (let elem of subset) {
	        if (!set.has(elem)) {
	            return false;
	        }
	    }
	    return true;
	}

	// Computes the difference setA - setB
	static difference(setA, setB) {
	    let _difference = new Set(setA);
	    for (let elem of setB) {
	        _difference.delete(elem);
	    }
	    return _difference;
	}

	// Checks if the two sets intersect
	// Returns true if any element is common between the sets
	static isIntersects(setA, setB){
		for (let elem of setA) {
	        if (setB.has(elem)) {
	            return true;
	        }
	    }
		return false;
	}

	// Computes the intersection of two sets
	static intersection(setA, setB) {
	    let _intersection = new Set();
	    for (let elem of setB) {
	        if (setA.has(elem)) {
	            _intersection.add(elem);
	        }
	    }
	    return _intersection;
	}

	//	This function populates the missing attributes with the default values
	//	Params:
	//		obj: the obj to fill the attributes to
	//		defObj:	the obj containing the default values
	static fillDefault(obj, defObj){
		// Iterate through the defObj keys
		Object.keys(defObj).forEach(function(key){
			// Set to the default value if attribute not set 
			if(!(key in obj)){
				if(Array.isArray(defObj[key])){
					obj[key] = [...defObj[key]];
				}	else {
					obj[key] = defObj[key];
				}
			}
		}); 
	}

	// This function populates the missing attributes with the default values
	// This recursively fills the obj. Works for objects within objects.
	// Params:
	//		obj: the obj to fill the attributes to
	//		defObj:	the obj containing the default values. May contain objects
	// within the keys 
	static fillDefaultDeep(obj, defObj){
		for(const [key, val] of Object.entries(defObj)) {
			if(typeof val !== "object"){
				// if the value is not an object
				// set to the default value if attribute not set 
				if(!(key in obj)){
					obj[key] = val;
				}
			} else if(!(key in obj)){
				// if the key is not set but the value is an object, 
				// make a deep copy of the object
				obj[key] = JSON.parse(JSON.stringify(val));
			}
			else {
				// if the value is an object and key is set,
				// call recursively on the object
				// Make sure its not an array because typeof an array
				// also returns object
				if(!(Array.isArray(val))){
					Utils.fillDefaultDeep(obj[key], val);
				}
			}
		}
	}

	// Adds the string prefix if not starts with the prefix
	static addStrPrefix(str, prefix){
		if(!str.startsWith(prefix)){
			str = prefix + str;
		} 
		return str;
	}

	// Removes the string prefix if starts with the prefix
	static removeStrPrefix(str, prefix){
		if(str.startsWith(prefix)){
			// Remove the prefix
			str = str.substring(prefix.length);
		}
		return str; 
	}

	// This function checks if the website is hosted inside LLNL servers. Checks the hostname
	// for the string "llnl"
	static isHostLLNL(){
	  return document.location.hostname.includes('llnl');
	}

	// This function checks if the website is hosted using XAMPP. Checks the pathname for 
	// the string "xampp"
	static isXAMPP(){
	  return document.location.pathname.includes("xampp");
	}

	static is_lc(){
	  return location.origin.indexOf("lc.llnl.gov") > -1;
	};

	// This function asserts whether a condition is true
	// Throws an error when the condition is false
	static assert(condition, message) {
	    if (!condition) {
	        message = message || "Assertion failed";
	        if (typeof Error !== "undefined") {
	            throw new Error(message);
	        }
	        throw message; // Fallback
	    }
	}

	// Returns the points as an array of point objects of the form
	// 		{x: xcoord, y: ycoord} 
	static getPolygonPts(nodeSVG){
	  let ptStr = nodeSVG.select("polygon").attr("points");
	  let pts = ptStr.split(" ");
	  let points = [];
	  for(let i=0; i<pts.length; i++){
	    let thisPt = pts[i].split(",");
	    let x = Number(thisPt[0]);
	    let y = Number(thisPt[1]);
	    points.push({x:x, y:y});
	  }
	  return points;
	}

	//Returns the center point of the rectangular node
	static getCenterPtNode(nodeSVG){
		let cx,cy;
		let points = Utils.getPolygonPts(nodeSVG);
		if(points[0].x === points[1].x){
			cx = (points[1].x + points[2].x)/2.0;
		}	else {
			cx = (points[0].x + points[1].x)/2.0;
		}

		if(points[0].y === points[1].y){
			cy = (points[1].y + points[2].y)/2.0;
		}	else {
			cy = (points[0].y + points[1].y)/2.0;
		}
		return [cx,cy];
	}

	// Returns the center point of the hanging node
	// (i.e. the cx and cy of the ellipse)
	static getCenterPtHgNode(hangingNodeSVG){
		let cx,cy;
		let ellipse = hangingNodeSVG.select("ellipse");
        cx = Number(ellipse.attr("cx"));
        cy = Number(ellipse.attr("cy"));
		return [cx, cy];
	}

	// If getTarget is true, get the target of the edge
	// else get the source of the edge 
	static getEdgeEndPoint(edgeSVG, getTarget){
	  let px, py;
	  let dAttr = edgeSVG.select("path").attr("d");
	  if(getTarget){
		// get the last coordinate
		let last_re = /(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
		let temp_match = dAttr.match(last_re);
	  	px = Number(temp_match[1]);
	  	py = Number(temp_match[3]);
	  }	else {
		// get the first coordinate
		let first_re = /M(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/;
	  	let temp_match = dAttr.match(first_re);
	  	px = Number(temp_match[1]);
	  	py = Number(temp_match[3]);
	  }
	  return [px, py];
	}
	

}