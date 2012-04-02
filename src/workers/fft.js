importScripts("/js/lib/fft.js");

var bufferSize = 512, fft = new FFT(bufferSize, 8000), audiodata;

self.onmessage = function (evt) {	
	if (evt.data.constructor == Float32Array) {			
		audiodata = new Float32Array(bufferSize);
		for (var i = -1; ++i<audiodata.length;) {
			if (i >= evt.data.length) {
				audiodata[i] = 0;
			} else {
				audiodata[i] = evt.data[i];	
			}
		}

		/*
		shorts = new Int16Array(evt.data.length);
		for (var i = -1; ++i<shorts.length;) {
			shorts[i] = Math.round(evt.data[i] * 32768);
		}
		*/
	}

	fft.forward(audiodata);
	self.postMessage(fft.spectrum);
}