define('http', function(require) {
	function _request(url, options, oncomplete, onerror) {
		var req = new XMLHttpRequest()
		  , type = options.type == "json" ? "text" : options.type;
		
		req.open(options.method, url, !!options.async || true);
		req.responseType = type;
		req.sync = options.sync || false;
		options.binary = (type == "arraybuffer" || type == "blob");
		req.onload = function (event) {
			if (!req.status == 200) {
				onerror(event);
			}
			
			var response = (options.binary ? req.response : req.responseText);
			oncomplete((options.type == "json") ? JSON.parse(response) : response);
		}

		req.onerror = onerror;
		return req;
	}

	return {
		get: function (url, oncomplete, options) {
			_request(url, {
				method: "GET"
			  , type: options.type || "text"
			}, oncomplete, onerror).send(null);
		}
	  , getJSON: function (url, oncomplete) {
			_request(url, {
				method: "GET"
			  , type: "json"
			  , sync: true
			}, oncomplete, onerror).send(null);
		}
	  , post: function (url, options, data, oncomplete) {
			_request(url, {
				method: "POST"
			  ,	type: options.type || "text"
			}, oncomplete, onerror).send(data || null);
	  	}
	}
});