($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.RequestHelper = function (ext, support, supports) {

        //If not adapted, default to one.
        support = support || { p:"unsupported_x_1_x" };

        const cacheRequestMap = {};
        const baseUrl = $.opts.baseUrl;
        const urls = {
            exchangeInfo:{method:"GET", url: baseUrl+"/api/exchange/info"}, //Fetch api url list
            detectCoupon:{method:"POST", url: baseUrl+"/api/detect/coupon"},
            detectInfo:{method:"POST", url: baseUrl+"/api/detect/info"},
            getLangue:{method:"POST", url: baseUrl+"/api/load/lang"},
            couponQuery:{method: "GET", url: baseUrl+"/api/coupon/query"},
            couponChange:{method: "GET", url: baseUrl+"/api/coupon/change"},
            couponExist:{method: "GET", url: baseUrl+"/api/coupon/exist"}, //This is a cross-domain API interface.
            couponExistConf:{method: "GET", url: baseUrl+"/api/load/conf"}, //Pull existing configuration file (coupon query)
            searchEnginExistConf:{method: "GET", url: baseUrl+"/api/load/conf?origin=se"},//Search engine query
            engineScreen:{method:"POST", url:baseUrl+"/api/engine/screen"} //Get
        };
        
        const getBaseParams = () =>{
            const token = ext.helper.dao.getData($.opts.storageKeys.website.token, "");
            return {
                v: $.opts.apiVersion,       //The key for the coupon series API version number is v.
                version: $.opts.apiVersion, //The key for the version number of the detect series APIs is "version".
                no: $.opts.number,
                token: !!token? token : "",
            }
        }

        //////////////////////////////////////////////////////////////////
        //Coupon query function
        //////////////////////////////////////////////////////////////////
        
        /**
         * Add some additional request parameters.
         * @param {*} params 
         * @returns 
         */
        const addExtraParams = (params) =>{
            if(!params.hasOwnProperty("url")){
                params.url = encodeURIComponent(window.location.href);
            }
            return params;
        }

        this.requestAndSaveSate = function(method, url, param){
            return new Promise((resolve, reject)=>{
                const key = "key_"+(new Date()).getTime();
                const xhr = new XMLHttpRequest();
                cacheRequestMap[key] = xhr; // cache XMLHttpRequest
            
                if (method === 'GET') {
                    let queryString = '';
                    if (param) {
                        const params = new URLSearchParams(param);
                        queryString = '?' + params.toString();
                    }
                    xhr.open(method, url + queryString);
                    xhr.send();
                } else if (method === 'POST') {
                    xhr.open(method, url);
                    xhr.setRequestHeader('Content - Type', 'application/json');
                    xhr.send(JSON.stringify(param));
                } else {
                    resolve({"code":"error", "requestKey":key, "result":null});
                    return;
                }
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve({"code":"success", "requestKey":key, "result":xhr.responseText});
                            } catch (e) {
                                resolve({"code":"error", "requestKey":key, "result":null});
                            }
                        } else {
                            resolve({"code":"error", "requestKey":key, "result":null});
                        }
                    }
                };
            });
        };

        /**
         * Coupon Inquiry on Details Page
         * @param {*} params 
         * @returns 
         */
        this.getCouponQuery = async (params) =>{
            params = addExtraParams(params);
            params = Object.assign({}, params, getBaseParams());
            const { method, url } = urls.couponQuery;
            const finalUrl = url + "?" + Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");

            ext.logger("info", "couponQuery url:", finalUrl);
            return ext.helper.dao.call("request",{url:finalUrl, method:method, params:params});
        };

         /**
         * Pull QR code on the details page
         * @param {*} params 
         * @returns 
         */
        this.getCouponChange = async (params) =>{
            params = addExtraParams(params);
            params = Object.assign({}, params, getBaseParams());
            const { method, url } = urls.couponChange;
            const finalUrl = url + "?" + Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");

            ext.logger("info", "couponChange url:", finalUrl);
            return ext.helper.dao.call("request",{url:finalUrl, method:method, params:params});
        };

        /**
         * This request will be very frequent, directly use cross-origin requests on the webpage.
         * No parameter url required
         * Search interface query whether the coupon exists
         */
        this.getCouponExist = async (params) =>{
            params = Object.assign({}, params, getBaseParams());
            const { method, url } = urls.couponExist;
            const finalUrl = url + "?" + Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");
            
            ext.logger("info", "getCouponExist url:", finalUrl);
            return this.requestAndSaveSate("GET", finalUrl, null);
        };

        /**
         * Pull configuration file
         * No parameter url required
         * Search interface query whether the coupon exists
         */
        this.requestCouponExistConf = function(){
            const { method, url } = urls.couponExistConf;
            return new Promise((resolve, reject) => {
                ext.helper.dao.call("request",{url:url, method:method, params:null}).then((data)=>{
                    if(data.code=="success" && !!data.result){
                        resolve(data.result);
                    }else{
                        resolve(null);
                    }
                }).catch((error)=>{
                    resolve(null);
                });
            });
        };

        this.removeRequest = function(requestKey){
            delete cacheRequestMap[requestKey];
        };

        this.abortAllRequests = function(){
            Object.keys(cacheRequestMap).forEach(key => {
                cacheRequestMap[key].abort();
                delete cacheRequestMap[key];
            });
        };


        //////////////////////////////////////////////////////////////////
        //Coupon exploration related features
        //////////////////////////////////////////////////////////////////

        /**
         * This is a parameter customized for different platforms.
         * @param {*} platform 
         * @returns 
         */
        const getDynamicParams = async (platform) =>{
            let marketplace = "", currency = "", countryCode="";
            try {
                if(platform === supports.aliexpress.p){
                    const aliexpress = ext.helper.coupon.aliexpress;
                    marketplace = await aliexpress.getMarketplace();
                    currency = await aliexpress.getCurrency();

                }else if(platform === supports.banggood.p){
                    const banggood = ext.helper.coupon.banggood;
                    countryCode = banggood.getMarketplace();
                    currency = await banggood.getCurrency();
                    marketplace = encodeURIComponent(JSON.stringify({"countryCode":countryCode, "className":"", "html":""}));

                }else{
                    countryCode = ext.helper.util.getCommonMarketplace();
                    marketplace = encodeURIComponent(JSON.stringify({"countryCode":countryCode, "className":"", "html":""}));

                }
            } catch (error) {
                ext.logger("error", "getDynamicParams===========>", error);
            }
            ext.logger("info", "getDynamicParams===========>", platform, marketplace, currency);
            return {marketplace:marketplace, currency:currency};
        }

        const getDetectCouponParams = async function(){

            const platform = support.p;
            const {marketplace, currency} = await getDynamicParams(platform);

            let lang = ext.helper.i18n.getLanguage();
            if(lang === "default"){
                lang = $.opts.manifest.default_locale;
            }
            let params = {
                platform: support.p,
                url: window.location.href,
                lang:lang,
                marketplace:marketplace,
                currency:currency,
            };
            params = Object.assign({}, params, getBaseParams());
            return params;
        };

        /**
         * Configuration file for obtaining coupon list.
         * @returns 
         */
        this.getDetectInfoResult = async function () {
            const params = await getDetectCouponParams();
            const { method, url } = urls.detectInfo;
            ext.logger("info", "detect info result params===========>", method, url, JSON.stringify(params));

            return new Promise((resolve) => {
                ext.helper.dao.call("request",{url:url, method:method, params:params}).then((data)=>{
                    if(data.code=="success" && !!data.result){
                        resolve(JSON.parse(data.result));
                    }else{
                        resolve(null);
                    }
                }).catch((error)=>{
                    resolve(null);
                });
            });
        };

        /**
         * Get coupon list
         * @returns 
         */
        this.getDetectCouponResult = async function () {
            const params = await getDetectCouponParams();
            const { method, url } = urls.detectCoupon;
            ext.logger("info", "detect coupon result params===========>", method, url, JSON.stringify(params));

            return new Promise((resolve) => {
                ext.helper.dao.call("request",{url:url, method:method, params:params}).then((data)=>{
                    if(data.code=="success" && !!data.result){
                        resolve(JSON.parse(data.result));
                    }else{
                        resolve(null);
                    }
                }).catch((error)=>{
                    resolve(null);
                });
            });
        };


        //////////////////////////////////////////////////////////////////
        //Browser Rebate Scanning Related Features
        //////////////////////////////////////////////////////////////////

        const getEngineScreenParams = (lists, platform)=> {
            let lang = "en";
            try{
                lang = document.documentElement.lang
            }catch(e){}

            let params = {
                traffic_origin:platform,
                lang: lang,
                s_engine_parms:lists
            };
            params = Object.assign({}, params, getBaseParams());
            return params;
        };

        this.requestEngineScreenConf = function(){
            const { method, url } = urls.searchEnginExistConf;
            return new Promise((resolve, reject) => {
                ext.helper.dao.call("request",{url:url, method:method, params:null}).then((data)=>{
                    if(data.code=="success" && !!data.result){
                        resolve(JSON.parse(data.result));
                    }else{
                        resolve(null);
                    }
                }).catch((error)=>{
                    resolve(null);
                });
            });
        };

        this.getEngineScreenResult = function(lists,platform){
            const params = getEngineScreenParams(lists, platform);
            const { method, url } = urls.engineScreen;
            return new Promise((resolve) => {
                ext.helper.dao.call("request",{url:url, method:method, params:params}).then((data)=>{
                    if(data.code=="success" && !!data.result){
                        resolve(JSON.parse(data.result));
                    }else{
                        resolve(null);
                    }
                }).catch((error)=>{
                    resolve(null);
                });
            });
        };

        //////////////////////////////////////////////////////////////////
        //Fetching tokens, etc., should be placed in the first position.
        //////////////////////////////////////////////////////////////////
        
        /**
         * Get token, combine 2 steps together.
         */
        this.initRequestData = async ()=> {
            try {
                const now = Date.now();

                let exchangeInfoLocal = ext.helper.dao.getData($.opts.storageKeys.website.exchangeInfo, null);
                ext.logger("info", "local=====>", exchangeInfoLocal,$.opts.updateExchangeInfoDelay);
                const needFetchConfig = !exchangeInfoLocal
                    || (exchangeInfoLocal.time && now - exchangeInfoLocal.time > $.opts.updateExchangeInfoDelay);

                if (needFetchConfig) {//Need to update data
                    try {
                        const {url, method} = urls.exchangeInfo;
                        const exchangeInfoServer = await ext.helper.dao.call("request",{url:url, method:method, params:null});
                        ext.logger("info", "exchangeInfo====>",url,method);
                        if(exchangeInfoServer.code=="success" && !!exchangeInfoServer.result){
                            const exchangeInfoJsonServer = JSON.parse(exchangeInfoServer.result);
                            const { certificate, redirect } = exchangeInfoJsonServer;
                            exchangeInfoLocal = {
                                "certificate":certificate,
                                "redirect":redirect,
                                "time": now,
                            };
                            ext.logger("info", "server update=====>", exchangeInfoLocal);
                            await ext.helper.dao.setDataByKey($.opts.storageKeys.website.exchangeInfo, exchangeInfoLocal);
                        }else{
                            ext.logger("error", "exchangeInfo====>null");
                        }
                    } catch (error) {
                        ext.logger("error", "exchangeInfo====>error", error);
                    }
                }

                //Redundancy processing is performed here.
                if(!exchangeInfoLocal || !exchangeInfoLocal.certificate) {
                    exchangeInfoLocal = ext.helper.dao.getDefaults().w.exchangeInfo;
                }

                //Request token
                try {
                    const tokenData = await ext.helper.dao.call("request",{url:exchangeInfoLocal.certificate, method:"post", params:null});
                    if(tokenData.code=="success" && !!tokenData.result){
                        const {token} = JSON.parse(tokenData.result);
                        await ext.helper.dao.setDataByKey($.opts.storageKeys.website.token, !!token ? encodeURIComponent(token) : "");
                        ext.logger("info", "token====>", token);
                    } else {
                        ext.logger("info", "Token====>null");
                    }
                } catch (error) {
                    ext.logger("error", "get token error====>", error);
                }
            } catch (error) {
                ext.logger("error", "get token error====>", error);
            }
        };

    };
})(jsu);