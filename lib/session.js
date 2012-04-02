var Log = require('log')
  , logger = new Log('debug');

function Session () {
	this.size = 1;
	this.codec = "speex";
	this.origin = null;
	this.target = null;
}

Session.prototype.join = function (origin, target) {	
	origin.destinationUUID = target.uuid;
	origin.destination = target.connection;

	target.destinationUUID = origin.uuid;
	target.destination = origin.connection;

	/*
	origin.destination.add(target);
	target.destination.add(origin);
	*/

	this.origin = origin.uuid;
	this.target = target.uuid;
}

module.exports = Session;