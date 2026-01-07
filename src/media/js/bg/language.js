($ => {
    "use strict";

    $.LanguageHelper = function (b) {

        //en, es, ar, fr, pt, ru, ja, de, ko, it, id, tr, pl, uk, nl, vi, ms, th, es-MX, es-CL, fa, zh-CN, zh-TW
        const allLanguages = {
            default: "Default",
            en: "English",
            es: "Español",
            ar: "العربية",
            fr: "Français",
            pt: "Português",
            ru: "Русский",
            ja: "日本語",
            de: "Deutsch",
            ko: "한국어",
            it: "Italiano",
            id: "Bahasa Indonesia",
            tr: "Türkçe",
            pl: "Polski",
            uk: "Українська",
            nl: "Nederlands",
            vi: "Tiếng Việt",
            ms: "Bahasa Melayu",
            th: "ไทย"
        };

        const rtlLangs = ["ar", "fa", "he"];
        const aliasLangs = {pt: "pt_PT"};

        let language = null;
        let languageLabel = null;
        let langVars = {};
        let isRtl = false;
        let availableLanguages = {};

        /**
         * Initialises the language file
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
            	$.api.storage.local.get(["language"], (data) => {

                    let lang = null;
					if(data && data.language){
						lang = data.language;
					}

                    //Verify the reliability of the language.
                    const possible = possibleLang(lang);
                    const fallbackLang = possible.fallbackLang;
                    const defaultLang = possible.defaultLang;
                    lang = possible.lang;
                    
                    this.getAvailableLanguages().then((obj) => {
                        //Save the list of reliable languages for possible future use.
                        availableLanguages = obj;
                        [lang, fallbackLang, defaultLang].some((_language) => { // check if user language exists, if not fallback to default language
                            if (_language !== null && obj && obj.infos && obj.infos[_language] && obj.infos[_language].available) {
                                
                                language = _language;
                                languageLabel = allLanguages[_language];
                                isRtl = rtlLangs.indexOf(language) > -1;
                                
                                getVars(_language, defaultLang).then((data) => { // load language variables from model
                                    if (data && data.langVars) {
                                        langVars = data.langVars;
                                        resolve();
                                    }
                                });
                                return true;
                            }
                        });
                    });
                });
            });
        };

        /**
         * Returns the UI language of the browser in the format "de_DE" or "de"
         *
         * @returns {string}
         */
        this.getUILanguage = () => {
            try{
        		let ret = $.api.i18n.getUILanguage();//Some browsers cannot use this interface, so try catch.
	            ret = ret.replace("-", "_");
	            return ret;
        	}catch(err){
        		;
        	}
            return $.opts.manifest.default_locale;
        };

        /**
         * Returns the language which is used for the language variables
         *
         * @returns {string}
         */
        this.getLanguage = () => language;

        /**
         *
         * @returns {Promise}
         */
        this.getRtlLanguages = async () => rtlLangs;

        /**
         * Returns the name and the language variables of the user language
         * This method will be called when other pages are initialized, and it must ensure that this object has been fully initialized before returning.
         * @returns {Promise}
         */
        this.getLangVars = () => {
            return new Promise((resolve) => {
                const checkTask = () => {
                    if (language) {
                        resolve({
                            language: language,
                            languageLabel: languageLabel,
                            dir: isRtl ? "rtl" : "ltr",
                            vars: langVars
                        });
                    } else {
                        setTimeout(checkTask, 100);
                    }
                };
                checkTask();
            });
        };


        /**
         * @param {*} opts 
         * @returns 
         */
        this.getVars = (opts) =>{
            return getVars(opts.language, $.opts.manifest.default_locale);
        }

        /**
         * Returns the information about the all languages
         *
         * @returns {Promise}
         */
        this.getAvailableLanguages = () => {
            return new Promise((resolve) => {
                const total = Object.keys(allLanguages).length;
                let loaded = 0;
                const infos = {};
                Object.keys(allLanguages).forEach((lang) => {
                    infos[lang] = {
                        language: lang,
                        languageLabel: allLanguages[lang],
                        available: false
                    };
                    const fetchDone = () => {
                        if (++loaded === total) {
                            resolve({infos: infos});
                        }
                    };

                    //test whether is available
                    $.fetch($.api.runtime.getURL("_locales/" + lang + "/messages.json"), {method: "HEAD"}).then(() => {
                       infos[lang].available = true;
                       fetchDone();
                    }, fetchDone).catch(err => {});
                });
            });
        };

        /**
         * Determines all languages with incomplete translations
         *
         * @returns {Promise}
         */
        this.getIncompleteLanguages = () => {
            return new Promise((resolve) => {
                $.xhr($.opts.website.translation.info).then((xhr) => {
                    const infos = JSON.parse(xhr.responseText);
                    const incompleteLangs = [];

                    if (infos && infos.languages && infos.categories) {
                        let totalVars = 0;
                        Object.values(infos.categories).forEach((cat) => { // determine the total amount of language variables
                            totalVars += cat.total;
                        });

                        infos.languages.forEach((lang) => { // add all languages with incomplete amount of variables to list
                            if (lang.varsAmount < totalVars) {
                                incompleteLangs.push(lang.name);
                            }
                        });
                    }

                    resolve(incompleteLangs);
                });
            });
        };

        /**
         * Returns the language variables for the given language
         *
         * @param {string} lang
         * @param {string} defaultLang
         * @returns {Promise}
         */
        const getVars = (lang, defaultLang = null) => {
            return new Promise((resolve) => {
                if (lang) {
                    const sendXhr = (obj) => {
                        const langVars = obj.langVars;

                        $.fetch($.api.runtime.getURL("_locales/" + lang + "/messages.json")).then((res) => {
                          
                            res.json().then(data=>{
                            	Object.assign(langVars, data); // override all default variables with the one from the language file
                            	resolve(
                                    {
                                        langVars: langVars,
                                        language:lang,
                                        languageLabel: allLanguages[lang],
                                    }
                                );
                            })
                        }).catch(err => {});
                    };

                    if (defaultLang && defaultLang !== lang) { // load default language variables first and replace them afterwards with the language specific ones
                        getVars(defaultLang, null).then(sendXhr);
                    } else {
                        sendXhr({langVars: {}});
                    }
                }
            });
        };

        /**
         * Obtain possible language codes
         * @param {*} lang 
         * @param {*} defaultLang 
         * @returns 
         */
        const possibleLang = (lang) =>{

            let fallbackLang = null;
            if (!lang || lang === "default") {
                const uiLanguage = this.getUILanguage();
                if(uiLanguage){
                    lang = uiLanguage;
                }
            }

            lang = lang.replace("-", "_");
            if (aliasLangs[lang]) { // language code is an alias for another one (e.g. pt -> pt_PT)
                lang = aliasLangs[lang];
            }

            if (lang.indexOf("_") > -1) { // search for a language file with short language code, too (e.g. de_DE -> de)
                fallbackLang = lang.replace(/_.*$/, "");
            }

            const defaultLang = $.opts.manifest.default_locale
            return {lang: lang, fallbackLang: fallbackLang, defaultLang: defaultLang};
        };
    };

})(jsu);