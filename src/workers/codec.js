importScripts("/codecs/g711.js");
importScripts("/codecs/speex.min.js");

importScripts("/js/lib/require.js");
importScripts("/codecs.js");

var dbuf, ebuf, codec_name, codec, Codecs;
require({ 
		baseUrl: "/js/"
	}
  , ['require', 'codecs']
  , function (require, _Codecs) {
	Codecs = _Codecs;
	codec_name = "speex";
	codec = new Codecs[codec_name]();
});

function init(name) {
	codec = new Codecs[name]();
}

function encode(samples) {
	ebuf = codec.encode(samples);
	self.postMessage(ebuf);
}

function decode(frames) {
	dbuf = codec.decode(frames);
	self.postMessage(dbuf);
}

self.onmessage = function (event) {
	if (event.data["type"] && event.data.type == "init") {
		init(event.data.name);
	} else if (event.data.constructor == Int16Array) {
		encode(event.data);
	} else if ((event.data.constructor == Int8Array) || (event.data.constructor == Uint8Array)) {
		decode(event.data);
	}
}