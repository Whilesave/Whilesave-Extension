($ => {
    "use strict";
    
    $.MidListenerHelper = function(ext){
        this.run = function(){

            $.onPageLoad(()=>{
                const autoRedirect = document.querySelector(".auto-redirect");
                if(autoRedirect){
                    const dataContent = autoRedirect.getAttribute("data-content");
                    if(dataContent){
                        const json = JSON.parse(dataContent);
                        ext.helper.util.customOpenUrl(null, json);
                    }
                }
            });
        };
    };

    /**
     * @param {*} ext 
     * Coupon-specific methods, such as automatic redirection, unique encryption methods, etc.
     */
    $.UtilHelper = function (ext) {

        /**
         * Add an immediate loop task
         * @param callback 
         * @param delay 
         * @returns 
         */
        this.loopTask = function(callback, delay=1500) {
            if(!callback) return;
            callback();
            setInterval(()=>{
                callback();
            }, delay);
        };

        /**
         * 
         * @param {*} date 
         * @param {*} format "dd/MM"
         * @returns 
         */
        this.dateFormat = function(date,format){
            var showDate = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S+": date.getMilliseconds()
            };
            if (/(y+)/i.test(format)) {
                format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
            }
            for (var k in showDate) {
                if (new RegExp("(" + k + ")").test(format)) {
                    format = format.replace(RegExp.$1, RegExp.$1.length == 1
                        ? showDate[k] : ("00" + showDate[k]).substr(("" + showDate[k]).length));
                }
            }
            return format;
        };

        this.getParamterBySearch = function(paramsString=window.location.href, tag){
            if(paramsString.indexOf("?")!=-1){
              paramsString = paramsString.split('?')[1]; // Extract the query string
            }
            const params = new URLSearchParams(paramsString);
            return params.get(tag);
        };

        this.getGoodsIdByLink = function(url=window.location.href) {
            if(url.indexOf("?")!=-1){
              url = url.split("?")[0];
            }
            if(url.indexOf("#")!=-1){
              url = url.split("#")[0];
            }

            const suffix = "html|htm|id|p";
            let regex = new RegExp("\\/([^\\/]*?)\\.(" + suffix + ")"); //This is a universal method.
            if(/lazada\./.test(url)){ //This is customized for Lazada based on different platforms.
              regex = new RegExp("-i(\\d+)(?:-s(\\d+))?\\.html");
            }else if(/ebay\./.test(url)){ //This is customized for eBay based on different platforms.
              regex = new RegExp("\\/itm\\/(\\d+)");
            }else if(/banggood\./.test(url)){ //This is customized for different platforms on Banggood.
                regex = new RegExp("-p-(\\d+)\\.html");
            }else if(/amazon\./.test(url)){ //This is customized for Amazon based on different platforms.
                regex = new RegExp("\\/(?:dp|gp\\/product|gp\\/aw\\/d|gp\\/offer-listing)\\/([A-Za-z0-9]{8,15})");
            }
            const match = url.match(regex);
            return match ? match[1] : null;
        };

        this.randomNumber = function() {
            return Math.ceil(Math.random()*100000000);
        };

        this.generateRandomString = function(length=10) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        };

        this.distinguishRemoveAndTry = function(distinguish, callback) {
            const distinguishElements = distinguish.map((name)=>document.querySelector("*[name='"+name+"']"));
            const validateRs = distinguishElements.some((ele)=> ele===null||ele===undefined);
            if(validateRs){
                distinguishElements.reverse().forEach((element)=>{
                    if(element){
                        element.remove();
                    }
                });
                callback();
            }
        };

        this.getDomain = function(url) {
            try {
                const hostname = new URL(url).hostname; //Get the full hostname
                const parts = hostname.split('.'); //Split hostname by dots
                if (parts.length > 2) {
                    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`; //Take the last two parts
                }
                return hostname; //For simple hostnames like localhost
            } catch (error) {
                console.error('Invalid URL:', error);
                return null;
            }
        };

        this.getCommonMarketplace = function(url=window.location.href) {
            try {
                const domainParts = new URL(url).hostname.split('.');
                const countryCode = domainParts[domainParts.length - 1];
                return countryCode;
            } catch (error) {}
            return null;
        };

        this.decryptStr = function(str) {
            if(!str){
                return str;
            }
            let result = atob(str);
            return result.split('').reverse().join('');
        };

        this.encryptStr = function(str) {
            if(!str){
                return str;
            }
            let result = str.split('').reverse().join('');
            return btoa(result);
        };

        this.bindCustomEvent = function(element, callback={}) {
            if(!element){
              return;
            }
            element.addEventListener('click', () => {
                try{
                    const dataContent = element.getAttribute("data-content");
                    const operate = element.getAttribute("name");
            
                    const json = JSON.parse(dataContent);
                    this.customOpenUrl(element, json, operate, callback);
                }catch(e){}
            });
        };

        this.bindApplyCouponsEvent = function(button, callback={}){
            if(!button){
                return;
            }
            button.addEventListener("click",()=>{
                const dataContent = button.getAttribute("data-content");
                if(dataContent){
                    const dataContentJson = JSON.parse(dataContent)[0];
                    if(dataContentJson.hasOwnProperty("codes")
                    && dataContentJson.hasOwnProperty("platform")
                    && dataContentJson.hasOwnProperty("check")){
                        callback(dataContentJson);
                    }
                }
            });
        };

        this.customOpenUrl = function (element, json, operate="clickToJump", callback={}){
            const options = [];
            for(let i=0; i<json.length; i++){
                const item = json[i];
                const option = {
                    "affLink":this.decryptStr(item.affLink),
                    "close":item.close,
                    "pause":item.pause,
                    "delay":item.delay,
                    "target":item.target,
                    "active":item.active,
                    "position":item.position,
                    "dismissAfter":item.dismissAfter,
                    "callbackEvent":item.callbackEvent,
                    "pinned":item.pinned
                };
                let code =  item.code, msg = item.msg;
                if(code){
                    this.setClipboard(this.decryptStr(code));
                    if(element){
                        element.innerText = msg;
                    }
                }
                options.push(option);
                if (callback && typeof callback === 'function') {
                    callback(option);
                }
            }
            //Analyze the data first, then agree to execute the jump mission.
            options.sort((a, b) => (a.target === "_blank" ? -1 : b.target === "_blank" ? 1 : 0))
            .forEach((option,index)=>{
                setTimeout(() => {
                    this.openUrl(option);
                }, index * 100); //Each delay index * 100ms
            });
        };

        /**
         * @param {Object} active  Whether it is active
         * @param {Object} affLink The link to open
         * @param {Object} close true: need to close the opened tab
         * @param {Object} pause, delay close
         * @param {Object} delay, delay opening
         * @param {Object} position begin end after 
         * @param {Object} target  _self,_blank,_replace
         * @param {Object} pinned true: fixed tab, only meaningful when target=_blank
         * _blank uses the interface GM_openInTab provided by Tampermonkey, while others use window.location.replace or window.location.href.
         */
        this.openUrl = function(options) {
            const {active, affLink, close, pause, delay, position, target, pinned} = options;
            let realAffLink = affLink;
            if(!realAffLink){
                return;
            }
            if(realAffLink.indexOf("http")==-1){
                realAffLink = this.decryptStr(affLink);
            }
            let extensionTabPosition = null;
            if(position){
                if(position==="begin"){
                    extensionTabPosition = "beforeFirst"; //Open before the first tab.
                }else if(position==="end"){
                    extensionTabPosition = "afterLast"; //Open after the last tag.
                }
            }

            if(target==="_blank"){ //Only with this value do active and position have meaning.
                setTimeout(()=>{ //Delay open
                    ext.helper.dao.call("openLink", {
                        href:realAffLink,
                        newTab: true,
                        active: active,
                        position: extensionTabPosition,
                        pinned: (pinned==="true"||pinned===true)
                    }).then((tabId)=>{
                        if(close && tabId){
                            setTimeout(()=>{ //Delayed Shutdown
                                ext.helper.dao.call("closeLink",{id:tabId});//It can only be id; tabId will be overwritten in background messages.
                            }, pause);
                        } 
                    });
                }, delay);
            }else if(target==="_self"){
                setTimeout(()=>{ //Delay open
                    window.location.href = realAffLink;
                }, delay);
            }else if(target==="_replace"){
                setTimeout(()=>{ //Delay open
                    window.location.replace(realAffLink);
                }, delay);
            }
        };

        this.openInTab = function(url) {
            ext.helper.dao.call("openLink", {
                href:url,
                newTab: true,
                active: true
            }).then((tabId)=>{});
        };

        this.setClipboard = function(text) {
            return new Promise((resolve, reject)=>{
                navigator.clipboard.writeText(text).then(()=>{
                    resolve();
                }).catch(()=>{
                    resolve();
                });
            });
        };

        this.removeAnchorsByNode = function(node) {
            const tagName = node.tagName;
            if(!tagName) return;
        
            const exist = ["A","IMG","DIV","SPAN","LABEL","TABLE","TR","TD","CANVAS"].some(name => name===tagName);
            if(exist){
                node.removeAttribute("data-spm-anchor-id");
                for (let i = 0; i < node.childNodes.length; i++) {
                    this.removeAnchorsByNode(node.childNodes[i]);
                }
            }
        };

        this.getGoodsLinkByElement = function(element, findTag){
            let searchElement = null;
            if(findTag=="this"){ //The a tag is itself.
              searchElement = element;
            }else if(/^child@/.test(findTag)){
              searchElement = element.querySelector(findTag.replace(/^child@/,""));
            }
            return searchElement;
        };

        this.calcRequestGroup = function(array, itemsPerGroup=20){
            const groups = [];
            for (let i = 0; i < array.length; i += itemsPerGroup) {
                groups.push(array.slice(i, i + itemsPerGroup));
            }
            return groups;
        };

        this.pickupGoodsItem = function(platform, confString){
            const visitHref = window.location.href;
            const selectorElementList = new Array();
            let confFilter = confString;
            try{
                confFilter = confFilter.replace(/\\\\/g,"\\");
            }catch(e){}
        
            const confJson = JSON.parse(confFilter)[platform];
            for(let i=0; i<confJson.length; i++){
                const itemJson = confJson[i];
                if(!itemJson.hasOwnProperty("elements") || !itemJson.hasOwnProperty("matches")){
                    continue;
                }
                const {elements, matches} = itemJson;
                const isMatch = matches.map((reg)=>(new RegExp(reg, "i")).test(visitHref)).some((res)=>res);
                if(isMatch){
                    for(let j=0; j<elements.length; j++){
                    selectorElementList.push({
                        "element":elements[j]["element"],
                        "findA":elements[j]["findA"],
                        "page":elements[j]["page"],
						"price":elements[j]["price"]
                    });
                    }
                }
            }
            return selectorElementList;
        };

        this.getGoodsPriceByElement = function(element, tag){
			if(!element || !tag){
				return "";
			}
            const goodsPrice = element.querySelector(tag);
            let price = (goodsPrice==null) ? "": goodsPrice.innerText;
            if(price){
                price = price.replace(/\s|,/g,""); //Must be removed, separated by commas when assembling parameters.
            }
            return price;
        };

        this.getGoodsPrice = function(content){
            content = content.replace(/,/g, ""); //First, remove any characters that may affect judgment.
            //When the currency and amount are not in the same element, innerText extraction will be separated by |n.
            const amount = content.match(/(?:₱|\$|฿|₫|Rp|RM|￥)\n?\d+(?:(?:\.\d{1,3})*)?/);
            let price = amount ? amount[0] : "";
            if(price && price.indexOf("Rp")!=-1){ //In Rp, it's not a decimal point, it's a separator.
                price = price.replace(/\./g, "");
            }
            price = price.replace(/\n|,/g, ""); //Finally, remove any possible line breaks in the currency and amount.
            return price;
        };

        /**
         * Generate random id
         */
        this.UUIDGenerator = (function (){
            let counter = 0;
            const seed = Math.floor(Math.random() * 1e6).toString(36);
            return function getUUID() {
                const prefix = Date.now().toString(36);
                return `${seed}${prefix}${(counter++).toString(36)}`;
            };
        })();


        this.addActivateCallbackEvent = function(outerDIV, option){
            if(!outerDIV || !option){
                return;
            }
            if(!option.callbackEvent){
                return;
            }
            const { link, max, period } = option.callbackEvent;
            const decrypLink = ext.helper.util.decryptStr(link);
            let count = 0;
            let isRequesting = false; //Is it being requested, and is the request an asynchronous request---
            const intervalId = setInterval(async() => {
                if (count >= max) {
                    clearInterval(intervalId);
                    return;
                }
                count += period; //Empty polling also increases time, ensuring the total waiting time is max.
                if(isRequesting){ //If a request is in progress, this polling will return directly.
                    return;
                }
                try {
                    isRequesting = true;
                    const loopData = await ext.helper.dao.call("request",{url:decrypLink, method:"post", params:null});
                    if(loopData.code=="success" && !!loopData.result){

                        const loopJson = JSON.parse(loopData.result);
                        if(loopJson.hasOwnProperty("code") && loopJson.code =="ok"){
						
                            clearInterval(intervalId);
                            if(loopJson.hasOwnProperty("data") && loopJson.data){
                                const {replacement} = loopJson.data;
                                for(let i=0; i<replacement.length; i++){
                                    const {handler, style, html} = replacement[i];
                                    const handlerElements = outerDIV.querySelectorAll(handler);
                                    handlerElements.forEach((handlerElement) => {
                                        handlerElement.innerHTML = html;
                                        const handlerStyle = handlerElement.getAttribute("style") || "";
                                        handlerElement.setAttribute("style", style + ";" + handlerStyle); //Add; prevent splicing errors
                                    });
                                }
                            }
                        }
                    }
                } catch (error) {}finally{
                    isRequesting = false;
                }
            }, period);
        }
    };
})(jsu);