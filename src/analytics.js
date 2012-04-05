define('analytics', ['stream'], function (Stream) {
	var navstart = performance.timing.navigationStart
	  , fetchstart = performance.timing.fetchStart;
	var custom = {};

	/**	  
	  * @returns [avg, min, max]
	  */
	function avg(arr) {
		var sum=0, min=arr[0], max=arr[0];		

		for (var i = -1; ++i<arr.length;) {
			sum += arr[i];

			arr[i] < min && (min = arr[i]);
			arr[i] > max && (max = arr[i]);
		}

		return [ Math.round(sum/arr.length), min, max ];
	}

	function Analytics(options) {
		options = options || {};

		//this.ws = new WebSocket("ws://"+location.hostname+":8080/");				

		this.measure_interval = options.measure_interval || 5000;
		this.collect_interval = options.collect_interval || 6000;

		this.measure_timer = null;
		this.collect_timer = null;

		this.step  = this.measure_interval / 1000;
	}
	
	Analytics.prototype.setLocation = function () {
		navigator.geolocation.getCurrentPosition(function (position) {  
			custom['location'] = {
				latitude: position.coords.latitude
			  , longitude: position.coords.longitude
			}  			
		});
	}

	Analytics.prototype.setUA = function () {
		custom['ua'] = navigator.userAgent;
	}
		
	Analytics.prototype.measure = function (name, value) {
		(custom[name] = custom[name] || []).push(value);
	}
	
	Analytics.prototype.set = function (attr, value) {
		custom[attr] = value;	
	}

	Analytics.prototype.calc = function (mesbuf, _step) {
		try {
		var step = Math.floor(mesbuf.length / _step)
		  , mod = Math.floor(mesbuf.length % _step)
		  , measures = [], i;
		
		for (i=0; i<mesbuf.length; i += step) {
			measures.push( avg(mesbuf.slice(i, i + step)) );
		}
				
		} catch (Err) {
			console.error(Err);
		}

		return measures;
	}

	Analytics.prototype.send = function () {
		Stream.trace.setBenchmark(false);

		var receive_tm = performance.getMarks('packet_receive')
		  , send_tm = performance.getMarks('packet_send')
		  , sink = [], recv = [];
		
		// Calculate the sending intervals
		for (var i=0; ++i<receive_tm.length; ) {
			recv.push(receive_tm[i] - receive_tm[i-1]);
		}

		// Calculate the receiving intervals
		for (var i=0; ++i<send_tm.length; ) {
			sink.push(send_tm[i] - send_tm[i-1]);
		}

		// Reduce monitoring data to sets of [avg, min, max]
		var measures = performance.getMeasures(), reporting, reporting_str;
		
		measures.recv_samples = receive_tm.length;
		measures.recv = this.calc(recv, this.step);

		measures.sink_samples = send_tm.length;
		measures.sink = this.calc(sink, this.step);

		var dec = measures.frames_decode || [], enc = measures.frames_encode || []
		  , nd = dec.length, ne = enc.length;

		measures.decode = this.calc(dec, this.step);
		measures.decode_samples = nd;

		measures.encode = this.calc(enc, this.step);
		measures.encode_samples = ne;

		// Remove raw sets
		delete measures.frames_decode;
		delete measures.frames_encode;
		
		// Create monitoring packet
		reporting = {
			start: navstart
		  , fetchStart: fetchstart
		  , times: measures
		  , metrics: custom
		};

		reporting_str = JSON.stringify(reporting);

		this.ws.send(reporting_str);
				
		performance.clearMeasures();
		performance.clearMarks();
		
		delete custom;
		custom = {};

		Stream.trace.setBenchmark(true);
	}

	Analytics.prototype.start = function () {
		this.ws = new WebSocket("ws://"+Stream.monrdUrl);

		var self = this;
		
		this.setLocation();
		this.setUA();

		this.measure_timer = setInterval(function () {
			Stream.trace.setBenchmark();
		}, this.measure_interval);

		this.collect_timer = setInterval(function () {
			self.send();
		}, this.collect_interval);
	}

	Analytics.prototype.stop = function () {
		!!this.collect_timer && clearInterval(this.collect_timer);
		!!this.measure_timer && clearInterval(this.measure_timer);
	}

	return new Analytics();
});