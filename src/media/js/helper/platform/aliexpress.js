($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.AliexpressHelper = function (ext, support) {

        const platform = support.p;

        const prefix = "website_" + platform + "_";
        const languageStorageKey = prefix + "language";
        const currencyStorageKey = prefix + "currency";
        const marketplaceStorageKey = prefix + "marketplace";

        //Currently, it is known that AliExpress may delete HTML that does not belong to the original website, thus requiring a loop check. This is the identifier.
        this.checkDomInsertRs = null;

        const setStoageData = (key, value) =>{
            const obj = {};
            obj[key] = value;
            return new Promise((resolve) => {
                $.api.storage.local.set(obj, () => {
                    resolve();
                });
            });
        };

        const getStoageData = (key, defaultValue) =>{
            return new Promise((resolve) => {
                $.api.storage.local.get([key], (data) => {
                    resolve(data.hasOwnProperty(key) ? data[key] : defaultValue);
                });
            });
        };

        this.getLang = () =>{
            const host = window.location.host;
            let lang = "en";
            if(/^(us|ko|uk|fr|de|it|ca|au|jp|ja|he|kr|ru|br|in|es|mx|pl|tr|ar|id|th|vn|sg|my|ph|be|nl|se|ch|no|dk|at|ie|fi|pt|gr|hu|cz|bg|ro|ua|il|sa|eg|ir|pk|iq|af|ly|et|gh|ke|ng|za|tz|mg|mw|zm|bw|sn|cm|ci|gh|ma|tn|mr|mu|om|kw|qa|bh|ae|lb|jo|sy|lb|il|ps|kr|cl|pe|uy|ec|ve|bo|gt|pa|hn|ni|cr|sv|gt|sl|lr|sd|er|dj|et|mw|mz|ao|tz|zm|zw|mw|na|bw|ls|mg|km)\.aliexpress\.com$/.test(host)){
                lang = host.split(".")[0];
            }else if(/^www\.aliexpress\.com$/.test(host)){
                lang = "en";
            }else if(/^aliexpress\.ru$/.test(host)){
                lang = "ru";
            }
            setStoageData(this.languageStorageKey, lang);
            return lang;
        };

        this.getMarketplace = async (marketplaceHandler) =>{
            let countryCode = "";
            const host = window.location.host;
            if(/^(us|ko|uk|fr|de|it|ca|au|jp|ja|he|kr|ru|br|in|es|mx|pl|tr|ar|id|th|vn|sg|my|ph|be|nl|se|ch|no|dk|at|ie|fi|pt|gr|hu|cz|bg|ro|ua|il|sa|eg|ir|pk|iq|af|ly|et|gh|ke|ng|za|tz|mg|mw|zm|bw|sn|cm|ci|gh|ma|tn|mr|mu|om|kw|qa|bh|ae|lb|jo|sy|lb|il|ps|kr|cl|pe|uy|ec|ve|bo|gt|pa|hn|ni|cr|sv|gt|sl|lr|sd|er|dj|et|mw|mz|ao|tz|zm|zw|mw|na|bw|ls|mg|km)\.aliexpress\.com$/.test(host)){
              countryCode = host.split(".")[0];
            }else{
              countryCode = host.split(".").slice(-1)[0]
            }

            let marketplace = await getStoageData(marketplaceStorageKey, null);
            const defaultMarketplace = {countryCode: countryCode, className: "", html: ""};

			//AliExpress.ru does not have a country switching feature.
            if(marketplaceHandler && !/\.ru/.test(host)){
                const handlerElement = await $.waitForElement(marketplaceHandler, document.body, true, 50, 2*1000);
                if(handlerElement){
                    marketplace = {
                        countryCode: countryCode,
                        className: handlerElement.className ?? "",
                        html: handlerElement.outerHTML ?? ""
                    };
                    setStoageData(marketplaceStorageKey, marketplace);
                }
            }

            if(!marketplace){ 
                marketplace = defaultMarketplace;
            }

            ext.logger("info", "aliexpress marketplace", marketplace);
            return encodeURIComponent(JSON.stringify(marketplace));
        };


        this.getCurrency = () =>{
            const host = window.location.host;
            return new Promise((resolve,reject) =>{
              if(host.indexOf("aliexpress.ru")!=-1){ //Russian websites require special handling.
                resolve("unknown");
              }else{
                    const element = document.querySelector("div[class^='ship-to--menuItem--']")
                        || document.querySelector("div[class^='countryFlag--']"); //https://inbusiness.aliexpress.com/web/search-products?spm=oneshop.home.search_products&searchText=ds
                    if(element){
                        let currency = element.textContent;
                        if(currency){
                            currency = encodeURIComponent(currency);
                            setStoageData(currencyStorageKey, currency);
                            resolve(currency);
                        }else{
                            resolve("unknown");
                        }
                    }else{
                        resolve("unknown");
                    }
              }
            });
        };

        this.detail = async () =>{
            const language = this.getLang();
            const currency = await this.getCurrency();
            const marketplace = await this.getMarketplace();
            const id = ext.helper.util.getGoodsIdByLink(window.location.href);

            const params = {
                ids: id,
                p: platform,
                lang: language,
                currency:currency,
                mul:false,
                qu: "",
                marketplace:marketplace
            }
            try {
                const data = await ext.helper.request.getCouponQuery(params);
                if(data.code=="success" && !!data.result){
                    const json = JSON.parse(data.result);
                    ext.logger("info", "detail request json=", json);
                    await this.detailAnalyze(json, language, currency, marketplace);
                }
            } catch (error) {
                ext.logger("error", "detail exception: ", platform, error);
            }
        };

        this.detailAnalyze = async(json, language, currency, marketplace) =>{
            this.checkDomInsertRs = false;
            try{
                if(!json) return;
            
                let couponResult = null;
                let qrcodeResult = null;
            
                if(!!json.data && !!json.data.css && !!json.data.html && !!json.data.handler){
                    const {handler,css,html,templateId,distinguish,hint} = json.data;
                    var mid = null;
                    if(json.data.hasOwnProperty("mid")){
                        mid = json.data["mid"];
                    }
                    
                    ext.helper.styleHelper.addStylesheetsByContent(css, "coupon-query-detail");
            
                    const element = await $.forceGetElement(handler);
                    ext.logger("info", "coupon insert：element", element);
            
                    if(element){
                        couponResult = {"element":element, "html":html, "templateId":templateId, "distinguish":distinguish, "hint":hint, "mid":mid}
                    }
                }
            
                if(!!json.id && !!json.mscan && !!json.mscan.html && !!json.mscan.mount){
                    const {iden, html, mount, distinguish} = json.mscan;
                    const id = json.id;
                    
                    const params = {
                        id: id,
                        lang: language,
                        platform: platform,
                        currency: currency,
                        marketplace: marketplace
                    };
                    const promiseResultArray = [
                        $.forceGetElement(mount),
                        ext.helper.request.getCouponChange(params)
                    ];
                    const allResult = await Promise.all(promiseResultArray);

                    let element=null, qrcodeData=null;
                    for(let i=0; i<allResult.length; i++){
                        if(allResult[i]){
                            if(allResult[i].hasOwnProperty("code")){
                                qrcodeData = allResult[i];
                            }else{
                                element = allResult[i];
                            }
                        }
                    }
            
                    ext.logger("info", "qrcocd insert：element", element);
                    if(element && qrcodeData){
                        qrcodeResult = {"element":element, "html":html, "iden":iden, "qrcodeData":qrcodeData,"distinguish":distinguish}
                    }
                }
                
                ext.helper.util.loopTask(()=>{
                    if(couponResult){
                        ext.helper.util.distinguishRemoveAndTry(couponResult.distinguish, ()=>{
                            this.detailCouponAnalyze(couponResult);
                        });
                    }
                    if(qrcodeResult){
                        ext.helper.util.distinguishRemoveAndTry(qrcodeResult.distinguish, ()=>{
                            this.detailMscanAnalyze(qrcodeResult);
                        });
                    }
                });

            }catch(error){
                ext.logger("error", "detailAnalyze: ", error);

            }finally{
              this.checkDomInsertRs = true;
            }
        };


        this.detailCouponAnalyze = (result) =>{
            const {element, html, templateId, hint, mid} = result;

            element.insertAdjacentHTML('afterend', html);
            const templateIdEle = document.querySelector("div[id='"+templateId+"']");
            if(templateIdEle){
                const couponCodeElement = templateIdEle.querySelector(".coupon-code");
                if(couponCodeElement){
                    const promoCode = ext.helper.util.decryptStr(couponCodeElement.getAttribute("data-encryptcode"));
                    templateIdEle.addEventListener("click", ()=>{
                        ext.helper.util.setClipboard(promoCode).then(()=>{
                            ext.helper.toast.show({"message":hint});
                            
                            if(mid && mid.hasOwnProperty("target") && mid.hasOwnProperty("link") && mid.hasOwnProperty("delay")){
                                const {target, link, delay}  = mid, linkDecrypt = ext.helper.util.decryptStr(link);

                                setTimeout(()=>{
                                    if(target==="_blank"){
                                        ext.helper.util.openInTab(linkDecrypt);

                                    }else if(target==="_self"){
                                        window.location.href = linkDecrypt;

                                    }else if(target==="_replace"){
                                        
                                        window.location.replace(linkDecrypt);
                                    }
                                }, delay);
                            }
                        });
                    });
                }
            }
        };

        this.detailMscanAnalyze = (result) =>{
            const {element, html, qrcodeData, iden} = result;

            element.insertAdjacentHTML('afterend', html);
            if(!!qrcodeData && qrcodeData.code==="success" && !!qrcodeData.result){
                const mscanImg = JSON.parse(qrcodeData.result).mscanImg;
                if(!!mscanImg){
                    const canvasElement = document.getElementById("mscan"+iden);
                    if(canvasElement){
                        var cxt = canvasElement.getContext("2d");
                        var imgData = new Image();
                        imgData.src = mscanImg;
                        imgData.onload=function(){
                            cxt.drawImage(imgData, 0, 0, imgData.width, imgData.height);
                        }
                    }
                }
            }
        };

        this.trade = async () =>{
            const visitUrl = window.location.href;
            const validate = support.trade.map((reg)=>reg.test(visitUrl)).some((rs)=>rs==true);
            if(!validate) return;
        
            // No language information available here
            // So, get language from storage
            const language = await getStoageData(languageStorageKey, navigator.language);
            const currency = await getStoageData(currencyStorageKey, "USD");
            const marketplace = await this.getMarketplace();
            // console.log("currency=",currency, "marketplace=", marketplace);
        
            const ids = ext.helper.util.getParamterBySearch(window.location.search, "objectId")
                || ext.helper.util.getParamterBySearch(window.location.search, "availableProductShopcartIds")
                || ext.helper.util.getParamterBySearch(window.location.search, "itemId");
            
            const params = {
                ids: ids,
                qu: "",
                p: platform,
                lang: language,
                mul: true,
                currency:currency,
                marketplace:marketplace
            };


            const res = await ext.helper.request.getCouponQuery(params);
            ext.logger("info", "trade res=", res);
        
            if(res.code=="success" && !!res.result){
                const json = JSON.parse(res.result);
                await this.tradeAnalyze(json, language);
            }
        };

        this.tradeAnalyze = async(json, language) =>{
            if(!json || !json.handler || !json.css || !json.templateId){
                return;
            }
        
            const { handler, css, html, templateId, distinguish} = json;
            ext.helper.styleHelper.addStylesheetsByContent(css, "coupon-query-trade");
        
            let element = await $.forceGetElement(handler);
            ext.logger("info", "insert：element",element);
        
            ext.helper.util.loopTask(()=>{
                if(!element){
                    return;
                }
                ext.helper.util.distinguishRemoveAndTry(distinguish, ()=>{
                    element.insertAdjacentHTML('afterend', html);
                    const templateIdEle = document.querySelector("#"+templateId+">.item");
                    if(templateIdEle){
                        const promoCode = ext.helper.util.decryptStr(templateIdEle.querySelector(".copy").getAttribute("data-encryptcode"));
                        templateIdEle.addEventListener("click",()=>{
                            ext.helper.util.setClipboard(promoCode).then(()=>{
                                ext.helper.toast.show({"message":"copied"});
                            });
                        });
                
                        // Only expandable，if used input.value ,Do not trigger the change event
                        const arrowElement = document.querySelector(".pl-summary__item-arrow-pc");
                        if(arrowElement){
                            arrowElement.click();
                        }
                    }
                });
            });
        }

        this.removeAnchor = () =>{
            setInterval(()=>{
                const anchors = document.querySelectorAll("div[name^='ali-gogo-coupon-']");
                anchors.forEach((element)=>{
                    ext.helper.util.removeAnchorsByNode(element);
                });
            }, 3000);
        };

        this.run = async function () {
            const visitUrl = window.location.href;
            if(support.detail.test(visitUrl)){
                this.detail();
            }
            this.trade();
            this.removeAnchor();
        };
    };
})(jsu);