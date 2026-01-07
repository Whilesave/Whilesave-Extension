($ => {
    
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.SearchEnginScreenHelper = function (ext, support) {

        this.blockAttributeKey = "jscan-slo-u8";
        this.uniqueMarkAttributeKey = "jvtxi-uid-t8";
        this.loopIsComplete = true;

        this.getLinkByElement = (element, findTag)=>{
            let searchElement = null;
            if(findTag=="this"){//The a tag is itself.
                searchElement = element;
            }else if(/^child@/.test(findTag)){
                searchElement = element.querySelector(findTag.replace(/^child@/,""));
            }
            return searchElement;
        };


        this.pickupSelectors = (confJson, platform)=>{
            const list = new Array();
            for(let i=0; i<confJson.length; i++){
                const itemJson = confJson[i];
                if(!itemJson.hasOwnProperty("elements") || !itemJson.hasOwnProperty("matches")){
                    continue;
                }
                const {elements, matches} = itemJson;
                const isMatch = matches.map((reg)=>(new RegExp(reg.replace(/\\\\/g,"\\"), "i")).test(window.location.href)).some((res)=>res);
                if(isMatch){
                    for(let j=0; j<elements.length; j++){
                        list.push({
                            "selector":elements[j]["element"],
                            "findA":elements[j]["findA"]
                        });
                    }
                }
            }
            return list;
        };

        this.queryElements = async (selectors, platform)=>{
            const items = [];
            try{
            selectors.forEach((selectorObj)=>{
                if(selectorObj.selector){
                    const elements = document.querySelectorAll(selectorObj.selector+":not(["+this.blockAttributeKey+"='true'])");
                    ext.logger("info", "search items======>", elements);

                    const findA = selectorObj.findA;
                    elements.forEach((element)=>{
                        if(element && !element.getAttribute(this.blockAttributeKey) && !element.querySelector("["+this.blockAttributeKey+"]")){
                            const linkElement = this.getLinkByElement(element, findA);
                            const handler = ext.helper.util.UUIDGenerator();
                            element.setAttribute(this.uniqueMarkAttributeKey, handler);
                            element.setAttribute(this.blockAttributeKey, "true");

                            if(linkElement){
                                let link = linkElement.getAttribute("href") || linkElement.textContent;
                                if(link){
                                    link = link.replace(/\s+/g, '');
                                }
                                if(link && link.indexOf("http")!=-1){
                                    items.push({
                                        "handler":handler, "link":linkElement.getAttribute("href"), "platform":platform, "element":element
                                    });
                                }
                            }
                        }
                    });
                }
            });
            if(items.length>0){
                await this.search(items, platform);
            }
            }catch(e){
                ext.logger("error", "queryElements: ", e);
            }
        };

        this.search = async (items, platform) =>{
            const lists = [];
            items.forEach((item)=>{
                lists.push({"handler":item.handler, "url":item.link});
            });

            ext.logger("info", "search lists==> ", lists);
            const resultJson = await ext.helper.request.getEngineScreenResult(lists,platform);
            ext.logger("info", "search result==> ", resultJson);
            if(resultJson){
                const list = resultJson.list;

                ext.logger("info", "search result list=====>", list)
                this.createHtml(items, list);
            }
        };

        this.createHtml = (items, list) =>{

            for(let i=0;i<list.length;i++){
                const {handler, content} = list[i];
                const item = items.find(obj => obj.handler ===  handler);

                if(!item){
                    continue;
                }
                if(item.hasOwnProperty("handler") && item.hasOwnProperty("element")){
                    let handler = item.handler;
                    let element = item.element;

                    //element.insertAdjacentHTML('afterbegin', "<div style='color:red;width:100%;height:20px;overflow:hidden;'>"+item.link+"</div>");
                    if(content){
                        ext.logger("info", "show ===>", item);
                        element.insertAdjacentHTML('afterbegin', content);
                    }
                }
            }
            //Add click events to the appended HTML.
            document.querySelectorAll("*[name='se-rebate-343234xy-funx']").forEach((element)=>{
                ext.helper.util.bindCustomEvent(element);
            });
        };

        this.srart = async (platform)=>{
            const confJson = await ext.helper.request.requestEngineScreenConf();
            if(!confJson){
                return;
            }
            ext.logger("info", "confData: ", confJson);

            //Start processing
            const runSearch = ()=>{
                if(this.loopIsComplete){
                    this.loopIsComplete = false;
                    const selectors = this.pickupSelectors(confJson[platform], platform);
                    ext.logger("info", "selectors=====>", selectors);
                    this.queryElements(selectors, platform).then(()=>{
                        this.loopIsComplete = true;
                    });
                }
            }
            runSearch();
            setInterval(()=>{
                runSearch();
            },1500);

        }

        this.run = () =>{
            try{
                this.srart(support.p);
            }catch(e){
                ext.logger("error", "history is exception:"+e);
            }
        };
	}
})(jsu);