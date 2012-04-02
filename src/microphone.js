define('microphone', function (require) {
	
	function loadSwf(fn, options) {
	    options = options || {}
		var element = options["selector"] ? document.querySelector(options["selector"]) : document.body
	      , container = options["swf container"] ? options["swf container"] : document.createElement("div")
		  ,	object = document.createElement("div");

	    container.className += " ls-container";
		object.id = "ls-flashobject";
	    container.appendChild(object);
	    element.appendChild(container);

		var flo = {
		    swf: "/bin/MediaCapture-8000.swf"
		  ,	flashElement: object  
		  , flashWrapper: {}
		  , fn: fn
		};


		swfobject.embedSWF(
	        flo.swf,
	        flo.flashElement.id,
	        "320",
	        "240",
	        "10.1.0",
	        null,
	        null,
	        { quality: 'high', bgcolor: "#ffffff", allowscriptaccess: "sameDomain" },
	        null,
	        function (event) {

	        	function load() {
	       		    setTimeout(function () {
	                    flo.fn();
	                }, options["flash load timeout"] || 500); // Wait until flash is loaded
	                return true;
	        	}

	            flo.flashElement = event.ref;
	            flo.flashWrapper = event.ref.parentNode;
	            flo.flashWrapper.style.display = "inline-block";
	            return (flo.fn && load());
	        }
	    );

	    return flo;
	}


	function capture(callback) {
	    function __flashunpack (wavBase64) {
			var data = atob(wavBase64)
			  , size = Binary.toInt32(data.substring(40, 44)) // ignore the remaining headers
			  ,	wavData = data.substring(44); 
			  

			var buffer = new ArrayBuffer(size)
			  , samples = new Int16Array(buffer);

			for (var i=0, j=0; i<=wavData.length; ++j, i+=2) {
				samples[j] = Binary.toInt16(wavData.substring(i, i+2));
			}

			return samples;
	    }

	    function onCaptureError (err) {
	        console.error("Capture Error:", err);
	    }

	    function onSamples (wav64) {	       	
	       	//callback(PCMData(atob(samples)));
	       	callback(__flashunpack(wav64));
	    }

	    function onRecordingComplete (data) {
	    }

	    navigator.device.captureAudio(onRecordingComplete, onCaptureError, {
	        raw: true
	      , onsamples: onSamples
	    });
	}
/*
	// Manually load swf instead of using mediacapture polyfill
	function capture(fn) {
		window.__mediacapture_audiosamples = function(base64) {
	       	fn(PCMData(atob(base64)));
		}

		var dev = loadSwf(function () {
			dev.flashElement.initMicrophone("1", "0", "1");
			dev.flashElement.captureAudio();
		});

		return dev;
	}
*/
	return {
		load: loadSwf
	  , capture: capture
	}
});