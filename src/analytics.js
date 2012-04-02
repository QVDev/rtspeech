define('analytics', ['stream'], function (Stream) {
	var navstart = performance.timing.navigationStart
	  , fetchstart = performance.timing.fetchStart;
	var custom = {};

	function Analytics (options) {
		options = options || {};

		//this.ws = new WebSocket("ws://"+location.hostname+":8080/");				

		this.measure_interval = options.measure_interval || 5000;
		this.collect_interval = options.collect_interval || 10000;

		this.measure_timer = null;
		this.collect_timer = null;
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

	Analytics.prototype.send = function () {
		Stream.trace.setBenchmark(false);
		var measures = performance.getMeasures(), reporting;

		reporting = {
			start: navstart
		  , fetchStart: fetchstart
		  , times: measures
		  , metrics: custom
		};

		this.ws.send(JSON.stringify(reporting));
				
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