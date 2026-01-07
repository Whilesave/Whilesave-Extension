($ => {
    "use strict";

    $.UtilHelper = function (b) {

        /**
         * treat some Chrome specific urls differently to make them work in Edge, Opera, ...
         *
         * @param url
         * @returns {string|null}
         */
        this.getParsedUrl = (url) => {
            if (!url) {
                return url;
            }

            if ($.opts.urlAliases[$.browserName] && $.opts.urlAliases[$.browserName][url]) {
                url = $.opts.urlAliases[$.browserName][url];
            }

            return url;
        };

        this.closeLink = (opts) =>{
            if(opts.hasOwnProperty("id")){
                $.api.tabs.remove(opts.id);
            }
        };

        /**
         * Opens the given url while regarding the specified parameters
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.openLink = (opts) => {
            return new Promise((resolve) => {

                let params = "";

                if (opts.params) { // params are given -> serialize
                    params = Object.entries(opts.params).map(([key, val]) => {
                        return encodeURIComponent(key) + "=" + val;
                    }).join("&");

                    if (params) {
                        params = "?" + params;
                    }
                }

                const url = this.getParsedUrl(opts.href) + params;

                if (opts.newTab && opts.newTab === true) { // new tab
                    const createTab = (idx = null) => {
                        $.api.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            $.api.tabs.create({
                                url: url,
                                active: typeof opts.active === "undefined" ? true : !!(opts.active),
                                pinned: typeof opts.pinned === "undefined" ? false : !!(opts.pinned),
                                index: idx === null ? tabs[0].index + 1 : idx,
                                openerTabId: tabs[0].id
                            }, (tab) => {
                                resolve(tab.id);
                            });
                        });
                    };

                    if (opts.position === "afterLast") {
                        $.api.tabs.query({currentWindow: true}, (tabs) => {
                            let idx = 0;
                            tabs.forEach((tab) => {
                                idx = Math.max(idx, tab.index);
                            });
                            createTab(idx + 1);
                        });
                    } else if (opts.position === "beforeFirst") {
                        createTab(0);
                    } else {
                        createTab();
                    }
                } else if (opts.newWindow && opts.newWindow === true) { // new normal window
                    $.api.windows.create({url: url, state: "maximized"}, (tab)=>{
                        resolve(tab.id);
                    });
                } else if (opts.incognito && opts.incognito === true) { // incognito window
                    $.api.windows.create({url: url, state: "maximized", incognito: true}, (tab)=>{
                        resolve(tab.id);
                    });
                } else { // current tab
                    $.api.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        $.api.tabs.update(tabs[0].id, {url: url}, (tab) => {
                            resolve(tab.id);
                        });
                    });
                }
            });
        };
    };

})(jsu);