var express = require('express')
  , argv = require('optimist')
	.usage("Usage: index.js --port [num]")
	.demand(['port'])
	.argv;

var app = express.createServer()
  , rtspeech = require('./lib/relay.js')
  , relay = new rtspeech.Relay(app, {
		onverify: function (data) {			
			return true;		
		}
	});

app.use(express.static(__dirname+"/public"));
app.use(express.static(__dirname+"/src"));

app.post('/session', function (req, res) {
	var uuid = "";// relay.newSession();

	res.header('Content-Type', "application/json");
	res.send(JSON.stringify({
		uuid: uuid
	}));
});

app.listen(argv.port, function() {
	console.log((new Date()) + " Server is listening on port "+argv.port);
});
