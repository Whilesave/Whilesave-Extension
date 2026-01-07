($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.EbayHelper = function (ext, support) {

        const platform = support.p;

        this.detail = async function(){
            const visitUrl = window.location.href;
            const id = ext.helper.util.getGoodsIdByLink(visitUrl);
            const varG = ext.helper.util.getParamterBySearch(window.location.href, "var");
            if(!id){
                return;
            }

            const marketplace = ext.helper.util.getCommonMarketplace(visitUrl);
            var idsG = id;
            if(!!varG){
                idsG += "@"+varG;
            }

            try{
                const params = {
                    ids:idsG,
                    qu:"",
                    p:platform,
                    marketplace:marketplace,
                    mul:false
                };
                const data = await ext.helper.request.getCouponQuery(params);
                if(data.code=="success" && !!data.result){
                    const json = JSON.parse(data.result);
                    ext.logger("info", "detail request json=",json);
                    await this.detailAnalyze(json,marketplace);
                }
            }catch(e){
                ext.logger("info", "request,exception",e);
            }
        };

        this.detailAnalyze = async function(json, marketplace){
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
                    id:id,
                    marketplace:marketplace,
                    platform:platform,
                };
                const allResult = await Promise.all([
                    $.forceGetElement(mount),
                    ext.helper.request.getCouponChange(params)
                ]);
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
        };

        this.detailCouponAnalyze = function(result){
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
                                },delay);
                            }
                
                        });
                    });
                }
            }
        };

        this.detailMscanAnalyze = function(result){
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

        this.run = function(){
            const visitUrl = window.location.href;
            if(support.detail.test(visitUrl)){
                this.detail();
            }
        };
    };
})(jsu);