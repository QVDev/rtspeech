define('util', function (require) {	
	return {
		/**
		  * @author LearnBoost
		  */
	    merge: function (target, additional, deep, lastseen) {
			var seen = lastseen || []
			  , depth = typeof deep == 'undefined' ? 2 : deep
			  , prop;

			for (prop in additional) {
			  if (additional.hasOwnProperty(prop) && seen.indexOf(prop) < 0) {
			    if (typeof target[prop] !== 'object' || !depth) {
			      target[prop] = additional[prop];
			      seen.push(additional[prop]);
			    } else {
			      merge(target[prop], additional[prop], depth - 1, seen);
			    }
			  }
			}

			return target;
		}

		/**
		  * @author LearnBoost
		  */
	  , inherit: function (ctor, ctor2) {
	    	function f() {};
	    	f.prototype = ctor2.prototype;
	    	ctor.prototype = new f;
	  	}
	}
});