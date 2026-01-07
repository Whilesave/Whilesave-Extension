($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.DaoHelper = function (ext) {
        //Data stored separately for easy management.
        const scopes = [
            {name:"position", alias:"p"}, //Location information
            {name:"setting", alias:"s"},   //Settings Information
            {name:"history", alias:"h"},   //History record
            {name:"website", alias:"w"}
        ];

        //Default value
        const defaults = {
            p:{
                logoTop: 100,
            },
            s:{

            },
            h:{
                record: {},
                offset:{right: 10, bottom: 10},
                number:100,
                number_min: 10,
                number_max:500,
                toolbar_number:4,
            },
            w:{
                supportObj:null,
                userToken:"",
                exchangeInfo: {
                    certificate:"https://www.jtmate.com/api/certificate",
                    redirect:"https://www.jtmate.com/mid/redirect?url="
                }
            }
        };
    	
    	let data = {};

        this.getDefaults = ()=>{
        	return defaults;
        }

        /**
         * Initialises the model
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                Promise.all([
	                refresh()
                ]).then(resolve);
            }).catch(()=>{});
        };

        /**
         * Sends a message to the background script and resolves when receiving a response
         *
         * @param {string} key
         * @param {object} opts
         * @param {number} retry
         * @returns {Promise}
         */
        this.call = async (key, opts = {}, retry = 0) => {
            
            let backendDead = false;
            
            opts.type = key;

            let response = await $.api.runtime.sendMessage(opts)["catch"]((err) => {
                if (err && ("" + err).includes("Could not establish connection")) {
                    backendDead = true;
                } else {
                    if ($.isDev) {
		               console.log(err);
		            }
                }
            });

            if (backendDead && retry < 50) { // backend got killed by the browser -> it should restart and be available after a short delay, so we try again
                await $.delay(100);
                response = await this.call(key, opts, retry + 1);
            }

            return response;
        };
        
        
        /**
         * Returns the name of the given alias
         * e.g. "b" -> "behaviour"
         *
         * @param alias
         * @returns {*}
         */
        const getNameByAlias = (alias) => {
            const scope = scopes.find((scope) => scope.alias === alias);
            if(scope){
                return scope.name;
            }
            return null;
        };
        
       /**
         *
         * @returns {Promise}
         */
        const refresh = () => {
            return new Promise((resolve) => {
            	
            	if($.api.runtime.id == undefined) resolve();
                
                const keys = scopes.map((scope) => scope.name);
                const newData = {};

                const len = keys.length;
                let loaded = 0;
                keys.forEach((key) => {

                    $.api.storage.local.get([key], (obj) => {
                        newData[key] = obj[key] || {};

                        if (++loaded === len) { // all data loaded from storage -> resolve promise
                            data = newData;
							resolve();
                        }
                    });
                });
            });
        };
        
        /**
         * Retrieves the stored values for the given keys,
         * if a value is undefined, it will be set to the default value
         *
         * @param {object|string} keys
         * @param {boolean} defaultVal
         */
        this.getData = (keys, defaultVal = false) => {
            let configKeys = keys;
            if (typeof configKeys === "string") {
                configKeys = [configKeys];
            }

            let result = {};
            configKeys.forEach((keyInfo) => {
                const alias = keyInfo.split("/")[0];//eg,a
                const key = keyInfo.split("/")[1];//eg,styles
                let value = null;
                let needsDefault = false;

                const scopeName = getNameByAlias(alias);//eg,appearance
                if (scopeName && data[scopeName]) { //apperarance is a
                    if(typeof data[scopeName][key] !== "undefined"){
                        value = data[scopeName][key];
                    }else{
                        needsDefault = true;
                    }
                }else{
                    needsDefault = true;
                }
                //Determine whether to add default values.
                if (needsDefault && defaultVal) {
                    if (typeof defaults[alias] !== "undefined" && typeof defaults[alias][key] !== "undefined") {
                        value = defaults[alias][key];
                    }
                }
                result[key] = value;
            });
            if (typeof keys === "string") {
                const key = keys.split("/")[1];
                result = result[key];
            }
            return result;
        };

        this.setDataByKey = (key, value) => {
            const update = {};
            update[key] = value;
            return this.setData(update);
        };
        
        /**
         * Saves the given values in the storage
         *
         * @param {object} values
         * @returns {Promise}
         */
        this.setData = (values) => {
            return new Promise((resolve) => {
                refresh().then(() => { // refresh to retrieve the newest data
                    Object.keys(values).forEach((keyInfo) => {
                        const alias = keyInfo.split("/")[0];
                        const key = keyInfo.split("/")[1];
                        const value = values[keyInfo];
                        const scope = scopes.find((scope) => scope.alias === alias);
                        if(scope){
                            data[scope.name][key] = value;
                        }
                    });

					//No need to determine if everything is completed here.
                    const saved = () => {
                        resolve();
                    };
                    try { // can fail (e.g. MAX_WRITE_OPERATIONS_PER_MINUTE exceeded)
                        $.api.storage.local.set({
							position: data.position,
							setting: data.setting,
                            history: data.history,
                            website: data.website
						},() => {
                            const error = $.api.runtime.lastError;
                            if (error && error.message) {} //Do nothing
                            saved();
                        });
                    } catch (e) {
                        resolve();
                    }
                });
            });
        };
    };
})(jsu);
