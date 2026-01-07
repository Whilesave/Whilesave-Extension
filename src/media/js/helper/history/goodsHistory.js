($ => {
    
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.GoodsHistoryHelper = function (ext, support) {
        
        const models = {
            history:"history-model"
        };

        this._container = null;

		this.push = (platform, obj) =>{
            try {
                const record = ext.helper.dao.getData($.opts.storageKeys.history.record, ext.helper.dao.getDefaults().h.record);
                const number = ext.helper.dao.getData($.opts.storageKeys.history.number, ext.helper.dao.getDefaults().h.number);
                const histories = record[platform] ?? [];

                if(histories.length >= number){
                    histories.splice(0, parseInt(number/5)); //removev forward 1/5
                }
                const newArr = histories.filter((item, index) => item.id != obj.id);
                newArr.push(obj);

                record[platform] = newArr;
                ext.helper.dao.setDataByKey($.opts.storageKeys.history.record, record);
            } catch (error) {
                ext.logger("error", "historyGood push item has exception", error);
            }
        };

        this.get = (platform, num=-1) => {
            const record = ext.helper.dao.getData($.opts.storageKeys.history.record, ext.helper.dao.getDefaults().h.record);
            const histories = record[platform] ?? [];
        
            if(num > 0){ // <0 is get all storage
                const showHistories = [];
                for(let i=histories.length-1; i>=0; i--){
                    if(showHistories.length >= num) break;
                    showHistories.push(histories[i]);
                }
                return showHistories;
            }
            return histories;
        };

        this.remove = (platform, id) =>{
            const record = ext.helper.dao.getData($.opts.storageKeys.history.record, ext.helper.dao.getDefaults().h.record);
            const histories = record[platform] ?? [];
            let newArr = histories.filter((item, index) => item.id != id);
            record[platform] = newArr;
            ext.helper.dao.setDataByKey($.opts.storageKeys.history.record, record);
        };

        this.getGoodsByDateGroup = function(platform){
            const histories = this.get(platform).reverse();
            const group = [];
        
            const today = new Date();
            const yesterday = new Date(today);
            const format = "dd/MM";
            yesterday.setDate(today.getDate() - 1);
        
            const todayStr = ext.helper.util.dateFormat(today, format);
            const yesterdayStr = ext.helper.util.dateFormat(yesterday, format);
            const showDateFormat = (todayStr, yesterdayStr, current) =>{
                const langueFormat = {};
                if(current === todayStr){
                    langueFormat.str = ext.helper.i18n.get("history_box_hit_today");
                    langueFormat.langueKey = "history_box_hit_today";
                }else if(current === yesterdayStr){
                    langueFormat.str = ext.helper.i18n.get("history_box_hit_yesterday");
                    langueFormat.langueKey = "history_box_hit_yesterday";
                }else{
                    langueFormat.str = " —— " + current + " —— ";
                    langueFormat.langueKey = "";
                }
                return langueFormat;
            };
        
            let items = [], cacheDateStr=null, currentDateStr = null, langueFormat = null;
            for(let i=0; i<histories.length; i++){
                today.setTime(histories[i].date);
                currentDateStr = ext.helper.util.dateFormat(today, format);
                if(!!cacheDateStr){
                    if(cacheDateStr != currentDateStr){
                        langueFormat = showDateFormat(todayStr, yesterdayStr, cacheDateStr);
                        group.push({
                            "str":langueFormat.str,
                            "langueKey":langueFormat.langueKey,
                            "items":items
                        });
                        items = [];
                        cacheDateStr = currentDateStr;
                    }
                }else{
                    cacheDateStr = currentDateStr;
                }
                items.push(histories[i]);
            }
        
            if(items.length!=0){
                langueFormat = showDateFormat(todayStr, yesterdayStr, cacheDateStr)
                group.push({
                    "str":langueFormat.str,
                    "langueKey":langueFormat.langueKey,
                    "items":items
                });
            }
            return group;
        };

        this.showOrHideHistoryBox = (platform) =>{

            const {outerDIV,shadowRoot} = this._container;

            const self = this;
            const group = this.getGoodsByDateGroup(platform);
            const contentElement = outerDIV.querySelector(".history-panel-aside-main .panel-aside-main-content");
            contentElement.innerHTML = "";
        
            let historiesBoxHtml = "", jumpUrl="", imgUrl="";
            for(let i=0; i<group.length; i++){
                historiesBoxHtml += `<div class="panel-aside-main-item">`;
                historiesBoxHtml += `<div class="item-title" langue-extension-text="`+group[i].langueKey+`">`+group[i].str+`</div>`;
                historiesBoxHtml += `<div class="item-container">`;
                for(let j=0; j<group[i].items.length; j++){
                    jumpUrl = this.pretreatmentJumpUrl(group[i].items[j].url, platform);
                    imgUrl = this.pretreatmentImageUrl(group[i].items[j].pic, platform);
                    historiesBoxHtml += `
                    <div class="histories-box-review_item">
                        <a title="`+group[i].items[j].title+`" jump-tag="true" href="javascript:void(0);" jump-url="`+jumpUrl+`" target="_blank">
                        <div class="review-shadow">
                            <div class="delete-btn" data-id="`+group[i].items[j].id+`">×</div>
                        </div>
                        <div class="review-img"><img src="`+imgUrl+`" /></div>
                        <div class="review-text">`+group[i].items[j].price+`</div>
                        </a>
                    </div>
                    `;
                }
                historiesBoxHtml += `</div>`;
                historiesBoxHtml += `</div>`;
            }
            contentElement.innerHTML = historiesBoxHtml;
        
            outerDIV.querySelectorAll(".history-panel-aside-main .delete-btn").forEach((ele)=>{
                ele.addEventListener("click",function(e){
                    e.stopPropagation();
                    e.preventDefault();
                    const id = this.getAttribute("data-id");
                    this.parentNode.parentNode.parentNode.remove();
                    self.remove(platform, id);
                });
            });
        
            const items = outerDIV.querySelectorAll(".history-panel-aside-main .histories-box-review_item > a");
            items.forEach((ele)=>{
                ele.addEventListener('mouseover', function() {
                    this.querySelector(".review-shadow").style.display="block";
                });
                ele.addEventListener('mouseout', function() {
                    this.querySelector(".review-shadow").style.display="none";
                });
            });
        
            outerDIV.querySelectorAll(".history-panel-aside-main a[jump-tag='true']").forEach((ele)=>{
                ele.addEventListener("click",function(e){
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const href = this.getAttribute("jump-url");
                    ext.helper.dao.call("openLink", {
                        href:ext.helper.util.decryptStr(href),
                        newTab: true,
                        active: true
                    });
                });
            });
        };

        this.pretreatmentJumpUrl = (url, platform) =>{
            const {redirect} = ext.helper.dao.getData($.opts.storageKeys.website.exchangeInfo,
                  ext.helper.dao.getDefaults().w.exchangeInfo);
            return ext.helper.util.encryptStr(redirect + encodeURIComponent(url));
        };

        this.pretreatmentImageUrl = (imgUrl, platform) =>{
            let dealImgUrl = "";
            if(platform=="aliexpress"){
              dealImgUrl = imgUrl.replace(/_\d+x\d+\./, "_150x150.");
            }else{
              dealImgUrl = imgUrl;
            }
            return dealImgUrl;
        };

        this.createHistoryBox = async (platform) =>{
            const {outerDIV} = this._container;

            const wrapperOffset = ext.helper.dao.getData($.opts.storageKeys.history.offset, ext.helper.dao.getDefaults().h.offset);
            const histories = this.get(platform, ext.helper.dao.getDefaults().h.toolbar_number);
            let goodsHtml = ``, jumpUrl = "";
            histories.forEach((h)=>{
                jumpUrl = this.pretreatmentJumpUrl(h.url, platform);
                goodsHtml += `
                    <div class="goods-review-item">
                        <a title="`+h.title+`" jump-tag="true" jump-url="`+jumpUrl+`" target="_blank">
                            <div class="review-shadow">
                            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAVlJREFUWEftlsGRgzAMRS26wBQTUtluKltSDKYLlJUHMY6xZMGFi7lkCObr6cuWAHfzBTfHdw2gOdAcOOXAPM+/fGwB4OGcG7f7iX4R8d113dT3fby3XCYACgwAPxZBBiKYYRh2YOldFUAKjIivNNNlWUZEJEB2ZI9HazUQEUALLgluIH95thpEESCEQCKHbADgyfXNACcAeNEzpVyT9/6Zwx0ApOD/QFFAypKEvfdR74x7XwCaOGevANIpiPXWNm1eji8ATZyzCyGgdhos63gN6eQAorhFmMugOcml3PtJmo3FukpPqO6TdCMfHLBuIKkMiUvFU5RnXwSgP6W9kG6gbQ0tpya0NxvFftsx5JJIVucWWkp4uhHVIMhKajy0jptPtLMwLy634kJm6fSrzqVa4OIpqKlSfdd1HbdRHOufTj9+3zIFLwHUAK88N30PXBG2vtMAmgPNgQ/i7v8h6Um2jAAAAABJRU5ErkJggg==" />
                            </div>
                            <img src="`+h.pic+`" />
                        </a>
                    </div>
                `;
            });

            const icons = await ext.helper.file.readContent("media/img/svg/", [
                {"name":"setting", "ext":"svg"},
                {"name":"close", "ext":"svg"},
                {"name":"history", "ext":"svg"}
            ]);
        
            let html = `
                <div class="history-panel-wrapper" data-re-mark-tag="`+platform+`" style="bottom:`+wrapperOffset.bottom+`px; right:`+wrapperOffset.right+`px;">
                    <div class="history-panel-aside-main" data-extension-direction="`+ext.helper.i18n.getDir()+`" style="display:none;">
                    <div class="panel-aside-main-inner">
                        <div class="panel-aside-main-header">
                        <div class="logo-header">`+icons.history+`</div>
                        <div class="title-header" langue-extension-text="history_box_title">`+ext.helper.i18n.get("history_box_title")+`</div>
                        <div class="btns-header">
                            <div class="setting">`+icons.setting+`</div>
                            <div class="close">`+icons.close+`</div>
                        </div>
                        </div>
                        <div class="panel-aside-main-content"></div>
                    </div>
                    </div>
                    <div class="history-panel-aside-body">
                    <div class="goods-expand">
                        <svg focusable="false" class="icon-i87i-svg" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1365" width="20" height="20"><path d="M317.84959998 926.1056a46.08 46.08 0 0 1 10.8544-29.9008L643.68639998 521.216a13.312 13.312 0 0 0 0-18.432l-3.6864-3.072L328.70399998 127.7952a46.4896 46.4896 0 0 1 71.0656-59.8016l311.0912 370.68799999a105.8816 105.8816 0 0 1 0 146.63680002l-311.0912 370.68799999a46.2848 46.2848 0 0 1-81.92-29.9008z" fill="#bfbfbf" p-id="1366"></path></svg>
                    </div>
                    <div class="goods-review">
                        `+goodsHtml+`
                    </div>
                    <div class="history-box-expand">
                        `+icons.history+`
                        <label langue-extension-text="history_bar_hint">`+ext.helper.i18n.get("history_bar_hint")+`</label>
                    </div>
                    <div class="wrapper-drag-handle">
                        <svg focusable="false" class="icon-i87i-svg" viewBox="0 0 24 24" data-testid="DragIndicatorIcon"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2m-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2" fill="#bfbfbf"></path></svg>
                    </div>
                    </div>
                </div>
            `;
            
            outerDIV.insertAdjacentHTML('beforeend', html);
            this.addEventListener(platform);
        };

        this.addDragEventListener = () =>{
            const {outerDIV} = this._container;

            //Add right-click to move
            const draggable = outerDIV.querySelector(".history-panel-wrapper .wrapper-drag-handle");
            const wrapper = outerDIV.querySelector(".history-panel-wrapper");
        
            const offsetWrapper = Object.assign({}, ext.helper.dao.getDefaults().h.offset);
            let isDragging = false, startY, elementBottom;
            let windowHeight = window.innerHeight;
            let bottomMax = parseInt(windowHeight/3)*2, bottomMin = ext.helper.dao.getDefaults().h.offset.bottom;
        
            //Update window height (when window size changes)
            window.addEventListener('resize', () => {
                windowHeight = window.innerHeight;
                bottomMax = parseInt(windowHeight/3)*2;
            });
            function onMouseUp() { //Mouse release event
                if (!isDragging) return;
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                ext.helper.dao.setDataByKey($.opts.storageKeys.history.offset, offsetWrapper);
            }
            function onMouseMove(e) { //Mouse movement event
                if (!isDragging) return;
                const deltaY = e.clientY - startY; //Mouse Y-axis movement offset
                let newBottom = elementBottom - deltaY; //Calculate the new bottom value
                //Restrict the range of the bottom value
                if (newBottom <= bottomMin) {
                    newBottom = bottomMin;
                } else if (newBottom > bottomMax) { //Control the upward range
                    newBottom = bottomMax;
                }
                //Update component position and record values
                wrapper.style.bottom = `${newBottom}px`;
                offsetWrapper.bottom = newBottom;
            }
            draggable.addEventListener('mousedown', (e) => {
                e.preventDefault();
                //Ensure the wrapper's style is set to absolute or fixed.
                if (window.getComputedStyle(wrapper).position !== 'absolute' &&
                    window.getComputedStyle(wrapper).position !== 'fixed') {
                    console.error('The wrapper element must have position set to "absolute" or "fixed".');
                    return;
                }
                isDragging = true;
                startY = e.clientY; //Record the Y coordinate when the mouse is pressed.
                //Get the current bottom value, ensuring it is parsed as a number.
                elementBottom = parseInt(window.getComputedStyle(wrapper).bottom, ext.helper.dao.getDefaults().h.offset.bottom)
                    || ext.helper.dao.getDefaults().h.offset.bottom;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        };

        this.addEventListener = (platform)=> {

            const {outerDIV, shadowRoot} = this._container;
            
            const self = this;
            const items = outerDIV.querySelectorAll(".goods-review >.goods-review-item >a");
            items.forEach((ele)=>{
                ele.addEventListener('mouseover', function() {
                    this.querySelector(".review-shadow").style.display="block";
                });
                ele.addEventListener('mouseout', function() {
                    this.querySelector(".review-shadow").style.display="none";
                });
            });
        
            //Expand bottom tool products
            const goodsExpandEle = outerDIV.querySelector(".history-panel-wrapper .goods-expand");
            if(goodsExpandEle){
              goodsExpandEle.addEventListener("click",function(){
                const goodsReviewEle = this.nextElementSibling;
        
                const svgEle = this.querySelector("svg");
                svgEle.style.transition = 'transform 0.3s';
        
                if(goodsReviewEle.style.width=="0px"){
                  goodsReviewEle.style.width = "auto";
                  svgEle.style.transform = 'rotate(0deg)';
                }else{
                  goodsReviewEle.style.width = "0px";
                  svgEle.style.transform = 'rotate(180deg)';
                }
              });
            }
        
            //Large history box, close
            const historyBoxExpandEles = [
            outerDIV.querySelector(".history-panel-wrapper .history-box-expand"),
            outerDIV.querySelector(".history-panel-wrapper .close")
            ];
            const asideMainEle = outerDIV.querySelector(".history-panel-wrapper >.history-panel-aside-main");
            if(asideMainEle){
            historyBoxExpandEles.forEach((ele) => {
                if (ele) {
                ele.addEventListener("click", function () {
                    const computedDisplay = window.getComputedStyle(asideMainEle).display;
                    if (computedDisplay === "none") {
                        self.showOrHideHistoryBox(platform);
                        asideMainEle.style.display = "block";
                    } else {
                        asideMainEle.style.display = "none";
                    }
                });
                }
            });
            }
        
            //Click outside the history record pop-up to hide the large history record box.
            document.addEventListener("click", function (event) {
                const path = event.composedPath();
                //Determine if the click is within the Shadow DOM.
                const clickedInsideShadow = path.some((el) => el === outerDIV || el === shadowRoot);
                if (!clickedInsideShadow) {
                    asideMainEle.style.display = "none";
                }
            });
        
            //Pop up settings window
            const headerSettingElement = outerDIV.querySelector(".history-panel-wrapper .setting");
            if(headerSettingElement){
                headerSettingElement.addEventListener("click",()=>{
                    new $.SettingHelper(ext).showDialog(()=>{
                        outerDIV.querySelector(".history-panel-aside-body .goods-review").innerHTML='';
                        outerDIV.querySelector(".history-panel-aside-main .panel-aside-main-content").innerHTML='';
                    });
                });
            }
        
            //Bind click event
            outerDIV.querySelectorAll(".history-panel-aside-body a[jump-tag='true']").forEach((ele)=>{
                ele.addEventListener("click",function(e){
                    e.stopPropagation();
                    e.preventDefault();

                    const href = this.getAttribute("jump-url");
                    ext.helper.dao.call("openLink", {
                        href:ext.helper.util.decryptStr(href),
                        newTab: true,
                        active: true
                    });
                });
            });
        
            self.addDragEventListener();
        };

        this.show = ()=>{
            const outerDIV = this._container?.outerDIV;
            if (outerDIV) {
                outerDIV.style.display = "block";
            }
        };

        this.hide = ()=>{
            const outerDIV = this._container?.outerDIV;
            if (outerDIV) {
                outerDIV.style.display = "none";
            }
        };

        this.run = async() =>{
            try{
                if(support.record.disabled){
                    return;
                }

                const files = ["commonBase","goodsHistory"];
                const styleObj = await ext.helper.styleHelper.readCssContent(files);
                const styles = files.map(file => styleObj[file]).join("\n");

                const container = ext.helper.elementUtil.generateShadowDomRoot(support.p+"-"+models.history, styles);
                this._container = container;

                this.createHistoryBox(support.p);
            }catch(e){
                ext.logger("error", "history is exception:"+e);
            }
        };
	}

})(jsu);