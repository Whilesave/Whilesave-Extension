($ => {
    "use strict";

    /**
     * @param {*} ext 
     * This is a utility method class for elements.
     */
    $.ElementUtilHelper = function (ext) {

        /**
         * Create HTML element
         * @param {*} tag 
         * @param {*} options 
         * @returns 
         */
        this.createElement = function(tag, options = {}){
            const element = document.createElement(tag);
            if (options.text) {
                element.textContent = options.text;
            }
            if (options.html) {
                element.innerHTML = options.html;
            }
            if (options.style) {
                Object.assign(element.style, options.style); //Merge the incoming style object into the element's style.
            }
            if (options.className) {
                element.className = options.className;
            }
            if (options.attributes) {
                for (let [key, value] of Object.entries(options.attributes)) {
                    element.setAttribute(key, value);
                }
            }
            //If child elements are passed in, recursively add them.
            if (options.childrens) {
                options.childrens.forEach(child => {
                    element.appendChild(child);
                });
            }
            return element;
        };
        
        this.removeClass = function(element, className) {
            element.classList.remove(className);
        };

        this.addClass = function(element, className) {
            element.classList.add(className);
        };

        this.toggleClass = function(element, className) {
            element.classList.toggle(className);
        };

        this.hasClass = function(element, className) {
            return element.classList.contains(className);
        };

        this.getStyle = function(element, styleName) {
            return window.getComputedStyle(element).getPropertyValue(styleName);
        };

        /**
         * If the network speed is too slow, retrieval may be abnormal, requiring regular monitoring of the body.
         * Especially when run_at = document_start
         * @returns
         */
        this.getAvailableBody = function() {
            return new Promise((resolve)=>{
                let body = document.body;
                if(body){
                    resolve(body);
                    return;
                }
                const interval = setInterval(()=>{
                    body = document.body;
                    if(body){
                        clearInterval(interval);
                        resolve(body);
                    }
                },100);
            });
        };

        /**
         * Determine if the element is displayed
         * @param element 
         * @returns 
         */
        this.isElementDisplayed = function(element) {
            if (element.offsetParent!== null) {
                return true;
            }
            const style = window.getComputedStyle(element);
            return style.display!== "none";
        };

        /**
         * Generate root, virtual DOM, mask differences
         * outerDIV is the outermost div, where all elements are appended.
         * shadowRoot This is the outermost virtual DOM
         */
        this.generateShadowDomRoot = function(name, css="", dir="ltr", moveToEnd=false, observerTime=20000){
            const insertRootElement = (document.documentElement||document.body);
            const root = this.createElement("div",{
            attributes:{
                "style":"all: initial!important;z-index:2147483647!important;display:block!important;",
                "action":"action-"+name
            }
            });
            insertRootElement.appendChild(root);

            const outerDIV = this.createElement("div",{
            attributes:{
                "data-extension-direction":dir,
                "id":"root-"+name
            }
            });
            const shadowRoot = root.attachShadow({ mode: 'open' });
            this.addShadowRootStyle(shadowRoot, name, css);

            shadowRoot.appendChild(outerDIV);
            const now = Date.now();

            //If root is not at the end, move it to the end, provided that loading is complete.
            //If an action value is included, it indicates that it is one's own node and should not be processed.
            if(moveToEnd){
                const observer = new MutationObserver(() => {
                    const lastChild = insertRootElement.lastElementChild;
                    if (lastChild!==root
                    && !lastChild.getAttribute("action")
                    && document.documentElement) { //document.documentElement is unlikely to be empty, but compatibility handling is still performed.
                        if(Date.now() - now <= observerTime){ //If the time hasn't arrived yet, continue checking.
                            insertRootElement.appendChild(root);
                        }else{//Time's up, let's cancel it for now.
                            observer.disconnect();
                        }
                    }
                });
                observer.observe(insertRootElement, {
                    childList: true,     //✅ Only listen for child element addition/removal
                    subtree: false,      //✅ Only listen to the first layer of <html>
                    attributes: false,   //❌ Does not listen for property changes
                    characterData: false //❌ Do not listen for text changes
                });
            }
            if(name && name.indexOf("aliexpress")!=-1){ //Excluding various click touchpoints in AliExpress.
                setInterval(()=>{
                    outerDIV.querySelectorAll("*[data-re-mark-tag='aliexpress']").forEach((element) => {
                        ext.helper.util.removeAnchorsByNode(element);
                    });
                }, 3000);
            }
            ext.helper.cacheContainers.add(shadowRoot); //Cache the shadowRoot directory, mainly for subsequent language updates.
            return {"outerDIV":outerDIV, "shadowRoot":shadowRoot};
        };

        /**
         * Add styles to virtual nodes
         * @param shadowRoot 
         * @param name 
         * @param css 
         */
        this.addShadowRootStyle = function(shadowRoot, name, css){
            if(!shadowRoot.querySelector("#style-"+name)){
                const newStyle = document.createElement('style');
                newStyle.textContent = css;
                newStyle.id = "style-"+name;

                const existingStyle = shadowRoot.querySelector('style');
                if(existingStyle){
                    existingStyle.after(newStyle);
                }else{
                    shadowRoot.insertBefore(newStyle, shadowRoot.firstChild);
                }
            }
        };

    };
})(jsu);