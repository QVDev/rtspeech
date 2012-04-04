require('./monitoring');

var SessionManager = require("./manager.js")
  , Stream = require("./stream.js")  

  , url = require('url')
  , util = require('util')

  , Log = require('log')
  , logger = new Log('debug')
  , WebSocketServer = require('ws').Server
  , WebSocket = require('ws');

function Relay(httpServer, options) {
	options = options || {};
	
	var mediaRelay = new WebSocketServer({ 
	  	server: httpServer
  	, 	verifyClient: options.onverify || undefined
	});

	var self = this;
	
	mediaRelay.on('connection', function(ws) {
		var uuid = Math.uuid()
		  , stream = new Stream(uuid);
	
		stream.connection = ws;
		stream.bind();

		self.manager.new(stream);
		
		ws.on('close', function () {
			self.manager.remove(uuid);
		});
	});
	
	this.media = mediaRelay;
	this.manager = new SessionManager();
}

Relay.prototype.onopen = function (ws, stream) {
	var urlo, t, uuid;

	ws.protocolVersion = ws.upgradeReq.headers['sec-websocket-version'];
	analytics.inc('protocol_'+ws.protocolVersion);

	if (ws.protocolVersion < 13) {
		ws.terminate();
		return false;
	}
	/*
	urlo = url.parse(ws.upgradeReq.url, true);	
	t = urlo.pathname.split("/"), uuid;

	if (t[1] != "stream" && t[2] === undefined) {
		ws.terminate();
		return false;
	}
	uuid = t[2];
	*/
	uuid = Math.uuid();
	session = this.manager.sessions[uuid];

	if (session === undefined) {
		ws.terminate();
		return false;
	}

	stream = new Stream();
	stream.connection = ws;
	stream.bind();	
}

Relay.prototype.toText = function (buffer) {
	return buffer.toString('base64');
}

module.exports = {
	Relay: Relay
  ,	SessionManager: SessionManager
}