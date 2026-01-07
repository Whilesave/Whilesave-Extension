($ => {
    "use strict";

    const background = function () {

         //Compatible with older browser versions
        const apiAction = $.api.action || $.api.browserAction;

        //Icon animation
        this.animationInterval = null;
        this.icons = {};

        /**
         * Reinitialize content script
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.reinitialize = (opts = {}) => {
            
        };
        
        /**
         * Initialises the helper objects
         */
        const initHelpers = () => {
            this.helper = {
                dao: new $.DaoHelper(this),
                connect: new $.ConnectHelper(this),
                language: new $.LanguageHelper(this),
                upgrade: new $.UpgradeHelper(this),
                util: new $.UtilHelper(this),
                request: new $.RequestHelper(this),
                storageSession: new $.storageSessionHelper(this)
            };
        };

        /**
         * Calls the according method of the upgrade helper after installing or updating the extension,
         * waits 500ms if the helper is not initialized yet and calls itself again
         *
         * @param {object} details
         * @param {int} i
         */
        const callOnInstalledCallback = (details, i = 0) => {
        
            if (this.helper && this.helper.upgrade && this.helper.upgrade.loaded) {

                if (details.reason === "install") { // extension was installed
                    this.helper.upgrade.onInstalled();
                } else if (details.reason === "update") { // extension was updated
                    this.helper.upgrade.onUpdated(details);
                }
            } else if (i < 100) {
                $.delay(500).then(() => {
                    callOnInstalledCallback(details, i + 1);
                });
            }
        };

        /**
         *
         */
        this.run = () => {
            const start = +new Date();

            if($.browserName==="safari"){
                safari();
            }else{
                chromeOrFirefox();
            }

            //Click the small icon
            apiAction.onClicked.addListener((tab) => {
                sendContentScriptMessage(tab.id, $.opts.messageActions.toolbarIconClick, {});
            });

            initHelpers();
            this.helper.connect.init().then(()=>{
                return Promise.all([
                    this.helper.dao.init(),
                    this.helper.language.init(),
                ]);
            }).then(()=>{
                return Promise.all([
                    this.helper.upgrade.init()
                ]);
            }).then(() => {
                return this.reinitialize();
            }).then(() => {
                this.log("Finished bg script loading ", +new Date() - start);
            });

            addMessageListener();
        };
        
        /**
         * Monitor messages
         */
        const addMessageListener = () =>{
            $.api.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === $.opts.messageActions.updateToolbar) {
                    updateToolbar(sender.tab.id, message.value);

                }else if(message.action === $.opts.messageActions.iconActive) {
                
                }
            });
        }

        /**
         * Send message
         * @param {*} tabId 
         * @param {*} action 
         * @param {*} value 
         * @param {*} callback 
         */
        const sendContentScriptMessage = (tabId, action, value, callback) => {
            try {
                $.api.tabs.sendMessage(tabId, {action: action, value:value});
            } catch (error) {
                console.warn("Failed to send message:", err);
            }
        };

        /**
         * Update small badge
         * @param {*} tabId 
         * @param {*} value 
         */
        const updateToolbar = (tabId, value) => {
            const {text, toolbarIconFlash} = value;

            apiAction.setBadgeText({
                tabId: tabId,
                text: text
            });
            apiAction.setBadgeBackgroundColor({
                tabId: tabId,
                color: "#000000"
            });
            if(toolbarIconFlash){
                startIconAnimation();
            }
        };

        
        const startIconAnimation = () =>{
            if (this.animationInterval){
                stopIconAnimation();
            }

            const icons = [];
            const delay = 50; //Each group has a delay of 60ms.
            const picGroup = 7; //How many sets of pictures in total?
            const cycle = 1; //How many times to loop
            const totalDelay = delay * picGroup * cycle;

            for(var i = 1; i <= picGroup; i++){
                icons.push(generateIcons("effect/"+i));
            }

            let index = 0;
            let totalTime = 0;
            this.startIconAnimation = setInterval(()=>{
                if(totalTime>=totalDelay){
                    stopIconAnimation();
                    return;
                }
                apiAction.setIcon(icons[index]);
                index = (index + 1) % icons.length;
                totalTime += delay;
            }, delay);
        };

        /**
         * Pause animation
         */
        const stopIconAnimation = () => {
            if (this.animationInterval) {
                clearInterval(this.animationInterval);
                this.animationInterval = null;
            }
        }
       
        /**
         * Get image group
         * @param {*} folder 
         * @returns 
         */
        const generateIcons = (folder) =>{
            const icons = this.icons;
            if(icons.hasOwnProperty(folder)){
                return icons[folder];
            }

            const names = ["16", "48", "128", "256", "512"];
            const paths = {};
            for(var i = 0; i < names.length; i++){
                const name = names[i];
                paths[name] = $.api.runtime.getURL("media/img/icons/"+folder+"/icon-"+name+".png");
            }
            
            icons[folder] = {path:paths};
            this.icons = icons;

            return icons[folder];
        };


        const chromeOrFirefox = () =>{
			//Limited handling of installation issues.
            $.api.runtime.onInstalled.addListener((details) => {
                callOnInstalledCallback(details);//Multiple loop checks, whether upgrade is initialized.
            });

			//Redirect link after uninstallation
            $.api.runtime.setUninstallURL($.opts.website.jtm);
        }

        const safari = () =>{
            //All websites are popping up permission requests.
            $.api.tabs.onActivated.addListener(function (activeInfo) {
                $.api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {});
            });
            $.api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                $.api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {});
            });
        }

        //No logs for the official version.
        this.log = (msg)=>{
            if($.isDev){
                console.info(msg);
            }
        }
    };

    new background().run();
})(jsu);