($ => {
    "use strict";
    /**
     * @param {*} ext 
     */
    $.SettingHelper = function (ext) {

        let settingDialogShadowRoot = null;

        /**
         * Set Language -> Refresh Language -> Refresh i18n -> Refresh UI
         * @param {*} lang 
         * @returns 
         */
        const setLanguage = (language) =>{
            return new Promise((resolve) => {
                $.api.storage.local.set({language: language}, () => { //Set language
                    ext.helper.dao.call("languageRefresh").then(()=>{ //Refresh language
                        ext.helper.i18n.init().then(()=>{ //Refresh i18n
                            SettingOperat.refreshUI(); //Refresh UI
                            resolve();
                        }).catch(()=>{
                            resolve();
                        });
                    }).catch(()=>{
                        resolve();
                    });
                });
            });
        };

        /**
         * Get detailed data for the current language
         * @param {*} language 
         * @returns {langVars, name, label}
         */
        const getLanguageVars = (language) =>{
            return ext.helper.dao.call("languageVars",{language:language});
        };

        const generateDialogHtml = async (number) =>{
            const {number_min, number_max} = ext.helper.dao.getDefaults().h;
            const html = `
                <div class="setting-piece">
                    <div class="setting-title" langue-extension-text="setting_modal_langue_title">`+ext.helper.i18n.get("setting_modal_langue_title")+`</div>
                    <div class="setting-description" langue-extension-text="setting_modal_langue_description">`+ext.helper.i18n.get("setting_modal_langue_description")+`</div>
                    <div class="language-switcher" id="language-switcher">
                        <div class="selected">
                            <span id="selected-language">`+ext.helper.i18n.getLanguageLabel()+`</span>
                        </div>
                        <ul id="language-options" class="switcher-ul"></ul>
                    </div>
                </div>
                <div class="setting-piece">
                    <div class="setting-title" langue-extension-text="setting_modal_history_title">`+ext.helper.i18n.get("setting_modal_history_title")+`</div>
                    <div class="setting-description" langue-extension-text="setting_modal_history_description">
                        `+ext.helper.i18n.get("setting_modal_history_description",[number_min, number_max])+`
                    </div>
                    <input type="text" id="maximum-records"
                    langue-extension-placeholder="setting_modal_history_max_placeholder" placeholder="`+ext.helper.i18n.get("setting_modal_history_max_placeholder")+`" value="${number}">
                </div>
                <div class="setting-piece ">
                    <div class="setting-title" langue-extension-text="setting_modal_clear_title">`+ext.helper.i18n.get("setting_modal_clear_title")+`</div>
                    <div class="setting-description" langue-extension-text="setting_modal_clear_description">`+ext.helper.i18n.get("setting_modal_clear_description")+`</div>
                    <button class="setting-clear-cache" id="clear-cache" langue-extension-text="setting_modal_clear_btn">`+ext.helper.i18n.get("setting_modal_clear_btn")+`</button>
                </div>
            `;
            const cssObj = await ext.helper.styleHelper.readCssContent(["setting"]);
            return {"styleSheet":cssObj.setting, "content":html};
        };

        /***
         * Language switching operation function
         */
        const SettingOperat = {
            //Implement custom language switching
            refreshUI:() =>{
                const queryDirectionElements = (elements, selector) =>{
                    return elements.flatMap(div => div ? Array.from(div.querySelectorAll(selector)) : []);
                }
                const cacheContainers = ext.helper.cacheContainers.getAll();
                //Refresh the language of the current settings interface.
                if(settingDialogShadowRoot){
                    cacheContainers.push(settingDialogShadowRoot);
                }

                const elementsWithLangue = queryDirectionElements(cacheContainers, '*[langue-extension-text],*[langue-extension-placeholder]');
                const directions = queryDirectionElements(cacheContainers, "*[data-extension-direction]");

                const {number_min, number_max} = ext.helper.dao.getDefaults().h;
                directions.forEach((element)=>{
                    element.setAttribute("data-extension-direction", ext.helper.i18n.getDir());
                });
                elementsWithLangue.forEach((element)=>{
                    let langueTextKey = element.getAttribute("langue-extension-text"); //Need to update text
                    if(langueTextKey){
                        //Requires special handling
                        if("setting_modal_history_description"===langueTextKey){
                            element.innerText = ext.helper.i18n.get(langueTextKey,[number_min, number_max]);
                        }else{
                            element.innerText = ext.helper.i18n.get(langueTextKey);
                        }
                    }
                    let languePlaceholderKey = element.getAttribute("langue-extension-placeholder"); //Need to update placeholder
                    if(languePlaceholderKey){
                        element.setAttribute("placeholder", ext.helper.i18n.get(langueTextKey));
                    }
                });
            },
            changeLanguage: async ($content, language, languageLabel)=>{
                $content.querySelector("#selected-language").innerText = languageLabel;
                SettingOperat.toggleDropdown($content, false);
                await setLanguage(language);
            },
            toggleDropdown:($content,forceClose = null)=>{
                const switcher = $content.querySelector("#language-switcher");
                if (forceClose === false || switcher.classList.contains("open-ul")) {
                    switcher.classList.remove('open-ul');
                } else {
                    switcher.classList.add('open-ul');
                }
            },
            languageSwitcher:($content, languageInfos)=>{
                const languageOptions = $content.querySelector("#language-options");
                for(let key in languageInfos){
                    let languageInfo = languageInfos[key];
                    const li = document.createElement('li');
                    li.classList.add("switcher-item-li");
                    li.textContent = languageInfo.languageLabel;
                    li.setAttribute("data-language", languageInfo.language);

                    li.addEventListener("click",(e)=>{
                        SettingOperat.changeLanguage($content, languageInfo.language, languageInfo.languageLabel);
                    })
                    languageOptions.appendChild(li);
                }

                const switcher = $content.querySelector(".selected");
                switcher.addEventListener("click", ()=>{
                    SettingOperat.toggleDropdown($content);
                });
                $content.addEventListener('click', (e) => {
                    if (!switcher.contains(e.target)) {
                        SettingOperat.toggleDropdown($content, false);
                    }
                });
            }
        };


        this.showDialog = async (callback) =>{
            const {number_min, number_max} = ext.helper.dao.getDefaults().h;
            const currentNumber = ext.helper.dao.getData($.opts.storageKeys.history.number, ext.helper.dao.getDefaults().h.number);

            const languageInfos = await ext.helper.dao.call("languageInfos");
            ext.logger("info", "setting dialog language >", languageInfos);

            const {styleSheet, content} = await generateDialogHtml(currentNumber);
            const dialog = new $.DialogHelper();

            dialog.showMake({
                title: ext.helper.i18n.get("setting_modal_title"),
                content: content,
                styleSheet: styleSheet,
                direction:ext.helper.i18n.getDir(),
                onContentReady:function($that){

                    SettingOperat.languageSwitcher($that.dialogContent, languageInfos.infos);
                    settingDialogShadowRoot = $that.shadowRoot;

                    const $input = $that.dialogContent.querySelector("#maximum-records");
                    const $clearCache = $that.dialogContent.querySelector("#clear-cache");
                    $input.onchange=function(e){
                        const value = this.value;
                        if(value>=number_min && value<=number_max){
                            ext.helper.dao.setDataByKey($.opts.storageKeys.history.number, value);
                        }
                    };
                    $clearCache.addEventListener("click",function(){
                        if(confirm(ext.helper.i18n.get("setting_modal_clear_confirm"))){
                            if(callback) callback();
                            ext.helper.dao.setDataByKey($.opts.storageKeys.history.record, ext.helper.dao.getDefaults().h.record);
                        }
                    });
                },
                onClose:function(){
                    settingDialogShadowRoot = null; //Clear dialog object reference
                }
            });
        };
    };
})(jsu);