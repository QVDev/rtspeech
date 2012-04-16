define('file', function (require) {

	if (!Modernizr.filereader) {
		return {
			read: function () {}
		  , select: function () {}
		}	
	}

    var reader = new FileReader()
      , Builder = window["WebKitBlobBuilder"] || window["MozBlobBuilder"] || window["BlobBuilder"];

	function read(file, type, callback, error) {
		var f = file, bb;

		if (!(file instanceof Blob)) {
			bb = new Builder();
			bb.append(file);
			f = bb.getBlob();
		}

    	reader.onload = function(evt) {
    		if (evt.target.result.length > 0) {
    			return callback(evt.target.result);
    		} 

    		error && error(new Error("Unable to read file"));
    	}

    	if (type == "arraybuffer") {
    		reader.readAsArrayBuffer(f);
    	} else if (type == "uri") {
    		reader.readAsDataURL(f);
    	} else if (type == "binarystring") {
    		reader.readAsBinaryString(f);
    	}
	}

	function select(selector, type, callback) {
		document.querySelector(selector).addEventListener("click", function (evt) {
			read(evt.target.files[0], type, callback);
		}, false);
	}

	return {
		read: read
	  , select: select
	};
});