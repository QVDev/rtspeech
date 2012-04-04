var Session = require('./session.js')
  , Log = require('log')
  , logger = new Log('debug')
  , uuid = require('./uuid.js')
  , util = require('./util.js');

function SessionManager () {
	this.streams = {};
	this.streamIds = [];

	this.waiting = [];
	this.timer = null;
}

SessionManager.prototype.getUsernames = function () {
	var usernames = [], s;

	for (var uuid in this.streams) {
		if ((s = this.streams[uuid]).username.length > 0) {
			usernames.push(s.username);
		}
	}

	return usernames;
}


SessionManager.prototype.validate = function (uuid) {
	logger.debug("%s exists?", uuid);

	return (this.streams[uuid] !== undefined);
}

/**
  * FIFO queue for current streams
  */
SessionManager.prototype.getTargetId = function () {
	if (this.waiting.length == 0) {
		return null;
	} 

	return this.waiting.pop();
}

SessionManager.prototype.new = function (stream, username) {
	var uuid = stream.uuid
	  , target, session, targetUUID;
	
	this.streams[uuid] = stream;	

	logger.debug("creating stream %s", uuid);
	
	if (this.waiting.length == 0) {
		this.waiting.push(uuid);
		return;		
	}
	
	targetUUID = this.getTargetId();
	logger.debug("target is %s", targetUUID)
		
	target = this.streams[targetUUID];
	session = new Session();
	session.join(stream, target);
	
	this.streams[targetUUID] = target;
	this.streamIds.push(uuid);
	this.streamIds.push(targetUUID);
	
	analytics.measure('waiting', this.waiting.length);
	analytics.measure('total_streams', this.streamIds.length);

	logger.debug("total streams %s", this.streamIds.length);
}

SessionManager.prototype.remove = function (uuid) {
	logger.debug("remove stream %s", uuid);
	
	var idx = this.streamIds.indexOf(uuid)
	  , targetUUID = this.streams[uuid].destinationUUID
	  , targetIdx = this.streamIds.indexOf(targetUUID);


	if (targetIdx >= 0) {
		logger.debug("remove target %s", targetIdx);
		this.streamIds.remove(targetIdx);
		idx = idx - 1;
	}

	if (idx >= 0) {
		logger.debug("remove source %s", idx);	
		this.streamIds.remove(idx);
	}

	if ((idx = this.waiting.indexOf(uuid)) >= 0) {
		logger.debug("remove waiting %s", idx);	
		this.waiting.remove(idx);
	}

	if (!!this.streams[targetUUID]) {
		logger.debug("%s waiting", targetUUID);
		this.waiting.push(targetUUID);
	}

	
	delete this.streams[uuid];

	analytics.measure('waiting', this.waiting.length);
	analytics.measure('total_streams', this.streamIds.length);
	
	logger.debug("total streams %s", this.streamIds.length);
}

module.exports = SessionManager;
