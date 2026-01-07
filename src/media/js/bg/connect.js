($ => {
    "use strict";

    $.ConnectHelper = function (b) {

        this.init = async () => {
            const mapping = {
                langvars: b.helper.language.getLangVars,
                rtlLangs: b.helper.language.getRtlLanguages,
                languageInfos: b.helper.language.getAvailableLanguages,
                languageVars: b.helper.language.getVars,
                languageRefresh: b.helper.language.init,
                openLink:b.helper.util.openLink,
                closeLink:b.helper.util.closeLink,
                request: b.helper.request.getServerData,
                
                storageSessionGet:b.helper.storageSession.get,
                storageSessionSet:b.helper.storageSession.set,
                storageSessionRemove:b.helper.storageSession.remove,
                storageSessionClear:b.helper.storageSession.clear,
            };
            
            //Retrieve data or notification information from the background.
            $.api.runtime.onMessage.addListener((message, sender, callback) => {
                if (mapping[message.type]) { // function for message type exists
                    message.tabId = sender.tab ? sender.tab.id : null;
                    mapping[message.type](message).then((result) => {
                        callback(result);
                    }).catch((error)=>{
                        b.log(error);
                        callback();
                    });
                } else {
                    //Here, special messages are handled.
                    switch(message.type){
                        case "theme":
                            //b.helper.theme.setTheme(message.theme, false);
                            break;
                        default:
                            b.log("Unknown message type:" + message.type);
                    }
                    callback();
                }
                return true;
            });
        };
    };

})(jsu);