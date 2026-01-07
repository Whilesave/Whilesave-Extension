($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.InspectCouponsHTMLHelper = function (ext, support, supports) {
        
        const platform = support ? support.p : "unknown";
        const activate = new $.ActivateHelper(ext); //Activate button
        const couponListModal = new $.CouponListModalHelper(ext, supports); //Coupon List Modal
        const progressModal = new $.ProgressModalHelper(ext, supports);

        const models = {
            flyout:"flyout-model",
            detect:"detect-model"
        };

        let inspectData = null; //Basic data of HTML elements
        this._container = null;
        
        /**
         * Initializing loading data
         * @returns 
         */
        this.initInspectData = async () =>{
            try{
                if(inspectData){ //If initialization is already complete, return directly.
                    return;
                }

                const infoJson = await ext.helper.request.getDetectInfoResult();
                if(!infoJson){
                    return;
                }
                ext.logger("info", "detect info=========>", infoJson);

                const show = infoJson["show"];  //Whether to show the right sidebar button
                //Top toolbar control
                const toolbarIconFlyout = infoJson["toolbar_icon_flyout"]; //Can it be displayed through the top menu icon?
                const toolbarIconFlash = infoJson["toolbar_icon_flash"];       //Whether to show the toolbar icon animation on load
                const toolbarCouponBadge = infoJson["toolbar_coupon_badge"];     //Whether to display the badge on the toolbar icon during loading

                const historyShow = infoJson["history_show"]; //Whether to display the history record function
                
                const couponTotal = infoJson["coupon_total"]; //Number of badges in the upper left corner
                const modalPosition = infoJson["modal"];   //Modal box pop-up data
            
                const iconJson = infoJson["icon"];
                const badgeData = iconJson["badge"];
                const dragData = iconJson["drag"];
                const interfaceData = iconJson["interface"];
            
                const cggJson = infoJson["cgg"];
                const autoOpen = cggJson["auto_open"]; //Open automatically?
                const modalTitle = cggJson["current_platform"];
                
                const moveToEnd = cggJson["move_to_end"];
                const observerTime = cggJson["observer_time"] ?? 20*1000;

                //If not returned, use the local one.
                const logoBase64OrUrl = !!cggJson["logo"] ? cggJson["logo"] : $.api.runtime.getURL("media/img/logo/logo.png");

                const flyout = infoJson["flyout"];

                //Send update message request
                ext.sendBackgroundMessage($.opts.messageActions.updateToolbar, 
                    {
                        text:!!toolbarCouponBadge ? toolbarCouponBadge : "",
                        toolbarIconFlash:toolbarIconFlash
                    }
                ); 

                //Prepare the data needed for inspection.
                inspectData = {
                    activate:{
                        "show":show,                     //Display activation button on the current page?
                        "toolbarIconFlyout":toolbarIconFlyout,        
                        "toolbarIconFlash":toolbarIconFlash,
                        "historyShow":historyShow,
                        "couponTotal":couponTotal,
                        "modalPosition":modalPosition,
                        "badgeData":badgeData,
                        "dragData":dragData,
                        "interfaceData":interfaceData,
                    },
                    couponListModal:{
                        "autoOpen":autoOpen, //Open automatically?
                        "modalTitle":modalTitle,
                        "logoBase64OrUrl":logoBase64OrUrl,
                        "flyout":flyout
                    },
                    elements:{
                        "moveToEnd":moveToEnd,
                        "observerTime":observerTime,
                        "container":{
                            "outerDIV":null, //Outermost container
                            "shadowRoot":null
                        }
                    }
                }
            }catch(error){
                inspectData = null;
                ext.logger("error", "req exception", error);
            }
        };

        this.showFlyout = (container, flyout) =>{
            const {outerDIV,shadowRoot} = container;
            if ( !! flyout && !!flyout.html && !!flyout.css && !!flyout.conf) {
                const {html, css, conf} = flyout;
                
                ext.helper.elementUtil.addShadowRootStyle(shadowRoot, models.detect, css); //Add css
                outerDIV.insertAdjacentHTML("beforeend", html); //Add html

                const cggfCloseFlyout = () =>{
                    const flyoutEl = outerDIV.querySelector("[name='" + conf.name + "']");
                    if (flyoutEl) {
                        flyoutEl.classList.add(conf.close_animation);
                        flyoutEl.addEventListener("animationend", () => flyoutEl.remove(), {
                            once: true
                        });
                    }
                };

                if (conf.delay > 0) {
                    setTimeout(cggfCloseFlyout, conf.delay);
                }

                //Close button event
                const closeButton = outerDIV.querySelector(conf.close_button);
                if (closeButton) {
                    closeButton.addEventListener('click', cggfCloseFlyout);
                }

                //Add Activation Authorization Event
                ext.helper.util.bindCustomEvent(outerDIV.querySelector("*[name='cgg02xClickToActivate']"), (option)=>{
                    if(!option){
                        return;
                    }
                    if(option.hasOwnProperty("dismissAfter") && option.dismissAfter){
                        cggfCloseFlyout();
                    }
                    if(option.hasOwnProperty("callbackEvent")){
                        ext.helper.util.addActivateCallbackEvent(outerDIV, option);
                    }
                });
                
                //Add automatic coupon verification event.
                ext.helper.util.bindApplyCouponsEvent(outerDIV.querySelector("*[name='applyCouponButton']"), (dataJson)=>{
                    const {codes, check, open} = dataJson;
                    Promise.resolve().then(() => {
                        progressModal.generate(
                            inspectData.couponListModal.logoBase64OrUrl,
                            container,
                            platform, codes, check);
                    });
                     Promise.resolve().then(() => {
                        if(!!open){
                            try {
                                ext.helper.util.openUrl(open);
                            } catch (error) {
                                ext.logger("error", "detect error", error);
                            }
                        }
                     });
                });
            }
        };

        /**
         * @returns 
         * outerDIV needs to be exposed, and all subsequent elements will be children of this element.
         */
        this.generateOuterContainer = async () =>{
            const dir = ext.helper.i18n.getDir();
            const {moveToEnd, observerTime} = inspectData.elements;
            const files = ["commonBase", "inspect", "loadding"];
            const styleObj = await ext.helper.styleHelper.readCssContent(files);
            const styles = files.map(file => styleObj[file]).join("\n");

            const container = ext.helper.elementUtil.generateShadowDomRoot(support.p+"-"+models.detect, styles, dir, moveToEnd, observerTime);
            return container;
        };

        /**
         * 
         * @param {*} openedFrom 
         * 1: Activate from current page
         * 2: Activate from the tool menu
         * @returns 
         */
        this.generate = async (openedFrom = 1) =>{
            const windowShow = await ext.helper.featureControl.isEnabled($.opts.featureControlKeys.windowShow);
            await this.initInspectData();

            //If there is no initial data, return directly.
            if(!inspectData){
                return;
            }

            const {show, toolbarIconFlyout, historyShow, couponTotal, modalPosition, badgeData, 
                dragData, interfaceData}  = inspectData.activate;
            const {autoOpen, modalTitle, logoBase64OrUrl, flyout} = inspectData.couponListModal;

            if(historyShow && openedFrom==1){
                ext.helper.coupon.goodsHistory.run().then(()=>{
                    if(!windowShow){  //Whether the history record is displayed is subject to the settings.
                        ext.helper.coupon.goodsHistory.hide();
                    }
                });
            }

            //If not displayed, return directly.
            if((!show && openedFrom==1) || (!toolbarIconFlyout && openedFrom==2)){
                return;
            }

            //Generate the outermost container
            let container = null;
            if(!inspectData.elements.container.outerDIV || !inspectData.elements.container.shadowRoot){
                container = await this.generateOuterContainer();
                container.outerDIV.setAttribute("data-re-mark-tag", platform);
                inspectData.elements.container = container;

            }else{
                container = inspectData.elements.container;
            }
            this._container = container;
            
            const {outerDIV} = container;
            if(openedFrom == 1){
                const {widget, logo} = activate.generate(couponTotal, badgeData, dragData, interfaceData);  //Generate activation button
                outerDIV.append(widget);
                if(windowShow){ //The display of the right button and the automatic display of the coupon list should be affected by the settings.
                    if(autoOpen){
                        couponListModal.generate(logoBase64OrUrl, container, modalTitle, modalPosition);
                    }
                }else{
                    widget.style.display = "none";
                }
                logo.addEventListener("click",(e)=>{ //Click event
                    couponListModal.generate(logoBase64OrUrl, container, modalTitle, modalPosition);
                });
            }else if(openedFrom == 2){
                couponListModal.generate(logoBase64OrUrl, container, modalTitle, modalPosition);
            }

            //Add flyout, ensure the right button is displayed first, then show the flyout.
            if(openedFrom==1){
                setTimeout(()=>{
                    this.showFlyout(container, flyout);
                    outerDIV.setAttribute("status","complete");
                }, 1000);
            }
        }

        //Show right activation button
        this.showRightWidget = ()=>{
            const outerDIV = this._container?.outerDIV;
            if (outerDIV) {
                const widget = outerDIV.querySelector(".widget");
                if(widget){
                    widget.style.display = "block";
                }
            }
        };

        //Show left activation button
        this.hideRightWidget = ()=>{
            const outerDIV = this._container?.outerDIV;
            if (outerDIV) {
                const widget = outerDIV.querySelector(".widget");
                if(widget){
                    widget.style.display = "none";
                }
            }
        };

        this.run = async (openedFrom = 1)=>{
            await this.generate(openedFrom);
        };
    };
})(jsu);