define('stream', ['platform', 'http', 'file', 'microphone', 'sink', 'codecs'], function (platform, HTTP, File, Microphone, Sink, Codecs) {
	var WS = window["MozWebSocket"] || window["WebSocket"];

	var remoteActivity = document.getElementById("remote");

	Sink.setup(1, 8000);
	Sink.vis(remoteActivity);

	var sink = function (samples) {
		Sink.write(samples);
	};


	HTTP.getJSON("/config.json", function (data) {
	  	Stream.relayUrl = data.relay;
	  	Stream.monrdUrl = data.monrd;
	});

	function Stream(uuid, options) {
		options = options || {};
		this.server = 0;

		this.codec_name = options.codec || "speex"; 
		this.codec = new Codecs[this.codec_name]();

		var self = this;
		if (this.codec instanceof Codecs.Worker) {
			this.bind();
		}
		
		this.btype = 'arraybuffer';
		this.DataView = this.codec_name == "speex" ? Uint8Array : Int8Array;

		this.loaded = false;
		this.callee = options.callee || false;

		//this.connection = new WS("ws://"+location.host+"/stream/"+uuid);		
		this.bind();
		this.benchmark = false;
				
		Stream.trace = this;						
	}

	Stream.prototype.setBenchmark = function (val) {
		//this.codec[val ? "enable" : "disable"]('benchmark');		
		this.benchmark = val === undefined ? !this.benchmark : !!val;
		return this.benchmark;
	}

	Stream.prototype.bind = function () {
		this.codec.onencode = function (frames) {
			self.send(frames);
		}

		this.codec.ondecode = function (frames) {
			sink(frames);
		}		
	}

	Stream.prototype.onmicaudio = function (message) {
		var encoded;
		if (this.codec.parallel) {
			return this.codec.encode(message);
		}

		this.benchmark && performance.mark('frames_encode_start');

		encoded = this.codec.encode(message);	
			
		this.benchmark && performance.mark('frames_encode_end') 
		this.benchmark && performance.measure("frames_encode", "frames_encode_start", "frames_encode_end");

		this.send(encoded);
	}

	Stream.prototype.onmessage = function (message) {				
		if (message.data.constructor === ArrayBuffer) {
			this.onbinarymessage(new Uint8Array(message.data));
		} else if (message.data.constructor === String) {						
			var isParam = this.onparam(message.data);			
			if (isParam) {
				return;
			}

			var binaryString = atob(message.data)
			this.onbinarymessage(this.ta(binaryString));			
		}
	}

	/** 
	  * Convert binaryString to Typed Array
	  */
	Stream.prototype.ta = function (binaryString) {
		var data = new Uint8Array(binaryString.length);
		for (var i = -1; ++i<binaryString.length; ) {
			data[i] = Binary.toUint8(binaryString[i]);					
		}

		this.onbinarymessage(data);
	}

	Stream.prototype.onparam = function (message) {
		var header = message.substr(0, 2);
		if (header == "::") {
			var params = this.parse(message.substr(2));
			for (var name in params) {
				this.set(name, params[name], true);
			}
			return true;
		}

		// returns true if it isn't a parameter message
		return false;
	}

	Stream.prototype.onbinarymessage = function (buffer) {
		this.benchmark && performance.mark('packet_receive');
		//this.benchmark && performance.measure('recv', 'packet_receive');
		//this.benchmark && performance.measure('rtt', 'packet_send', 'packet_receive');
		this.sink(buffer);
	}

	Stream.prototype.sink = function (binaryString) {
		var decoded;

		if (this.codec.parallel) {
			return this.codec.decode(binaryString);		
		}

		this.benchmark && performance.mark('frames_decode_start');
		
		decoded = this.codec.decode(binaryString);

		this.benchmark && performance.mark('frames_decode_end');
		this.benchmark && performance.measure('frames_decode', 'frames_decode_start', 'frames_decode_end');

		sink(decoded);
	}

	Stream.prototype.onerror = function () {
		console.warn("Stream already full");
	}

	Stream.prototype.connected = function () {
		return this.connection && this.connection.readyState == 1;
	}

	Stream.prototype.onopen = function () {
		console.warn("Stream opened");		

		if (!this.callee) {
			this.set('codec', this.codec_name);
		}

		this.load();
		analytics.start();
	}

	Stream.prototype.onclose = function () {
		if (!this.bind()) {
			console.warn("Stream closed");
			return analytics.stop();	
		}			
	}

	Stream.prototype.connect = function () {
		var wsUrl = Stream.relayUrl[this.server++];

		console.warn("trying ", wsUrl);
		
		if (!this.connection) {
			delete this.connection;
		}

		this.connection = new WS("ws://" + wsUrl + "/");
		this.connection.binaryType = this.btype;
		this.connection.onmessage = this.onmessage.bind(this);
		this.connection.onerror = this.onerror.bind(this);
		this.connection.onopen = this.onopen.bind(this);
		this.connection.onclose = this.onclose.bind(this);
	}

	Stream.prototype.bind = function () {
		if (this.connected()) {
			return true;
		}

		if (this.server == Stream.relayUrl.length) {
			return true;
		}

		var self = this;
		setTimeout(function () {
			self.connect();	
		}, 4);

		return (this.connection && this.connection.readyState == 0);
	}

	Stream.prototype.onparamset = function (name, value) {
	}

	Stream.prototype.send = function (data) {
		this.benchmark && performance.mark('packet_send');
		this.benchmark && analytics.set('packet_size', data.buffer.byteLength);
		//this.benchmark && analytics.measure('packet_size', data.buffer.byteLength);
		//this.benchmark && performance.measure('sink', 'packet_send');
		
		this.connection.send(this.btype == "arraybuffer" ? data.buffer : data);
	}

	Stream.prototype.parse = function (params) {
		var expr = params.split(";"), p = {};

		for (var i=-1; ++i<expr.length;) {
			var tokens = expr[i].split("=");
			p[tokens[0]] = tokens[1];
		}

		return p;
	}

	Stream.prototype.set = function (attr, value, received) {
		if (attr == "codec") {
			this.codec = (!!value && this.codec_name != value /*|| !this.codec*/? 
				new Codecs[value]() : this.codec);
			
			this.codec_name = value;
			this.DataView = (value == "speex") ? Uint8Array : Int8Array;			
		}

		analytics.set(attr, value);

		this.onparamset(attr, value);
		!received && this.connection.send("::"+attr+"="+value+";");
	}

	Stream.prototype.load = function () {
		var self = this;

		if (platform == "mobile") {
			console.warn("No microphone available in mobile browser...yet.");
			return;
		}

		Microphone.capture(function (samples) {
			!self.loaded && (self.loaded = true) && Microphone.hideSwf();

			self.onmicaudio(samples);
		});
	}
	
	return Stream;
});