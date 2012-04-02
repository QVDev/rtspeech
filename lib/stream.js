var Log = require('log')
  , logger = new Log('debug')
  , WebSocket = require('ws');

function WebSocketGroup () {
	this.connections = {};
}

WebSocketGroup.prototype.add = function (stream) {
	this.connections[stream.uuid] = stream.connection;
}

WebSocketGroup.prototype.send = function (message, options) {
	var c;
	for (var uuid in this.connections) {
		c = this.connections[uuid];

		if (c.readyState == WebSocket.OPEN) {
			c.send(message, options);
		}
	}
}

function Stream(uuid, options) {	
	this.uuid = uuid;
	options = options || {};
	this.codec = options.codec || "speex";

	this.params = {};
	this.connection = null;
	this.session = null;
	this.username = null;

	this.destinationUUID = null;
	this.destination = new WebSocketGroup();
}

Stream.prototype.parse = function (message) {	
	var expr = message.split(";");
	for (var i=-1; ++i<expr.length;) {
		var tokens = expr[i].split("=");
		if (tokens[0].length == 0) {
			continue;
		}

		this.params[tokens[0]] = tokens[1];
	}
}

Stream.prototype.onparam = function (message) {
	var hasEndpoint = !!this.destination;
	this.parse(message);
	this.codec = this.params["codec"];
	logger.debug("codec changed: %s", this.codec);
	
	if (hasEndpoint) {
		this.connection.send("::"+message);
		this.destination.send("::"+message);
	}
	return;
}

Stream.prototype.onaudio = function (message) {		
	if (!this.destination) {
		return;
	}
	
	var isBinary, isBuffer, frames, options, hasEndpoint;
	isBinary = this.destination.protocolVersion >= 13;
	isBuffer = (message instanceof Buffer);
	frames = (isBuffer && !isBinary ? message.toString('base64') : message);
	options = {
		binary: true
	};
	
	!isBinary && (options.binary = false);
	
	if (this.destination.readyState == WebSocket.OPEN) {
		this.destination.send(frames, options);	
	}
}

Stream.prototype.onmessage = function (message) {
	if (typeof(message) === "string" && message.substr(0, 2) === "::") {
		return this.onparam(message.substring(2));
	}

	this.onaudio(message);
}

Stream.prototype.bind = function () {
	var self = this;
	this.connection.on('message', function (message) {
		self.onmessage(message);
	});

	this.connection.on('error', function (err) {
		logger.debug("session %s on error", self.uuid);
		logger.error("%s error: %s", self.uuid, err.toString());
	});

	this.connection.on('close', function (err) {
		logger.debug("session %s closed", self.uuid);
		self.connection.terminate();
	});
}

Stream.prototype.send = function (message, options) {
	options = options || {
		binary: true
	};
	
	this.connection.send(message, options);
}

module.exports = Stream;