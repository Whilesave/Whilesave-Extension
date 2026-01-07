($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.CouponListModalHelper = function (ext, supports) {

        const progressModal = new $.ProgressModalHelper(ext, supports);
        this._container = null;
        this._logoBase64OrUrl = null;
        let hasModal = false; //Is there already a modal box?

        /**
         * Remove modal must call this method.
         * @param {*} modal 
         */
        const removeModel = function(modal){
            modal.remove();
            hasModal = false;
        };

        this.addCloseEventListener = function(button, modal){
            button.addEventListener("click", (e)=>{
                removeModel(modal);
            });
        };

        this.addShowSettingEventListener = async function(modal){
            const setting = modal.querySelector(".modal-header .btns> .setting");
            const dropdown = modal.querySelector('.modal-header #settingsDropdown');
            const hide30m = 30;
            const settingsData = [
                {
                    category: ext.helper.i18n.get("setting_window_show_display_title"),
                    items: [
                        { id: "hide30m", label: ext.helper.i18n.get("setting_window_show_display_hide30m",[hide30m]) },
                        { id: "hideSession", label: ext.helper.i18n.get("setting_window_show_display_session") },
                        { id: "showAll", label: ext.helper.i18n.get("setting_window_show_display_all") }
                    ]
                },
                {
                    category: ext.helper.i18n.get("setting_window_show_general_title"),
                    items: [
                        { id: "general", label: ext.helper.i18n.get("setting_window_show_general_general") }
                    ]
                }
            ];

            const managerSettingsData = async () => {
                const windowShow = await ext.helper.featureControl.isEnabled(
                    $.opts.featureControlKeys.windowShow
                );
                return settingsData.map(group => ({
                    ...group,
                    items: group.items
                        .map(item => ({ ...item }))
                        .filter(item => {
                            // unsupported sessionStorage
                            if (!$.api.storage.session && item.id === "hideSession") {
                                return false;
                            }
                            if (windowShow) {
                                return item.id !== "showAll";
                            }

                            return item.id === "showAll" || item.id === "general";
                        })
                }));
            };

            const generateSettingMenus =()=>{
                managerSettingsData().then((groups)=>{
                    dropdown.innerHTML = '';
                    groups.forEach(group => {
                        const categoryDiv = document.createElement('div');
                        categoryDiv.className = 'setting-category';

                        const title = document.createElement('div');
                        title.className = 'setting-category-title';
                        title.textContent = group.category;
                        categoryDiv.appendChild(title);

                        group.items.forEach(item => {
                            const opt = document.createElement('div');
                            opt.className = 'setting-option';
                            opt.textContent = item.label;
                            opt.dataset.id = item.id;  //Set the data-id attribute
                            opt.addEventListener('click', () => {
                                if(item.id==="hide30m"){
                                    ext.helper.featureControl.disableTemporarily($.opts.featureControlKeys.windowShow, hide30m * 60 * 1000);
                                    this.hideAllComponents();
                                    removeModel(modal);

                                }else if(item.id==="hideSession"){
                                    ext.helper.featureControl.disableForSession($.opts.featureControlKeys.windowShow);
                                    this.hideAllComponents();
                                    removeModel(modal);

                                }else if(item.id==="showAll"){
                                    ext.helper.featureControl.enable($.opts.featureControlKeys.windowShow);
                                    this.showAllComponents();
                                }
                                else if(item.id==="general"){
                                    removeModel(modal);
                                    new $.SettingHelper(ext).showDialog();
                                }
                                dropdown.classList.remove('active');
                            });
                            categoryDiv.appendChild(opt);
                        });
                        dropdown.appendChild(categoryDiv);
                    });
                });
            };

            setting.addEventListener('click', () => {
                dropdown.classList.toggle('active');
                if (dropdown.classList.contains('active')) {
                    generateSettingMenus();
                }
            });
            modal.addEventListener('click', (e) => {//Click outside the buttons to hide the settings box.
                if (!modal.querySelector('.modal-header .btns').contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
        };

        this.generateRequest = function(modalBody){
            const requestState = ext.helper.elementUtil.createElement("div", {
                className:"request-state"
            });
            modalBody.append(requestState);
            return requestState;
        },


        this.generateRequestLoadding = function(icons){
            return ext.helper.elementUtil.createElement("div", {
                className:"loading"
            })
        };

        this.generateRequestLoaddingError = function(icons, callback){
            const retry = ext.helper.elementUtil.createElement("div", {
                className:"loading-error-retry",
                text:ext.helper.i18n.get("couponList_modal_retry"),
                attributes:{
                    "langue-extension-text":"couponList_modal_retry"
                }
            });
            retry.addEventListener("click", ()=>{
                callback();
            });
            
            const error = ext.helper.elementUtil.createElement("div", {
                className:"loading-error",
                childrens:[
                    ext.helper.elementUtil.createElement("div", {
                        className:"loading-error-image",
                        html: icons.loaddingCouponListError
                    }),
                    retry
                ]
            });
            return error;
        };

        this.setCouponsHtml = function(modal, icons){
            const {outerDIV} = this._container;
            const modalBody = modal.querySelector("div[name='modalBody']");
        
            //Generation status
            const generateRequest = this.generateRequest(modalBody);
            const generateRequestLoadding = this.generateRequestLoadding(icons);
            const generateRequestLoaddingError = this.generateRequestLoaddingError(icons, ()=>{
                generateRequest.remove();
                this.setCouponsHtml(modal, icons);
            });
            generateRequest.append(generateRequestLoadding);
            
            //Request data
            ext.helper.request.getDetectCouponResult().then((dataJson)=>{
                if(!dataJson){
                    generateRequestLoadding.remove();
                    generateRequest.append(generateRequestLoaddingError);
                    return;
                }
                generateRequest.remove(); //Success removes the entire prompt node.
                const { data, structure } = dataJson;
                if(structure.hasOwnProperty("css") && structure.hasOwnProperty("html")){
                    const { css, html } = structure;
                    
                    ext.helper.elementUtil.addShadowRootStyle(this._container.shadowRoot, "coupon-list", css);
                    modalBody.innerHTML = html;
            
                    //*[name='cgg02xClickToActivate'] This is a hardcoded activation name value.
                    [
                        ".discount-base",
                        ".cgg-store-item",
                        ".showmore-btn",
                        "*[name='cgg02xClickToActivate']"
                    ]
                    .flatMap(selector => Array.from(modalBody.querySelectorAll(selector)))
                    .forEach((button) => {
                        const isActivateButton = button.matches("*[name='cgg02xClickToActivate']");
                        ext.helper.util.bindCustomEvent(button, (option)=>{
                            if(isActivateButton){ //This is the activation of proprietary logic.
                                ext.helper.util.addActivateCallbackEvent(outerDIV, option);
                            }
                        });
                    });

            
                    //Binding Switch
                    const tabs = modalBody.querySelectorAll("a[data-toggle='tab']");
                    const tabPanes = modalBody.querySelectorAll(".tab-pane");
                    tabs.forEach((element)=>{
                        element.addEventListener("click", function(e){
                        e.preventDefault();
                        e.stopPropagation();
                        
                        tabs.forEach(tab => tab.classList.remove("active"));
                        e.target.classList.add("active");
            
                        tabPanes.forEach(tab => tab.classList.remove("fade-in","active"));
                            const toggle = modalBody.querySelector(e.target.getAttribute("data-href") || e.target.getAttribute("href"));
                            toggle.classList.add("fade-in","active");
                        });
                    });
            
                    //Move-in and move-out event binding
                    const items = modalBody.querySelectorAll('.cgg-store-item');
                    items.forEach(item => {
                        item.addEventListener('mouseenter', (e) => {
                            e.target.querySelector("span").classList.add("underline-show");
                        });
                        item.addEventListener('mouseleave', (e) => {
                            e.target.querySelector("span").classList.remove("underline-show");
                        });
                    });
            
                    //Bind custom verification coupon function
                    const activateButton = modalBody.querySelector("*[name='activateButton']");
                    ext.helper.util.bindApplyCouponsEvent(activateButton, (dataJson)=>{
                        removeModel(modal);
                        const {platform, codes, check, open} = dataJson;
                        Promise.resolve().then(() => {
                            progressModal.generate(
                                this._logoBase64OrUrl,
                                this._container,
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
            }).catch((error)=>{
                generateRequestLoadding.remove();
                generateRequest.append(generateRequestLoaddingError);
                ext.logger("info", "generate coupon list error, ", error);
            });
        };
        
        this.showAllComponents = ()=>{
            ext.helper.coupon.inspectCouponsHTML.showRightWidget();
            ext.helper.coupon.goodsHistory.show();
        };

        this.hideAllComponents = ()=>{
            ext.helper.coupon.inspectCouponsHTML.hideRightWidget();
            ext.helper.coupon.goodsHistory.hide();
        };


        /**
         * @param {Object} container The outermost DIV that contains all elements.
         * @param {Object} modalPosition The position information of this model
         * @param {Object} openedFrom Where it was opened from
         */
        this.generate = async function(logoBase64OrUrl, container, title, modalPosition){
            if(hasModal){ //If there is already a modal box, do not generate another one until it is manually removed.
                return;
            }
            const {outerDIV} = container;
            const icons = await ext.helper.file.readContent("media/img/svg/", [
                {"name":"setting", "ext":"svg"},
                {"name":"close", "ext":"svg"},
                {"name":"loaddingCouponListError", "ext":"svg"}
            ]);

            this._container = container;
            this._logoBase64OrUrl = logoBase64OrUrl;
            
            const contentHtml = `
              <div class="modal-header">
                    <div class="logo">
                        <img src="`+logoBase64OrUrl+`" />
                    </div>
                    <div class="title">`+title+`</div>
                    <div class="btns">
                        <div class="setting">`+icons.setting+`</div>
                        <div class="setting-dropdown" id="settingsDropdown"></div>
                        <div class="close">`+icons.close+`</div>
                    </div>
              </div>
              <div class="modal-body" name="modalBody"></div>
            `;
        
            let modelCss = Object.entries(modalPosition)
                .map(([key, value]) => `${key.replace("_","-")}:${value}`)
                .join(';');
            const modal = ext.helper.elementUtil.createElement("div", {
                className:"coupon-list-widget-conent",
                html:contentHtml,
                attributes:{
                    "style":modelCss,
                }
            });
            outerDIV.append(modal);
            hasModal = true; //Mark already has a modal box.
        
            //Get elements from HTML
            const close = modal.querySelector(".modal-header .btns> .close");
           
            this.addCloseEventListener(close, modal);
            this.addShowSettingEventListener(modal);
            this.setCouponsHtml(modal, icons);
            
            return modal;
        }
    };
})(jsu);