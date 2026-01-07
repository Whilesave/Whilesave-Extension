($ => {
    
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.StyleHelper = function (ext) {
    	
		/**
		 * get insert css object
		 * @returns {Object}
		 */
		const getInsertObj = () =>{
			const context = $(document);
			let head = null;
			if (context.find("head").length() === 0) { // document does not have a head -> append styles to the body
				head = context.find("body");
			} else {
				head = context.find("head");
			}
			return head;
		}

    	 /**
         * Adds the stylesheets to the document
         * @param {Array} files
         */
        this.addStylesheets = (files) => {
            return new Promise((resolve) => {
				const head = getInsertObj();
	            this.readCss(files, head).then(()=>{
	            	resolve();
	            });
	        });
        };

		/**
         * Adds the stylesheets to the document
         * @param {String} css
         */
		this.addStylesheetsByContent = (css, name, head = null) => {
			if(head == null){
				head = getInsertObj();
			}
			if ($.cl &&  $.cl.page &&  $.cl.page.style && $.attr && $.attr.name) {
				head.find("style." +  $.cl.page.style + "[" + $.attr.name + "='" + name + "']").remove();
				head.append("<style class='" +  $.cl.page.style + "' " + $.attr.name + "='" + name + "'>" + css + "</style>");
			} else {
				head.append("<style>" + css + "</style>");
			}
		};

        this.readCss = (files, head = null) => {
	        return new Promise((resolve,reject) => {
				this.readCssContent(files).then((cssObj)=>{
					for (let key in cssObj) {
						this.addStylesheetsByContent(cssObj[key], key, head);
					}
					resolve();
				}).catch(()=>{
					resolve();
				});
	        });
	    };

		/**
		 * Read CSS file content by name
		 * @param {*} files 
		 * @returns 
		 */
		this.readCssContent =(files)=>{
			return new Promise((resolve,reject) => {
	        	let loaded = 0;
				let text = {};
	            files.forEach((file) => {
	                $.fetch($.api.runtime.getURL("media/css/" + file + ".css")).then((res) => {
	                    res.text().then((data)=>{
                    		text[file] = data;
                            loaded++;
		                    if (loaded >= files.length) {
		                        resolve(text);
		                    }
                    	});
	                }).catch(err => {
						resolve(text);
					});
	            });
	        });
		}
	}

})(jsu);