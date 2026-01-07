($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.LazadaHelper = function (ext, support) {
        const platform = support.p;

        this.detail = async function(){
            const visitUrl = window.location.href;
            const marketplace = ext.helper.util.getCommonMarketplace();
            const ids = ext.helper.util.getGoodsIdByLink(visitUrl);
            if(!ids){
                return;
            }
            try{
                const params = {
                    ids:ids,
                    qu:"",
                    p:platform,
                    marketplace:marketplace,
                    mul:false
                };
                const data = await ext.helper.request.getCouponQuery(params);
                if(!!data && data.code==="success" && !!data.result){
                    const json = JSON.parse(data.result);
                    if(json && json.mscan){
                        const {distinguish, iden, html, cmd, mount} = json.mscan;
                        const mscanResult = {"id":json.id, "iden":iden, "marketplace":marketplace, "platform":platform,"mount":mount, "html":html, "cmd":cmd};
                        ext.helper.util.loopTask(()=>{
                            ext.helper.util.distinguishRemoveAndTry(distinguish, ()=>{
                                this.detailMyMscanAnalyze(mscanResult);
                            });
                        });
                    }
                }
            }catch(e){
                ext.logger("info", "request,exception",e);
            }
        };

        this.detailMyMscanAnalyze = async function(result){
            const {id, iden, marketplace, platform, mount, html, cmd} = result;
        
            if(!mount || !html){
              return;
            }
        
            if(cmd && cmd.do && cmd.ele){
                const cmdElement = await $.waitForElement(cmd.ele);
                if(cmdElement){
                    if(cmd.do == "empty"){
                        cmdElement.innerHTML = '';
                    }
                }
            }
        
            const element = await $.waitForElement(mount);
            if(!element){
                return;
            }
            element.insertAdjacentHTML('beforeend', html);

            const params = {
                id:id,
                marketplace:marketplace,
                platform:platform
            };
            const qrcodeData = await ext.helper.request.getCouponChange(params)
            if(!!qrcodeData && qrcodeData.code==="success" && !!qrcodeData.result){
                let mscanImg = JSON.parse(qrcodeData.result).mscanImg;
                if(!!mscanImg){
                    var canvasElement = document.getElementById("mscan" + iden);
                    if(!!canvasElement){
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