($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.LoggerHelper = function (ext) {
        this.log = (level="info", ...messages)=>{
            if(level.toLowerCase() === 'info'){
                console.info(...messages);
            }else if(level.toLowerCase() === 'error'){
                console.error(...messages);
            }else{
                console.log(...messages);
            }
        }
    };
})(jsu);