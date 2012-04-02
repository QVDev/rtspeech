define('platform', function (require) {
	var isMobile = !!navigator.userAgent.match(/(Android|iPhone|iPod|blackberry|android 0.5|htc|lg|midp|mmp|mobile|nokia|opera mini|palm|pocket|psp|sgh|smartphone|symbian|treo mini|Playstation Portable|SonyEricsson|Samsung|MobileExplorer|PalmSource|Benq|Windows Phone|Windows Mobile|IEMobile|Windows CE|Nintendo Wii)/i)
	  , isTablet = !!navigator.userAgent.match(/(iPad|SCH-I800|xoom|kindle)/i);

	if (isMobile) {
		return "mobile";
	}

	if (isTablet) {
		return "tablet";
	}
	
	return "desktop";
});