($ => {
    "use strict";

    /**
     * UI dialog
     * @param {*} ext 
     */
    $.DialogHelper = function () {

        const createElements = (params) => {
            const container = document.createElement('div');
            container.setAttribute("style", "all: initial!important;z-index:2147483647!important;display:block!important;");
            container.setAttribute("action","action-dialog");
            (document.documentElement||document.body).appendChild(container);

            const mask = document.createElement('div');
            mask.classList.add("dialog-gcc-mask");
            const shadowRoot = container.attachShadow({ mode: 'open' });
            shadowRoot.appendChild(mask);

            const content = document.createElement('div');
            content.classList.add("dialog-gcc-container");

            if (params.hasOwnProperty("direction")) {
                content.setAttribute("data-extension-direction", params.direction);
            }

            mask.appendChild(content);

            //Unify CSS styles
            let styleText = `
                 *[data-extension-direction='rtl']{
                    direction: rtl!important;
                }
                .dialog-gcc-mask {
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.6);
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    right: 0;
                    z-index: 9999999999999;
                }
                .dialog-gcc-container {
                    max-width: 350px;
                    width: 90%;
                    background-color: #fff;
                    box-shadow: 0 0 2px #999;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 5px;
                }
                .dialog-gcc-title {
                    width: 100%;
                    height: 55px;
                    line-height: 55px;
                    box-sizing: border-box;
                    color: #000;
                    text-align: center;
                    font-weight: 700;
                    font-size: 17px;
                    border-radius: 4px 4px 0 0;
                    position: relative;
                    border-bottom: 1px solid #ebe6e6;
                }
                .dialog-gcc-close-btn {
                    text-decoration: none;
                    color: #000;
                    position: absolute;
                    top: 0;
                    inset-inline-end:15px;
                    font-size: 25px;
                    display: inline-block;
                    cursor: pointer;
                    user-select: none;
                }
                .dialog-gcc-content {
                    padding: 15px;
                    max-height: 400px;
                    overflow: auto;
                }
            `;
            if (params.hasOwnProperty("styleSheet")) {
                styleText += params.styleSheet;
            }
            const dialogStyle = document.createElement('style');
            dialogStyle.textContent = styleText;
            shadowRoot.insertBefore(dialogStyle, shadowRoot.firstChild);

            this.container = container;
            this.mask = mask;
            this.content = content;
            this.dialogStyle = dialogStyle;
            this.shadowRoot = shadowRoot;
        };


        const middleBox = (params) => {
            const {content} = this;

            content.replaceChildren();

            const title = document.createElement('div');
            title.classList.add("dialog-gcc-title");

            let titleText = '';
            if (typeof params === 'string') {
                titleText = params;
            } else if (typeof params === 'object' && params.title) {
                titleText = params.title;
            }

            const span = document.createElement("span");
            span.textContent = titleText;
            span.setAttribute("langue-extension-text", "setting_modal_title");
            title.appendChild(span);

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.classList.add("dialog-gcc-close-btn");

            closeBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.close();
            };

            title.appendChild(closeBtn);
            content.appendChild(title);

            this.closeBtn = closeBtn;
        };

        this.showMake = function(params) {
            createElements(params);
            middleBox(params);
            this.params = params;

            const {content} = this;

            const dialogContent = document.createElement('div');
            dialogContent.classList.add("dialog-gcc-content");

            dialogContent.insertAdjacentHTML("beforeend", params.content || '');
            content.appendChild(dialogContent);

            this.dialogContent = dialogContent;
            if (typeof params.onContentReady === 'function') {
                params.onContentReady(this);
            }
        }
        this.close = function() {
            if(this.container){
                this.container.remove();
            }
            const params = this.params;
            if (params && typeof params.onContentReady === 'function') {
                params.onClose();
            }
            this.params = null;
        }
    };

    $.ToastHelper = function(){
        this.show = (params) =>{
            let time = params.time;
            let background = params.background;
            let color = params.color;
            let position = params.position;  //center-top, center-bottom
            let defaultMarginValue = 50;
            
            if(time == undefined || time == ''){
                time = 1500;
            }
            if(position==undefined || position==''){
                position = "center-bottom";
            }
        
            const style = document.createElement('style');
            style.textContent = `@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}@-webkit-keyframes fadeIn{0%{opacity:0}100%{opacity:1}}@-moz-keyframes fadeIn{0%{opacity:0}100%{opacity:1}}@-o-keyframes fadeIn{0%{opacity:0}100%{opacity:1}}@-ms-keyframes fadeIn{0%{opacity:0}100%{opacity:1}}@keyframes fadeOut{0%{opacity:1}100%{opacity:0}}@-webkit-keyframes fadeOut{0%{opacity:1}100%{opacity:0}}@-moz-keyframes fadeOut{0%{opacity:1}100%{opacity:0}}@-o-keyframes fadeOut{0%{opacity:1}100%{opacity:0}}@-ms-keyframes fadeOut{0%{opacity:1}100%{opacity:0}}.toast-style-kk998y{position:fixed;background:rgba(0,0,0,0.7);color:#fff;font-size:14px;line-height:1;padding:10px;border-radius:3px;left:50%;transform:translateX(-50%);-webkit-transform:translateX(-50%);-moz-transform:translateX(-50%);-o-transform:translateX(-50%);-ms-transform:translateX(-50%);z-index:999999999999999999999999999;white-space:nowrap}.fadeOut{animation:fadeOut .5s}.fadeIn{animation:fadeIn .5s}`;
        
            const el = document.createElement("div");
            if(background!=undefined && background!=''){
                el.style.backgroundColor=background;
            }
            if(color!=undefined && color!=''){
                el.style.color=color;
            }
            el.setAttribute("class", "toast-style-kk998y");
            el.innerText = params.message;
            el.style.zIndex=999999999;
            if(position==="center-bottom"){
                el.style.bottom = defaultMarginValue+"px";
            }else{
                el.style.top = defaultMarginValue+"px";
            }
        
            document.body.appendChild(el);
            document.head.appendChild(style);
            el.classList.add("fadeIn");
        
            setTimeout(function () {
                el.classList.remove("fadeIn");
                el.classList.add("fadeOut");
                el.addEventListener("animationend", function () {
                    document.body.removeChild(el);
                    document.head.removeChild(style);
                });
                el.addEventListener("webkitAnimationEnd", function () {
                    document.body.removeChild(el);
                    document.head.removeChild(style);
                });
            }, time);
        };
    };

    $.AlertHelper = function(){
        /**
         * @param {Object} params
         * icon
         * text
         * delay
         */
        this.show = function(params){
            const style = document.createElement('style');
            const random = "_"+Math.ceil(Math.random()*100000000);
            style.textContent = `
                .custom-alert-container`+random+` {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 2147483647;
                    width: 250px;
                }
                .custom-alert-content`+random+` {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background-color: #FFF;
                    border: 1px solid #ecebeb;
                    border-radius: 5px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    padding: 10px;
                    opacity: 1;
                    animation: fadein 0.5s;
                }
                .custom-alert-icon`+random+` {
                    margin-bottom: 10px;
                }
                .custom-alert-message`+random+` {
                    font-size: 15px;
                    color: #333;
                    text-align: center;
                }
                @keyframes customFadein`+random+` {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes customFadeout`+random+` {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;

            const container = document.createElement("div");
            container.className = 'custom-alert-container'+random;

            const alertContent = document.createElement('div');
            alertContent.className = `custom-alert-content`+random;
            container.appendChild(alertContent);

            if(params.icon){
            const icon = document.createElement('div');
            icon.className = 'custom-alert-icon'+random;
            icon.innerHTML = params.icon;
            alertContent.appendChild(icon);
            }

            const text = document.createElement('div');
            text.className = 'custom-alert-message'+random;
            text.textContent = params.message;
            alertContent.appendChild(text);

            document.body.appendChild(container);
            document.head.appendChild(style);

            setTimeout(() => {
            alertContent.style.animation = 'customFadeout'+random+' 0.5s';
            alertContent.addEventListener('animationend', () =>{
                container.remove();
                style.remove();
            });
            }, params.delay);
        }
    };

})(jsu);