($ => {
    "use strict";

    /**
     * Specifically for data storage
     * @param {*} ext 
     */
    $.DataStoreHelper = function () {
        const data = [];
        
        this.add = function(item) {
            data.push(item);
        };

        this.remove = function(item) {
            const index = data.indexOf(item);
            if (index !== -1) {
                data.splice(index, 1);
            }
        };

        this.clear = function() {
            data.length = 0;
        };

        this.getAll = function() {
            return [...data]; //Return a copy to prevent external modifications to the original data.
        };

        this.getSize = function() {
            return data.length;
        };
    };

})(jsu);