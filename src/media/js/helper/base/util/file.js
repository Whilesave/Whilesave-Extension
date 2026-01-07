($ => {
    
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.FileHelper = function (ext) {
		/**
		 * 
		 * @param {*} root The root directory of the file, includes /
		 * @param {*} files [{"name":"file1", "ext":"txt"},{"name":"file2", "ext":"txt"}]
		 * @returns Returns a map distinguished by file name.
		 */
		this.readContent =(root, files)=>{
			if (!root.endsWith('/')) {
				root += '/';
			}
			return new Promise((resolve,reject) => {
	        	let loaded = 0;
				let contents = {};
	            files.forEach((file) => {
	                $.fetch($.api.runtime.getURL(root + file.name + "."+ file.ext)).then((res) => {
	                    res.text().then((data)=>{
                    		contents[file.name] = data;
                            loaded++;
		                    if (loaded >= files.length) {
		                        resolve(contents);
		                    }
                    	});
	                }).catch(err => {
						resolve(err);
					});
	            });
	        });
		}
	}

})(jsu);