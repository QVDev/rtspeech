define('sink', ['platform'], function (platform) {				
	var output = new Audio(), moz = !!output.mozSetup	 // mozAudio
	  , ctx, fftworker, canvas, isActive = true 		 // Vis utils
	  , webkit = !!window['webkitAudioContext']			 // Webkit
	  //, context, source, audiobuffer = new Float32Array(320), bufferWrite = false	  
	  , xaudio;

	function isHidden() {
		if (!isActive) {
			return true;
		}

		if (platform === "mobile") {
			return true;
		}
		
		return !!(document["mozHidden"] || document["webkitHidden"] || document["hidden"]);
	}
	  	
	function vis(elem) {
		var window_width = document.body.clientWidth;
		ctx = elem.getContext('2d');
		canvas = elem;
		canvas.width = window_width <= 480 ? window_width : window_width / 2;
	}

	function render(freq) {
		var SPACER_WIDTH = 10, BAR_WIDTH = 5, OFFSET = 100;
		const CANVAS_HEIGHT = canvas.height;
		const CANVAS_WIDTH = canvas.width;

		var numBars = Math.round(CANVAS_WIDTH / SPACER_WIDTH);

		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.fillStyle = '#333333';
		ctx.lineCap = 'round';
		
		// Draw rectangle for each frequency bin.
		for (var i = 0; i < numBars; ++i) {
			var magnitude = freq[i] * 4000; // equalize, attenuates low freqs and boosts highs;
			ctx.fillRect(i * SPACER_WIDTH, CANVAS_HEIGHT, BAR_WIDTH, -magnitude);
		}		
	}

	function setup(channels, rate) {
		if (moz) {
			output.mozSetup(channels, rate);			
		} else if (webkit) {
			xaudio  = new XAudioServer(channels, rate, 320, 512, function (samplesRequested) {}, 0);
			/*
			context = new webkitAudioContext();
			node = context.createJavaScriptNode(320);
			node.onaudioprocess = webkitAudioProcess;
			node.connect(context.destination);
			*/			
		}

		fftworker = new Worker("/js/workers/fft.js");
		fftworker.onmessage = function (evt) {
			render(evt.data);
		}
	}

	function mozWriteAudio(samples) {
		output.mozWriteAudio(samples);
	}

	function silence(buf) {
		for (var i = -1; ++i<buf.length;) {
			buf[i] = 0;
		}
	}

	/*
	function webkitAudioProcess(event) {		
		var outputBuffer = event.outputBuffer.getChannelData(0);		

		silence(outputBuffer);

		if (!bufferWrite) {			
			return;
		}

		for (var i = -1; ++i<audiobuffer.length;) {
			outputBuffer[i] = audiobuffer[i];
		}		

		bufferWrite = false;

	}
	*/
	
	function webkitWriteAudio(samples) {		
		/*for (var i = -1; ++i<audiobuffer.length;) {
			audiobuffer[i] = samples[i];
		}

		bufferWrite = true;*/
		xaudio.writeAudio(samples);
	}

	/**
	  * Samples playback
	  */
	function write(samples) {		
		moz && mozWriteAudio(samples);
		webkit && webkitWriteAudio(samples);
		!isHidden() && fftworker.postMessage(samples);
	}

	return {
		setup: setup		
	  , write: write
	  , vis: vis
	  , render: render
	  , toggleVis: function () {
	  	isActive = !isActive;
	  }
	}
});