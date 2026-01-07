($ => {
    "use strict";

	//Firefox supports browsers and also supports Chrome.
	//chrome only supports chrome
    $.api = typeof browser !== "undefined" ? browser : chrome;
	const manifest = $.api.runtime.getManifest();
	
    $.isDev = manifest.version_name.trim() === "Dev"; //isDev, standalone version

    $.browserName = "chrome";
    const userAgent = navigator.userAgent;
    if (/Edg\//.test(userAgent)) {
        $.browserName = 'edge';
    }else if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent) && !/OPR\//.test(userAgent)) {
        $.browserName = 'chrome';
    }else if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent) && !/OPR\//.test(userAgent)) {
        $.browserName = 'safari';
    }else if (/Firefox\//.test(userAgent)) {
        $.browserName = 'firefox';
    }else {
        $.browserName = 'unknown';
    }
	
	//Configuration file
    $.opts = {
        manifest: manifest,
        apiVersion:"2.0.1", //API version, may need to be treated differently, v1 is for the Tampermonkey version, v2 is for the plugin version.
        number:"3000",      //This is an identifier specific to the extension; once set, it cannot be changed.
        baseUrl:"https://ot.shuqiandiqiu.com",
        //baseUrl:"http://127.0.0.1:8080/cchatgpt",
        urlAliases: {
            Edge: {
                "chrome://newtab/": "edge://newtab/",
                "chrome://bookmarks": "edge://favorites",
                "chrome://extensions/shortcuts": "edge://extensions/shortcuts",
                "chrome://settings/syncSetup": "edge://settings/profiles/sync"
            },
            Opera: {
                "chrome://newtab/": "chrome://startpage/",
                "chrome://bookmarks": "opera://bookmarks",
                "chrome://extensions/shortcuts": "opera://settings/keyboardShortcuts"
            }
        },
        classes:{
            page:{
                style: "ws-be-style",
            }
        },
        attr: {
            name: "data-name",
			style: "data-style",
            couponProcessMark: "ws-mk"
		},
        website:{
			jtm:"https://www.whilesave.com",
            jtmExtensionInstall:"https://www.whilesave.com/notice"
		},
        tips:{
			
		},
        messageActions:{
            updateToolbar:"f_update_toolbar",
            iconActive:"s_iconActive",
            toolbarIconClick:"f_toolbar_icon_click"
        },
        storageKeys:{
            position:{
                logoTop:"p/logoTop",
            },
            setting:{

            },
            history:{
                record:"h/record",
                offset:"h/offset",
                number:"h/number",
            },
            website:{
                token:"w/userToken",
                exchangeInfo:"w/exchangeInfo"
            }
        },
        featureControlKeys:{
            windowShow:"window_show"
        },
        updateExchangeInfoDelay: 1000*60*10 //Updated every 10 minutes.
    };
    $.cl = $.opts.classes;
    $.attr = $.opts.attr;
})(jsu);