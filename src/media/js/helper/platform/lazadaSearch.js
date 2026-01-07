($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.LazadaSearchHelper = function (ext, support) {

        const platform = support.p;
        const couponExistPer = support.couponExistPer || 10;
        this.loopIsComplete = true;

        this.isRun = function(){
            let run = false;
            if(window.location.host.indexOf("lazada.")!=-1){
              run = !this.isItemLink(window.location.href) && !/\/(\/shipping\\?)\//.test(window.location.pathname);
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
                                const price = ext.helper.util.getGoodsPrice(element.innerText);
                                let id = null;
                                if(this.isItemLink(goodsLink)){
                                    id = ext.helper.util.getGoodsIdByLink(goodsLink.getAttribute("href"));
                                }
                                if(id){
                                    items.push({
                                        "id":id, "price":price, "platform":platform, "handler":element, "findA":findA, "from":"search"
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
                        reqId += group[i].id+":"+group[i].price+",";
                        //Add markers before starting the request to avoid duplicate requests.
                        group[i].handler.setAttribute($.attr.couponProcessMark, "true");
                    }
                    if(reqId.endsWith(',')){
                        reqId = reqId.slice(0, -1);
                    }
            
                    ext.logger("info", "request start >>>>>>>>>>>>>", group);
                    const params = {
                        platform:platform,
                        ids:reqId,
                        marketplace:marketplace,
                    };
                    ext.helper.request.getCouponExist(params).then((data)=>{
                        delete ext.helper.request.removeRequest(data.requestKey); //delete current cache request
            
                        if(data.code!="success" || !data.result){
                            resolve("exception");
                            return;
                        }
            
                        const json = JSON.parse(data.result);
                        for (let key in json) {
                            const { encryptLink, tip } = json[key];
                            const { handler, findA } = group.find(obj => obj.id ===  key);
                
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
            let selectorA = null;
            if(handler.tagName=="A"){
                selectorA = [handler];
            }else{
                selectorA = handler.querySelectorAll("a");
            }
            selectorA.forEach((element_a)=>{
                if(this.isItemLink(element_a.getAttribute("href"))){
                    element_a.addEventListener("click", function(e){
                        e.preventDefault();
                        e.stopPropagation();
                        ext.helper.util.openInTab(decryptUrl);
                    });
                }
            });
        };

        this.run = async function(){
            if(!this.isRun()) return;
        
            const marketplace = ext.helper.util.getCommonMarketplace(window.location.href);
            const confString = await ext.helper.request.requestCouponExistConf();
            ext.logger("info", "conf ======>", confString);
            ext.logger("info", "marketplace ======>", marketplace);
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
          }
    };
})(jsu);