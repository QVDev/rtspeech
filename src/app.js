define('app', ['platform', 'file', 'http', 'stream', 'codecs', 'sink', 'analytics'], function (platform, File, HTTP, Stream, Codecs, Sink, Analytics) {
	!window['$'] && ($ = function (selector) {
		return document.querySelectorAll(selector);
	});

	!window['$$'] && ($$ = function (selector) {
		return document.querySelector(selector);
	});

	var features = ['webaudio', 'audiodata', 'websocketsbinary', 'webworkers', 'filereader', 'performance']
	  , bonus = ['usertiming']
	  , supported = true;

	var loaded = false
	  , stream, sessionId, isMobile = (platform !== "desktop")
	  , toggleMC = $$(".toggle-media-capture")
	  , toggleVis = $$("#toggle-vis")
	  , featuresList = $$("#support .features")
	  , browserSupportTitle = $$("#support .support-title")
	  , audioElement = $$("#audio-element")

	  , newSessionBtn = $$("#new-session")
	  , sessionContainerSct = $$("#session-container")

	  , file = $$("#file-decoding input[name='sample']")

	  , codecSelector = $$("#select-codec")
	  , codecsAvailable = codecSelector.options
	  , codec = codecSelector.options[0].getAttribute("name");

	function urlSessionId() {
		var hash = location.hash[0] == "#" ? location.hash.substring(1) : false;
		if (!hash) {
			return false;
		}

		return hash.split("/")[2];
	}

	function requestSessionKey(fn) {
		HTTP.post('/session', {	type: 'json' }, null, function (data) {
		  	fn(data.uuid);
		});		
	}

	function renderSessionURL(url) {
		sessionContainerSct.innerHTML += 
			"<span id='session-id'>Copy this <a href='"+url+"'>url</a> to another browser</span>";
	}

	// Only when Media Capture UI is created
	function bindMCMinimizeBtn() {
		var minimizeBtn = $$(".mc-wrapper .mc-controls .mc-minimize-button");

		!!minimizeBtn && minimizeBtn.addEventListener("click", function (evt) {
			evt.target.parentNode.parentNode.classList.toggle("hidden");
			toggleMC.classList.toggle("hidden");
		}, false);
	}

	function featureSupport() {
		var gen = "", elem, audio = false, f
		  , audioFeatures = features.slice(0, 2)
		  , generalFeatures = features.slice(2);
		
		for (var i=-1; ++i<audioFeatures.length;) {
			if (Modernizr[audioFeatures[i]]) {
				featuresList.querySelector("."+audioFeatures[i])
					.classList.add("yes");

				audio = true;
			}
		}
				
		for (var i=-1; ++i<generalFeatures.length;) {			
			if (Modernizr[generalFeatures[i]]) {
				featuresList.querySelector("."+generalFeatures[i])
					.classList.add("yes");
				continue;
			} 

			supported = supported && false;
		}

		(supported = supported && audio) && support();
		return supported;
	}
	
	function support() {
		browserSupportTitle.classList.remove("not_supported");
		newSessionBtn.classList.remove("hidden");		
		$$("#session-options").classList.remove("hidden");		
	}

	function bindMC () {
		setTimeout(function () {
			bindMCMinimizeBtn();
		}, 1000);
	}

	function changeCodec(name, value) {
		if (name == "codec") {
			for (var i = -1; ++i<codecSelector.length; ) {
				if (codecSelector[i].getAttribute("name") == value) {
					codecSelector.selectedIndex = i;
					break;
				}
			}
		}
	}

	function oggRead(result) {
		var ogg = new Ogg(result), samples, encoded;

		ogg.unpack();
		encoded = ogg.bitstream();

		ret = Speex.header(ogg.frames[0]);

		samples = new Speex({ quality: 8 }).decode(encoded);

		return samples;
	}

	/**
	  * Audio Element Integration
	  * - Changes the current URL with a WAV Data uri
	  */
	function audioLoad() {
		audioElement.onerror = function (evt) {		
			/*
			 * Firefox triggers MediaError#MEDIA_ERR_DECODE
			 * Chrome triggers MediaError#MEDIA_ERR_SRC_NOT_SUPPORTED
			 */		
			if (evt.target.error.code < MediaError.MEDIA_ERR_DECODE) {
				return;
			}

			var audio = evt.target;
			HTTP.get(audio.src, function (data) {
				File.read(data, "binarystring", function (result) {
					var samples = oggRead(result);
					var waveData = PCMData.encode({
						sampleRate: 8000,
						channelCount:   1,
						bytesPerSample: 2,
						data: samples
					});

					audio.controls = true;
					audio.src = "data:audio/wav;base64,"+btoa(waveData);
					audio.load();
				}, function () {
					console.error("Unable to read file");
				});
			}, { type: "blob" });
		};

		audioElement.src = "/samples/female.ogg";
		audioElement.load();
	}

	if (!featureSupport()) {
		return audioLoad();
	}

	// Toggle Visualization
	toggleVis.addEventListener("change", function (evt) {
		Sink.toggleVis();
		$$("#remote").classList.toggle("invisible");
	}, false);

	// Toggle Media Capture UI
	toggleMC.addEventListener("click", function (evt) {
		$$(".mc-wrapper").classList.toggle("hidden");
		toggleMC.classList.toggle("hidden");		
	}, false);

	// File decoding
	file.addEventListener("change", function (evt) {
		File.read(evt.target.files[0], 'binarystring', function (result) {
			Speex.util.play(oggRead(result));
		});
	}, false);

	// Codec selection
	codecSelector.addEventListener("change", function (evt) {
		codec = codecsAvailable[evt.target.options.selectedIndex].getAttribute("name");

		!!stream && stream.set("codec", codec);
	}, false);

	// New Session Button
	newSessionBtn.addEventListener("click", function (evt) {
		stream = new Stream("", {			  				
			codec: codec
		});

		stream.onparamset = changeCodec;
		bindMC();
		
		newSessionBtn.parentNode.removeChild(newSessionBtn);
	}, false);

	audioLoad();
	
	window.analytics = Analytics;
});