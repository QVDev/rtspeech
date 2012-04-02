var WebSocket = require('ws')
  , os = require('os');

var custom = {}
  , sys = {};

function Analytics (options) {
	options = options || {};

	this.ws = new WebSocket("ws://127.0.0.1:8080/mon");
	this.ws.onopen = this.onopen;
	this.ws.onerror = this.onerror;
	this.ws.onclose = this.onclose;

	this.collect_interval = options.collect_interval || 10000;
	this.collect_timer = null;
}

Analytics.prototype.onopen = function () {
	analytics.start();
}

Analytics.prototype.onerror = function () {
	console.error("error on monitoring socket")
}

Analytics.prototype.onclose = function () {
	console.log("monitoring closing");
}

Analytics.prototype.inc = function (name, value) {
	this.measure(name, ++(custom[name] || 0))
}

Analytics.prototype.measure = function (name, value) {
	(custom[name] = custom[name] || []).push(value);
}

Analytics.prototype.stat = function () {
	return {
		loadavg: os.loadavg()	
	  , total: os.totalmem()
	  , freemem: os.freemem()
	  , process_mem: process.memoryUsage()
	  , process_uptime: process.uptime()
	}
}

Analytics.prototype.send = function () {
	var system = this.stat();
	
	var reporting = {
  		metrics: custom
	  , system: system
	};
	
	if (this.ws.readyState == WebSocket.OPEN) {
		this.ws.send(JSON.stringify(reporting));
	}			
}

Analytics.prototype.start = function () {
	var self = this;

	this.collect_timer = setInterval(function () {
		self.send();
	}, this.collect_interval);
}

Analytics.prototype.stop = function () {
	!!this.collect_timer && clearInterval(this.collect_timer);
}

global.analytics = new Analytics();

module.exports = global.analytics;
