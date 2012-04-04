var express = require('express')
  , url = require('url')
  , path = require('path')
  , fs = require('fs')
  , argv = require('optimist')
	.usage("Usage: index.js --port [num]")
	.demand(['port'])
	.argv;

var WebSocketServer = require('ws').Server
  , WebSocket = require('ws')
  , app = express.createServer()
  , Logger = require('bunyan')

var logn = 0
  , basepath = path.join(".", "logs", Date.now()+"")
  , monrd = new WebSocketServer({ 
  		server: app
  	});
  
fs.mkdirSync(basepath);

monrd.on('connection', function(ws) {
	var name = url.parse(ws.upgradeReq.url, true)
				.pathname == "/mon" ? 'relay' : 'clients_'+logn++;

	var logpath = path.join(basepath, name + ".json")
	  , log = new Logger({
		  	name: name
		  , streams: [
		  	{ level: "debug", path: logpath },
		  	{ level: "info", path: logpath },
			{ level: "info", stream: process.stdout }
		  ]
		})
	  , measures
	  , location;

	log.info("connect");

	ws.on('message', function (message) {
		measures = JSON.parse(message);
		if (measures.metrics.location) {
			log.debug({	
				location: measures.metrics.location	
			}, "location");
		}

		log.debug({ measures: measures }, "measures");
	});

	ws.on('error', function (err) {
		log.info("error", err);	
	});

	ws.on('close', function () {	
		log.info("disconnect");
	});
});


app.listen(argv.port, function() {
	console.log((new Date()) + " Server is listening on port "+argv.port);
});