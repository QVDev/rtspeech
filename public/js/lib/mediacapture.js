/*global navigator*/
/*global document*/
/*global window*/
/*global swfobject*/
/*global Uint8Array*/
/*global setTimeout*/
/*global setTimeout*/
(function (global) {
    function MCParam(key) {
        if (window["__MediaCaptureUI"] && __MediaCaptureUI[key]) {
            return __MediaCaptureUI[key];
        }

        return undefined;
    }

    var dev = {}, ui = {},
        options = {
            stylesheet: MCParam('stylesheet') || "mediacapture.css"
          , swf: MCParam('swf') || "MediaCapture.swf" 
          , timeout: MCParam('timeout') || 200
        };

    dev = {
        load: function (cb) {
            var object = document.createElement("div"),
                wrapper = document.createElement("div"),
                menu = document.createElement("div"),
                controls = document.createElement("div"), 
                closeBtn = document.createElement("div"), 
                minimizeBtn = document.createElement("div"), 
                self = this;
            controls.className = "mc-controls";

            minimizeBtn.className = "mc-minimize-button";
            minimizeBtn.innerHTML = "_";
            
            closeBtn.className = "mc-close-button";
            closeBtn.innerHTML = "&Cross;";
            
            object.id = "mc-flashobject";
            wrapper.className = "mc-wrapper";
            menu.className = "mc-menu";

            controls.appendChild(minimizeBtn);
            controls.appendChild(closeBtn);
            
            wrapper.appendChild(controls);
            wrapper.appendChild(object);
            wrapper.appendChild(menu);

            document.body.appendChild(wrapper);
            wrapper.style.left = (window.innerWidth / 2 - this.width / 2).toString() + "px";
            wrapper.style.top = (window.innerHeight / 2 - this.height / 2).toString() + "px";

            this.flashElement = object;
            this.callback = cb;

            swfobject.embedSWF(
                this.swf,
                this.flashElement.id,
                "320",
                "240",
                "10.1.0",
                null,
                null,
                { quality: 'high', bgcolor: "#ffffff", allowscriptaccess: "sameDomain" },
                null,
                function (e) {
                    self.flashElement = e.ref;
                    self.flashWrapper = e.ref.parentNode;
                    self.flashWrapper.style.display = "inline-block";
                    if (self.callback) {
                        setTimeout(function () {                            
                            self.callback();
                        }, options["timeout"]); // Wait until flash is loaded
                    }
                }
            );


            return object;
        },

        initialized: false,
        FLASH_SIZE_WITHOUT_PERMISSION: 60,
        width: 400,
        height: 310,
        callback: null,

        flashWrapper: null,
        flashElement: null,

        swf: options.swf,
        timeout: options.timeout
    };

    //dev.load();

    ui = {
        css : {
            stylesheet: (function () {
                var link = document.createElement("link");
                link.setAttribute("rel", "stylesheet");
                link.setAttribute("href", options.stylesheet);
                link.setAttribute("id", "mc-style");
                document.head.appendChild(link);
                return link;
            }()),
            show: "inline-block",
            hide: "none"
        },

        captureBtn: {
            element: null,
            display: true
        },

        stopBtn: {
            element: null,
            display: true
        },

        menu: null,

        toggleCaptureBtn: function () {

            this.captureBtn.element.style.display =  this.captureBtn.display ? this.css.hide : this.css.show;
            this.captureBtn.display = !this.captureBtn.display;
        },

        toggleStopBtn: function () {

            this.stopBtn.element.style.display = this.stopBtn.display ? this.css.hide : this.css.show;
            this.stopBtn.display = !this.stopBtn.display;
        },

        show: function (captureCb, stopCb) {
            dev.flashWrapper.style.visibility = "visible";
            var menu = dev.flashWrapper.querySelector(".mc-menu"), 
                closeBtn = dev.flashWrapper.querySelector(".mc-close-button"),
                self = this, captureBtn, stopBtn, closeBtn;
            
            menu.innerHTML = "<button class='mc-button mc-capture'>Capture</button><button class='mc-button mc-stop'>Stop</button>";
            captureBtn = menu.querySelector(".mc-capture");
            stopBtn = menu.querySelector(".mc-stop");            


            captureBtn.style.display = ui.css.show;
            stopBtn.style.display = ui.css.show;

            captureBtn.addEventListener("click", function (event) {
                captureCb();
            }, false);

            stopBtn.addEventListener("click", function (event) {
                stopCb();
            }, false);

            closeBtn.addEventListener("click", function (event) {
                self.hide();
            }, false);

            ui.menu = menu;
            ui.captureBtn.element = captureBtn;
            ui.stopBtn.element = stopBtn;
            dev.flashWrapper.style.display = this.css.show;
        },

        hide: function () {
            this.menu.innerHTML = "";
            dev.flashWrapper.style.visibility = "hidden";
            document.body.removeChild(dev.flashWrapper);
        }
    };

    function PendingOperation(cancelOp) {
        this.cancel = cancelOp;
    }

    function CaptureError(code) {
        this.code = code;
    }

    CaptureError.CAPTURE_APPLICATION_BUSY = 0;
    CaptureError.CAPTURE_INTERNAL_ERR = 1;
    CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
    CaptureError.CAPTURE_NO_MEDIA_FILES = 3;    

    window.microphone = {
        showText: function (text) {
           dev.flashElement.show(text); 
        }, 

        capture: function captureAudio() {
            dev.load(function () {
                dev.flashElement.init();

                function record() {
                    //dev.flashElement.captureAudio();
                    dev.flashElement.capture();

                    ui.toggleCaptureBtn();
                }

                function cancel() {
                    //dev.flashElement.cancelAudio();
                    dev.flashElement.cancel();

                    ui.toggleStopBtn();
                    ui.hide();
                }

                ui.show(record, cancel);
            });
        }
    };
}(window));
