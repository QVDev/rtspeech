define('microphone-webaudio', function (require) {    
    function callback(_fn) {
        var fn = _fn;
        return function (stream) {
            var audioContext = new webkitAudioContext();

            // Create an AudioNode from the stream.
            var mic = audioContext.createMediaStreamSource( stream );
            var processor = audioContext.createJavaScriptNode( 1024, 1, 1 );
            var refillBuffer = new Int16Array(190);
    		var resampler = new Resampler(44100, 8000, 1, 1024);


            processor.onaudioprocess = function (event) {
                var inputBuffer = event.inputBuffer.getChannelData(0);
                var samples = resampler.resampler(inputBuffer);

                for (var i = 0; i < samples.length; ++i) {
                    refillBuffer[i] = Math.ceil(samples[i] * 32768);
                }

                fn (refillBuffer);
            }

            mic.connect(processor);
            processor.connect(audioContext.destination);
        }        
    }

    function _capture(fn) {
        navigator.webkitGetUserMedia( {audio:true}, callback(fn) );
    }

    return {
        capture: _capture
    }
});
