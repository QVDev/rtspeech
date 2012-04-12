define('codecs', ['util'], function (util) {
	function Codec(isParallel) {
		this.codec = this.init();
		this.parallel = isParallel || false;
	}

	Codec.prototype.init = function () {}
	Codec.prototype.encode = function (samples) {}
	Codec.prototype.decode = function (encoded) {}	
	Codec.prototype.close = function () {}

	function CodecWorker(name, params) {
		this.name = name || "speex";
		this.params = params;		

		Codec.apply(this, [true]);
	}
	
	util.inherit(CodecWorker, Codec);

	CodecWorker.prototype.init = function () {
		var self = this;
		this.worker = new Worker("/js/workers/codec.js");		
		this.worker.onmessage = function (evt) {
			self.onframes(evt, self);
		}
		
		this.load();
	}

	CodecWorker.prototype.onencode = function (frames) {}
	CodecWorker.prototype.ondecode = function (frames) {}

	CodecWorker.prototype.onframes = function (event) {
		// Bug on Worker - somes workers transfered objects comes as "undefined"
		if (!event.data) {
			return;
		}

		if ((event.data.constructor == Int8Array) || (event.data.constructor == Uint8Array)) {
			this.onencode(event.data);
		} else if ((event.data.constructor == Float32Array)) {
			this.ondecode(event.data);
		}
	}

	CodecWorker.prototype.load = function (name) {
		name = name || this.name;
		this.worker.postMessage({ type: 'init', name: name });
	}

	CodecWorker.prototype.encode = function (samples) {
		this.worker.postMessage(samples);
	}

	CodecWorker.prototype.decode = function (frames) {
		this.worker.postMessage(frames);
	}


	function SpeexCodec() {
		this.params = {
			quality: 6
		}

		Codec.apply(this, arguments);
	}
	
	util.inherit(SpeexCodec, Codec);

	SpeexCodec.prototype.init = function () {
		return new Speex(this.params);
	}
	
	SpeexCodec.prototype.encode = function (shorts) {
		try {
			return this.codec.encode(shorts);
		} catch (err) {
			console.error("error encoding");
			console.error(err);
		}
	}

	SpeexCodec.prototype.decode = function (encoded, isFile) {
		try {
			return this.codec.decode(encoded, isFile);
		} catch (err) {
			console.error("error decoding");
			console.error(err);
		}
	}

	function AMRCodec() {
		this.params = {};

		Codec.apply(this, arguments);
	}

	util.inherit(AMRCodec, SpeexCodec);

	AMRCodec.prototype.init = function () {
		return new AMR(this.params);
	}


	function PCMUCodec() {				
		this.params = {
	  		floating_point: true // returns the samples in floats 
		}

		Codec.apply(this, arguments);
	}

	util.inherit(PCMUCodec, Codec);

	PCMUCodec.prototype.encode = function (shorts) {
		try {
			return G711.encode(shorts, this.params);
		} catch (err) {
			console.error(err);
		}
	}

	PCMUCodec.prototype.decode = function (binaryString) {
		try {
			return G711.decode(binaryString, this.params);
		} catch (err) {
			console.error(err);
		}
	}

	function PCMACodec() {
		this.params = {
			alaw: true
	  	  , floating_point: true
		}		
	}

	util.inherit(PCMACodec, PCMUCodec);

	return {
	  	speex: SpeexCodec
	  , amrnb: AMRCodec
	  , pcma: PCMACodec
	  , pcmu: PCMUCodec
	  , Worker: CodecWorker
	  , Codec: Codec
	}
});