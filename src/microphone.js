define('microphone', function (require) {
	function capture(fn) {
		window.__log = function(nignored) {
			console.warn("too much mic samples ", nignored);
		}

		window.__mediacapture_audiosamples = function(samples) {
			fn(samples);
	       	
		}

		microphone.capture();
	}

	return {
	    capture: capture
	}
});