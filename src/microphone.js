define('microphone', ['microphone-flash', 'microphone-webaudio'], function(flash, webaudio) {
		if (Modernizr.microphone) {
			return webaudio;
		}

		return flash;
});
