($ => {
    "use strict";

    /**
     * @param {*} ext 
     */
    $.storageSessionHelper = function (b) {
        const storageSession = $.api.storage.session;

        this.set = (opt) => {
            return storageSession.set(opt.params);
        };
        this.get = (opt) => {
            return storageSession.get(opt.params);
        };
        this.remove = (opt) => {
            return storageSession.remove(opt.params);
        }
        this.clear = () => {
            return storageSession.clear();
        }
    };
})(jsu);