($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.MaskHelper = function (ext) {

        this.generate = function(){
            const mask = ext.helper.elementUtil.createElement("div", {
              className:"mask-container"
            });
            return mask;
        };
    };
})(jsu);