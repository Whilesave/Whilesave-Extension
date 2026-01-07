($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.ProgressModalHelper = function (ext, support, supports) {

        this.checkIsStop = false; //Check if stopped
        const maskHelper = new $.MaskHelper(ext);
        const autoDetectUtil = new $.AutoDetectUtilHelper(ext, support, supports);
        const customAlert = new $.AlertHelper();

        this._start = function(){
            this.checkIsStop = false;
            document.body.style.overflow = 'hidden';
        };

        this._end = function(){
            document.body.style.overflow = 'auto';
            this.checkIsStop = true;
        };

        this.initProgress = function(progressBar){
            progressBar.style.width = "0%";
        };

        this.updateProgressValue = function(progressBar, value){
            progressBar.style.width = value*100+"%";
        };

        this.activeCouponItem = function(couponItem){
            couponItem.classList.add("coupon-item-active");
        };

        this.inactiveCouponItem = function(couponItem){
            ext.helper.elementUtil.removeClass(couponItem, "coupon-item-lose");
            couponItem.classList.add("coupon-item-lose");
        };

        this.closeModal = function(mask){
            mask.remove();
            this._end();
        };

        this.addCloseEventListener = function(mask, modal){
            modal.querySelector("div[class^='close']").addEventListener("click", (e)=>{
              this.closeModal(mask);
            });
        };

        this.showCouponItems = async function(mask, modal, platform, coupons, supportData){
            const couponsWarpper = modal.querySelector("div[class^='deal-coupons-warpper']");
            const progressBar = modal.querySelector("div[class^='progress-bar']");
        
            const icons = await ext.helper.file.readContent("media/img/svg/", [
                {"name":"alertSuccess", "ext":"svg"},
                {"name":"alertError", "ext":"svg"},
            ]);

            //Dynamically generate HTML
            const couponElements = coupons.map((coupon)=>{
                return {
                    "element":ext.helper.elementUtil.createElement("div",{
                        className:"coupon-item",
                        text:coupon
                    }),
                    "code":coupon
                }
            });
            couponElements.forEach((item,index)=>{
                couponsWarpper.append(item.element);
            });
        
            //Initialization
            let index = 0, total = coupons.length;
            const alertHiddenDelay = 4000;
            this.initProgress(progressBar);
        
            //Start verifying tickets: Preparations
            const validateData = await autoDetectUtil.validate(platform, supportData);
            if(!validateData || !validateData.result){
                this.closeModal(mask);
                customAlert.show({
                    "icon":icons.alertError,
                    "message":ext.helper.i18n.get("auto_detect_alert_error"),
                    "delay":alertHiddenDelay
                });
                return;
            }
        
            //Start checking tickets: Officially begins.
            const results = [];
            for(let index=0; index<total; index++){
                if(this.checkIsStop){
                    break;
                }
                const {element, code} = couponElements[index];
                if(index!=0){
                    this.inactiveCouponItem(couponElements[index-1].element);
                }
                this.activeCouponItem(element);
                this.couponScrollToCenter(couponsWarpper, element);
                this.updateProgressValue(progressBar, (index+1)/total);
                let result = await autoDetectUtil.tryCode(platform, supportData, code);
                results.push({"code":code, "result":result});
                if(result){
                    break;
                }
            }
            //If none are effective in the end, simply close or execute other logic.
            this.closeModal(mask);
            const successCodeObj = results.find(item => item.result === true);
            if(successCodeObj){
                customAlert.show({
                    "icon":icons.alertSuccess,
                    "message":ext.helper.i18n.get("auto_detect_alert_success"),
                    "delay":alertHiddenDelay
                });
            }else{
                customAlert.show({
                    "icon":icons.alertError,
                    "message":ext.helper.i18n.get("auto_detect_alert_error"),
                    "delay":alertHiddenDelay
                });
            }
        };

        this.couponScrollToCenter = function(couponsWarpper, element) {
            const couponsWarpperRect = couponsWarpper.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            //Calculate scroll distance: Element center position = current scroll + (element center - container center)
            const scrollLeft = couponsWarpper.scrollLeft + (elementRect.left + elementRect.width / 2) - (couponsWarpperRect.left + couponsWarpperRect.width / 2);
            couponsWarpper.scrollTo({
                left: scrollLeft,
                behavior: 'smooth' //Smooth scrolling
            });
        };

        this.generate = async function(logoBase64OrUrl, container, platform, coupons, supportData){

            const icons = await ext.helper.file.readContent("media/img/svg/", [
                {"name":"close", "ext":"svg"},
            ]);

            //TEST================
            // supportData = {
            //   "promoContainerSelector":"div[class*='CheckoutSummaryRedesign__container']",
            //   "expandCodeBoxSelectors":[
            //     "div[class*='RedCheckoutSummaryRedesign_Coupon__coupon__'] span[class*='Coupon__couponText']",
            //     "div[class*='RedCheckoutSummaryRedesign_TotalPrice__container__'] span[class*='Coupon__couponText']",
            //     "div[class*='RedCheckoutSummaryRedesign_TotalPrice__container__'] span[class*='TotalPrice']"
            //   ],
            //   "couponInputSelector":"div[class^='RedCheckoutSummaryRedesign_Coupon__inputWrap__'] input",
            //   "submitButtonSelector":"div[class^='RedCheckoutSummaryRedesign_Coupon__button__'] >button",
            //   "applyErrorSelector":"div[class^='RedCheckoutSummaryRedesign_Coupon__inputWrap__'] span[class*='Input__error']",
            //"existingCodeSelector":"", // Determine via input
            //   "removeCodeAction":"",
            //   "onlyOneCanBeUsed":false,
            //   "finalPriceSelector":""
            // }
            // coupons = ["12345", "7FOR70", "7SAF2YVI", "12345"]; //7FOR70
            //TEST================
        
            this._start();
            const modalHtml = `
                <div class="modal-header">
                    <div class="logo">
                    <img src="`+logoBase64OrUrl+`" />
                    </div>
                    <div class="title"></div>
                    <div class="btns">
                    <div class="close">`+icons.close+`</div>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="deal-pic-warpper"></div>
                    <div class="deal-description-warpper">
                    <div class="title" langue-extension-text="auto_detect_modal_description">`+ext.helper.i18n.get("auto_detect_modal_description")+`</div>
                    <div class="sub-title" langue-extension-text="auto_detect_modal_secondary_description">`+ext.helper.i18n.get("auto_detect_modal_secondary_description")+`</div>
                    </div>
                    <div class="deal-coupons-warpper"></div>
                    <div class="deal-progress-warpper">
                    <div class="progress-container">
                        <div class="progress-bar" style="width:0px;"></div>
                    </div>
                    </div>
                </div>
            `;

            //Generate a blurred background
            const mask = maskHelper.generate();
            //Generate popup body
            const modal = ext.helper.elementUtil.createElement("div", {
                className:"modal-content",
                html:modalHtml
            });
            mask.append(modal);
            container.outerDIV.append(mask);
        
            this.showCouponItems(mask, modal, platform, coupons, supportData);
            this.addCloseEventListener(mask, modal);
        };

    };
})(jsu);