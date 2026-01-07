($ => {
    "use strict";

    /**
     * Subscription will simply insert an identifier into the html of the partner website.
     * 
     * @param {*} ext 
     */
    $.SubscribeHelper = function (ext) {

        //List of partner websites
        const websites = [
            { name: "tikfork", match: /^www\.tikfork\.com$/ },
            { name: "tool77", match: /^www\.tool77\.com$/ }
        ];

        /**
         * Insert an identifier into the body
         * @returns 
         */
        const init = () => {
            const host = window.location.host;
            const website = websites.find(site => site.match.test(host));
            if (!website) return;

            document.documentElement.setAttribute(
                "ws-p-c",
                website.name+"-"+randomString(16)
            );
        };

        const randomString = (length = 8)=> {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        this.run = () => {
            init();
        };
        
    };
})(jsu);