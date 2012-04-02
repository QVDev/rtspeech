var WebSocketServer = require('ws').Server
  , WebSocket = require('ws')
  , uuid = require('./uuid.js')
  , url = require('url')
  , util = require('util')
  , Log = require('log')
  , logger = new Log('debug');

function Session () {
	this.size = 0;
	this.origin = null;
	this.destination = null;
	this.queue = {
		src: []
	  , dst: []
	}
}

Session.prototype.join = function (connection) {
	var id = this.size
	  , cache = false;
	if (this.size >= 2) {
		return -1;
	}

	if (this.size == 0) {
		cache = !!this.origin
		logger.debug("origin %s-joined", cache ? "re" : "");
		this.origin = connection;
		this.origin.rejoined = cache;
	}

	if (this.size == 1) {
		cache = !!this.origin
		logger.debug("destination %s-joined", cache ? "re" : "");
		this.destination = connection;
		this.destination.rejoined = cache;
	}

	this.size += 1;	
	return id;
}

Session.prototype.getPeer = function (iam) {
	return (iam == 0 ? this.destination : this.origin);
}

Session.prototype.remove = function (id) {
	--this.size;
	return (this.size == 0);
}

function SessionManager () {
	this.sessions = [];
}

SessionManager.prototype.validate = function (uuid) {
	logger.debug("%s exists?", uuid);

	return (this.sessions[uuid] !== undefined);
}

SessionManager.prototype.newSession = function () {
	var uuid = Math.uuid();
	logger.debug("creating session %s", uuid);
	this.sessions[uuid] = new Session();
	return uuid;
}

SessionManager.prototype.removeSession = function (uuid) {
	logger.debug("remove %s", uuid);

	delete this.sessions[uuid];
}

function Stream(uuid, options) {	
	this.uuid = uuid;
	this.codec = options.codec || "speex";

	this.connection = null;	
	this.session = null;
}

Stream.prototype.onparam = function (message) {
}

Stream.prototype.onaudio = function (message) {
}

Stream.prototype.send = function (message, options) {
	options = options || {
		binary: true
	};
	
	this.connection.send(message, options);
}

function Relay(httpServer, options) {
	options = options || {};
	
	var mediaRelay = new WebSocketServer({ 
	  	server: httpServer
  	, 	verifyClient: options.onverify || undefined
	});

	var self = this;
	
	mediaRelay.on('connection', function(ws) {
		ws.protocolVersion = ws.upgradeReq.headers['sec-websocket-version'];
		logger.debug("WebSocket Protocol: %s", ws.protocolVersion);

		var urlObj = url.parse(ws.upgradeReq.url, true);		
		
		var _tokens = urlObj.pathname.split("/")
				, uuid, valid, session, params = {};

		if (_tokens[1] != "stream" && _tokens[2] === undefined) {
			ws.terminate();
			return false;			
		}

		uuid = _tokens[2]
		valid = self.manager.validate(uuid);
		session = self.manager.sessions[uuid];

		if (session === undefined) {
			ws.terminate();
			return false;
		}

		var iam = session.join(ws)
		  , dst
		  , sendOptions = { 
			  binary: true 
			};		

		ws.on('message', function (message) {
			var isParam = (typeof(message) === "string" && message.substr(0, 2) === "::");
			if (isParam) {
				self.parseParams(params, message.substring(2));
				session.codec = params["codec"];
				logger.debug("codec changed: %s", session.codec);
				!!dst && dst.send(message);
				return;
			}

			!dst && (dst = session.getPeer(iam));
			if (!dst) {
				return;
			}

			if (!!dst["rejoined"]) {
				dst = session.getPeer(iam);
			}

			var isBinary = dst.protocolVersion >= 13
			  , isBuffer = (message instanceof Buffer)
			  , m = isBuffer && !isBinary ? message.toString('base64') : message
			  , options = sendOptions;
			
			!isBinary && (options.binary = false);
						
			if (dst.readyState == WebSocket.OPEN) {
				dst.send(m, options)
			}
		});

		ws.on('error', function (err) {
			logger.error("%s error: %s", uuid, err.toString());
		});

		ws.on('close', function (err) {
			if (session.remove(iam)) {
				self.manager.removeSession(uuid);
			}
			ws.terminate();
		});

		if (!!session.codec) {
			logger.debug("codec used: %s", session.codec);
			ws.send("::codec="+session.codec+";");
		}
	});
	
	this.server = mediaRelay;
	this.manager = new SessionManager();
}

Relay.prototype.parseParams = function (params, message) {	
	var expr = message.split(";");
	for (var i=-1; ++i<expr.length;) {
		var tokens = expr[i].split("=");
		if (tokens[0].length == 0) {
			continue;
		}
		params[tokens[0]] = tokens[1];
	}
}

Relay.prototype.toText = function (buffer) {
	return buffer.toString('base64');
}

Relay.prototype.toBuffer = function (buffer) {
}

Relay.prototype.newSession = function () {
	return this.manager.newSession();
}

module.exports = {
	Relay: Relay
  ,	SessionManager: SessionManager
  , Session: Session
}