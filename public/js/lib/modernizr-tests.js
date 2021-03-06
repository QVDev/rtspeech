Modernizr.addTest("audiodata", function () {
	return !!(new Audio()).mozSetup
});

Modernizr.addTest("usertiming", function () {
	return Modernizr.performance && !!window.performance.mark && !!window.performance.measure
});

Modernizr.addTest("microphone", function () {
    var Context = webkitAudioContext || mozAudioContext || AudioContext;

    return !!(new Context()).createMediaStreamSource;

});

Modernizr.load({
	test: Modernizr.usertiming
  , nope: '/js/polyfills/usertiming.js'
});

Modernizr.load({
	test: Modernizr.classlist
  , nope: '/js/polyfills/classList.js'
});
