($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.EbaySearchHelper = function (ext, support) {

        const platform = support.p;
        const couponExistPer = support.couponExistPer || 10;
        this.loopIsComplete = true;

        this.isRun = function(){
            let run = false;
            if(window.location.host.indexOf("ebay.")!=-1){
              run = !/\/(item|itm|trade|checkout|rxo)\//.test(window.location.pathname)
            }
            return run;
        };

        this.isItemLink = function(url){
            return support.detail.test(url);
        };

        this.pickUpItems = async function(selectors, marketplace){
            const items = [];
            try{
                selectors.forEach((elementObj)=>{
                    if(elementObj.element){
                        const elements = document.querySelectorAll(elementObj.element+":not(["+$.attr.couponProcessMark+"='true'])");
                        ext.logger("info", "search coupon elements======>", elements);
                        const findA = elementObj.findA;
                        elements.forEach((element)=>{
                            if(element && ext.helper.elementUtil.isElementDisplayed(element) && !element.getAttribute($.attr.couponProcessMark)){
                                const goodsLink = ext.helper.util.getGoodsLinkByElement(element, findA);
                                const priceQuery = elementObj.price;
								
								//ext.logger("info", "search price elements======>", element, priceQuery);
                                const price = ext.helper.util.getGoodsPriceByElement(element, priceQuery);
								//ext.logger("info", "search price======>", price);
                    
                                let id = null, varG = null;
                                if(this.isItemLink(goodsLink)){
                                    const goodsLinkHref = goodsLink.getAttribute("href");
                                    id = ext.helper.util.getGoodsIdByLink(goodsLinkHref);
                                    varG = ext.helper.util.getParamterBySearch(goodsLinkHref, "var");
                                }
                                if(id){
                                    items.push({
                                        "id":id, "varG":varG, "price":price, "platform":platform, "handler":element, "findA":findA, "from":"search"
                                    });
                                }
                            }
                        });
                    }
                });
                ext.logger("info", items);
                if(items.length>0){
                    await this.search(items, marketplace);
                }
            }catch(e){
                ext.logger("error", "pickUpItems: ", e);
            }
        };

        this.search = async function(array, marketplace){
            const groups = ext.helper.util.calcRequestGroup(array, couponExistPer);
            const len = groups.length;
            return new Promise((resolve, reject)=>{
                if(len<=0){
                    resolve("complete");
                    return;
                }
            
                const promises = [];
                for(let i=0; i<groups.length; i++){
                    promises.push(this.createItemHtml(groups[i], marketplace));
                }
                Promise.all(promises).then((data)=>{
                    resolve("complete");
                });
            });
        };

        this.createItemHtml = function(group, marketplace){
            return new Promise((resolve, reject)=>{
                try{
                    if(Array.isArray(group) && group.length === 0){
                        resolve("exception");
                        return;
                    }
            
                    let reqId = "";
                    const platform = group[0].platform;
                    for(var i=0;i<group.length;i++){
                        if(group[i].handler.getAttribute($.attr.couponProcessMark)){
                            continue;
                        }
                        reqId += group[i].id;
                        if(!!group[i].varG){
                            reqId += "@"+group[i].varG;
                        }
                        reqId += ":"+group[i].price+",";

                        //Add markers before starting the request to avoid duplicate requests.
                        group[i].handler.setAttribute($.attr.couponProcessMark, "true");
                    }
                    if(reqId.endsWith(',')){
                        reqId = reqId.slice(0, -1);
                    }
            
                    ext.logger("info", "request start >>>>>>>>>>>>>", group);
                    const params = {
                        platform:platform,
                        ids: reqId,
                        marketplace: marketplace
                    };

                    ext.helper.request.getCouponExist(params).then((data)=>{
                        ext.logger("info", "request finish >>>>>>>>>>>>>");
                        ext.helper.request.removeRequest(data.requestKey); //delete current cache request
                
                        if(data.code!="success" || !data.result){
                            resolve("exception");
                            return;
                        }
            
                        const json = JSON.parse(data.result);
                        for (let key in json) {
                            const { encryptLink, tip } = json[key];
                
                            const item = group.find(obj => obj.id ===  key);
                            if(!item){
                                continue;
                            }
                            let handler = null, findA = null;
                            if(item.hasOwnProperty("handler") && item.hasOwnProperty("findA")){
                                handler = item.handler;
                                findA = item.findA;
                            }
                            if(!handler || !findA){
                                continue;
                            }
                
                            let decryptUrl = null;
                            if(encryptLink){
                                try{
                                    const decryptLink = atob(encryptLink);
                                    decryptUrl = decryptLink.split('').reverse().join('');
                                }catch(e){}
                            }
                            if(tip){
                                handler.style.position = "relative";
                                handler.insertAdjacentHTML('beforeend', tip);
                                ext.logger("info", "exist coupon >>>>>>>>>>>>>", key);
                            }
                            if(decryptUrl){
                                this.relativeJ(handler, decryptUrl);
                                ext.logger("info", "good job >>>>>>>>>>>>>", key);
                            }
                        }
                        resolve("complete");
                    });
                }catch(e){
                    ext.logger("error", "createItemHtml: ", e);
                    resolve("exception");
                }
            });
        };

        this.relativeJ = function(handler, decryptUrl){
            const clickTipAttribute = "tip-vjd1jd89fcv-i", self = this;
            let elements = null;
            if(handler.tagName=="A"){
                elements = [handler];
            }else{
                elements = handler.querySelectorAll("a");
            }
            elements.forEach((elementA)=>{
                const href = elementA.getAttribute("href");
                if(self.isItemLink(href)){ //First, ensure that the current link is a reliable A tag.
                    if(elementA.getAttribute(clickTipAttribute)){
                        return;
                    }
            
                    elementA.setAttribute(clickTipAttribute, "true");
                    elementA.addEventListener("click", function(e){
                        let isPreventDefault = true;
                
                        const target = e.target;
                        const tagName = target.tagName.toUpperCase();
                        if(tagName=="A"){ //If it's an A tag under an A tag, it must be determined.
                            const href = target.getAttribute("href");
                            if(!self.isItemLink(href)){
                                isPreventDefault = false;
                            }
                        }
                
                        //If it is another special function key
                        if(isPreventDefault){
                            Array.from(target.classList).forEach(className => {
                                const iscontains = ["btn","icon"].map((name)=> className.indexOf(name)!=-1)
                                    .some((result)=>result);
                                if(iscontains){
                                    isPreventDefault = false;
                                }
                            });
                        }
                
                        if(isPreventDefault){
                            e.preventDefault();
                            e.stopPropagation();
                            ext.helper.util.openInTab(decryptUrl);
                        }
            
                    });
                }
            });
        };

        this.run = async function(){
            if(!this.isRun()) return;

            const marketplace = ext.helper.util.getCommonMarketplace(window.location.href);
            const confString = await ext.helper.request.requestCouponExistConf();
            ext.logger("info", "conf ======>", confString);
            if(!confString){
                return;
            }

            const selectors = ext.helper.util.pickupGoodsItem(platform, confString);
            ext.logger("info", "search coupon selectors======>", selectors);

            setInterval(async ()=>{
                if(this.loopIsComplete){
                    this.loopIsComplete = false;
                    await this.pickUpItems(selectors, marketplace);
                    this.loopIsComplete = true;
                }
            }, 1700);
        };
    };
})(jsu);