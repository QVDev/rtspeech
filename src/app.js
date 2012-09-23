define('app', ['platform', 'file', 'http', 'microphone', 'stream', 'codecs', 'sink', 'analytics'], 

function (platform, File, HTTP, Microphone, Stream, Codecs, Sink, Analytics) {
	!window['$'] && ($ = function (selector) {
		return document.querySelectorAll(selector);
	});

	!window['$$'] && ($$ = function (selector) {
		return document.querySelector(selector);
	});

	function forEach(list, fn) {
		Array.prototype.forEach.call(list, fn);
	}

	var features = ['microphone', 'webaudio', 'audiodata', 'websocketsbinary', 'webworkers', 'filereader', 'performance']
	  , bonus = ['usertiming']
	  , supported = true;

	var loaded = false
	  , stream, sessionId
	  , isMobile = (platform !== "desktop")
	  
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
	  , codecSelected = codecSelector.selectedIndex
	  , codec = codecSelector.options[codecSelected].getAttribute("name")

	  , loopbackCodecSelector = $$("#select-loopback-codec")
	  , loopbackCodec = new Codecs[$$("#select-loopback-codec option[selected]").getAttribute("name")]
	  , captureButton = $$("#loopback-capture")

	  , nav_items = $("nav li a")
	  , tabs = $("section")

	  , activeTabClass = "active";

	function hideAllTabs() {
		forEach( $("section.active"), function (section) {
			section.classList.remove(activeTabClass);
		});
	}

	function showTab(id) {
		$$("section"+id).classList.add(activeTabClass);

		if (id == "#media") {
			showTab("#support");
			showTab("#disclaimer");
		} else if (id == "#how-to") {
			showTab("#tools");
			showTab("#troubleshooting");
		} else if (id == "#future-work") {
			showTab("#authors");
			showTab("#acknowledgments");
			showTab("#partners");
		}
	}

	function navActive(hash) {
		forEach( $("nav li a"), function (a) {
			a.classList.remove(activeTabClass);
		});

		$$("nav li a[href='"+hash+"']").classList.add(activeTabClass);
	}

	// Show Feedback Dialog
	function feedbackDialog() {
		var dialog = document.createElement("div")
		  , overlay = document.createElement("div")
		  , qa = "<div class='mc-container'>"+		  		
		  		 "<p>Your feedback on the voice chat:</p>"+
		  			 "<input type='radio' name='feedback' value='noear' /><span>I couldn't hear anything</span>"+
		  			 "<input type='radio' name='feedback' value='interrupt' /><span>Too many interrupts</span>"+
		  			 "<input type='radio' name='feedback' value='good' /><span>Good sound quality</span>"+
		  			 "<input type='radio' name='feedback' value='awesome' /><span>Awesome!</span>"+
			  		 "<p>Comment:</p>"+
		  		 	 "<textarea id='comment'></textarea>"+
		  		 	 "<button class='mc-send'>Send Feeback</button>"+
		  		 "</div>";
		
		dialog.className = "mc-wrapper mc-feedback";
		dialog.innerHTML = qa;
		dialog.style.visibility = "visible";
		dialog.style.width = "400px";
        dialog.style.left = (window.innerWidth / 2 - 400 / 2).toString() + "px";
        dialog.style.top = (window.innerHeight / 2 - 300 / 2).toString() + "px";

		overlay.className = "overlay";

		dialog.getElementsByClassName("mc-send")[0].addEventListener('click', function (evt) {
			var flist = document.getElementsByName('feedback')
			  , comment = document.getElementById("comment").value
			  , user;

			for(var i=-1, l=flist.length; ++i<l;) {
				if (flist[i].checked) {
					user = flist[i].value;
					break;
				}
			}

			analytics.feedback({
			  	"comment": comment
			  , "user": user
			});

			document.body.removeChild(overlay);
			document.body.removeChild(dialog);
		}, false);

		document.body.appendChild(overlay);
		document.body.appendChild(dialog);
	}

	// Closes stream and launches feedback Dialog
	function close() {
		stream.close();
		if (stream.active) {
			feedbackDialog();
		}
	}

	// Only when Media Capture UI is created
	function bindMCUI() {
		var stopBtn = $$(".mc-wrapper .mc-menu .mc-stop");
		!!stopBtn && stopBtn.addEventListener("click", function (evt) {
			close();
		}, false);

		var captureBtn = $$(".mc-wrapper .mc-menu .mc-capture");
		!!captureBtn && captureBtn.addEventListener("click", function (evt) {			
			stream.active = true;
		}, false);

		var closeBtn = $$(".mc-wrapper .mc-controls .mc-close-button");
		!!closeBtn && closeBtn.addEventListener("click", function (evt) {
			close();
		}, false);
	}

	function featureSupport() {
		var gen = "", elem, audio = false, f
		  , audioFeatures = features.slice(0, 3)
		  , generalFeatures = features.slice(3);
		
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

	function bindLoopbackStop() {
		var closeBtn = $$(".mc-wrapper .mc-controls .mc-close-button");
		closeBtn.addEventListener("click", function (evt) {
			analytics.stop();
		}, false);			
	}

	function onLoopbackCapture (evt) {
		var bound = false;		
		analytics.start();

		Microphone.capture(function (samples) {
			if (!bound && !Modernizr.microphone) {
				bindLoopbackStop();
				bound = true;
			}

			// Only if the encoder has enough samples
			if (samples.length == 0) {
				return;
			}

			var encoded, decoded; 
			
			performance.mark('frames_encode_start');
			encoded = loopbackCodec.encode(samples, true);
			performance.mark('frames_encode_end');

			if (!!encoded) {
				performance.mark('frames_decode_start');
				decoded = loopbackCodec.decode(encoded);
				performance.mark('frames_decode_end');

				Sink.write(decoded);
			}

			performance.measure('frames_encode', 'frames_encode_start', 'frames_encode_end');
			performance.measure('frames_decode', 'frames_decode_start', 'frames_decode_end');
		});
	}
	
	function bindMC () {
		setTimeout(function () {
			//bindMCMinimizeBtn();
			bindMCUI();
		}, 2500);
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

			var audio = evt.target
			  , parent = evt.target.parentNode;
						
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

					// Firefox hack to make audio element appear
					parent.removeChild(audio);
					parent.appendChild(audio);
				}, function () {
					console.error("Unable to read file");
				});
			}, { 
				type: "arraybuffer" 
			});
		};

		audioElement.src = "/samples/female.ogg";
		audioElement.load();
	}

	// Nav Configuration
	forEach(nav_items, function (item) {
		item.addEventListener("click", function (evt) {
			// Switch active section
			var active = evt.target.hash;

			hideAllTabs();
			showTab(active);
			navActive(active);

			evt.preventDefault();
			return false;
		}, false);
	});

	navActive("#media");
	showTab("#media");
	audioLoad();

	// File decoding
	file.addEventListener("change", function (evt) {
		File.read(evt.target.files[0], 'binarystring', function (result) {
			var ext = evt.target.files[0].name.split(".")[1];

			if (ext == "ogg") {
				Speex.util.play(oggRead(result));	
			} else if (ext == "amr") {
				var samples = new AMR({
				   	benchmark: true
				}).decode(result);

				AMR.util.play(samples);
			}
			
		});
	}, false);

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

	// Capture (Microphone Loopback)
	captureButton.addEventListener("click", function (evt) {		
		onLoopbackCapture(evt);
	});
	
	// Loopback codec selection
	loopbackCodecSelector.addEventListener("change", function (evt) {
		var selected = evt.target.options.selectedIndex
		  , lpCodec = loopbackCodecSelector.options[selected].getAttribute("name");
		
		loopbackCodec = new Codecs[lpCodec]();
		analytics.set("loopback-codec", lpCodec);
	}, false);

	// Codec selection
	codecSelector.addEventListener("change", function (evt) {
		codecSelected = evt.target.options.selectedIndex;		
		codec = codecsAvailable[codecSelected].getAttribute("name");

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
	
	window.analytics = Analytics;
});
