(() => {
    
    "use strict";

    /* eslint-disable no-console */
    /* global Func, path */

    global.modulePath = __dirname + "/node_modules/";
	
	const release = true;
	const platform = "firefox";   //chrome firefox safari
    
    try {
        require("./funcs");
    } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") {
            throw e;
        }
        console.error("Build script is missing. Please download from https://github.com/Kiuryy/node.js_Build");
        process.exit(1);
    }

    /**
     *
     * @type {Object}
     */
    let packageJson = {};
    /**
     * Starts building the application
     */
    const Build = () => {
        
        const start = +new Date();
        console.log("Building release...\n");

        autoSupports().then(()=>{
            return loadPackageJson();
        }).then(()=>{
    		return Func.cleanPre(); //clean
    	})
    	.then(()=>{
    		return new Promise((resolve) => {

	    		if(release){
	    			const pipeline = js()
                        .then(()=>{
                            return css();
                        })
                        .then(()=>{
                            return img();
                        })
                        .then(()=>{
                            return conf();
                        })
                        .then(()=>{
                            return json();
                        })
                        .then(()=>{
                            return worker();
                        });
                        if(platform === "safari"){
                             //safari adds an extra task to copy to the swift project
                            pipeline.then(()=>{
                                return safari();
                            }).then(resolve);
                        }else{
                            pipeline.then(() => {
                                return zip();
                            })
                            .then(resolve);
                        }
                    }
                    else{
                        dev()
                        .then(resolve)
                    }
		    });
    	}).then(()=>{
    		return Func.cleanPost();
    	}).then(()=>{
    		console.log("\nRelease built successfully\t[" + (+new Date() - start) + " ms]");
    	})
    };

    /**
     * Parses the json files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const worker = () => {
        return Func.measureTime((resolve) => {
            Func.replace({
                [path.src + "service_worker.js"]: path.tmp + "service_worker.js",
            }, [
                [/\/\*\-\-\s*\[start\]\s*\-\-\*\/[\s\S]*?\/\*\-\-\s*\[end\]\s*\-\-\*\//mig, "import\"./media/js/worker.js\""],
            ]).then(() => {
                return Func.minify([path.tmp + "service_worker.js"], path.dist);
            }).then(resolve);
        }, "Create service worker files to dist directory");
    };
    
    /**
     * Parses the json files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const json = () => {
        return Func.measureTime((resolve) => {
            Func.replace({ // parse manifest.json
                [path.src + "manifest-"+platform+".json"]: path.tmp + "manifest.json"
            }, [
                [/("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig, "$1\"media/js/lib/jst.js\",\"media/js/lib/jscs.js\",\"media/js/opts.js\",\"media/js/client-page.js\"$3"],
                [/("version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + packageJson.version + "$2"],
                [/("version_name":[\s]*")[^"]*("[\s]*,)/ig, "$1" + packageJson.versionName + "$2"],
            ]).then(() => { // minify in dist directory
                return Func.minify([path.tmp + "manifest.json", path.src + "_locales/**/*.json"], path.dist, false);
            }).then(resolve);
        }, "Moved json files to dist directory");
    };
    
     /**
     * Read the package.json of the project and parse its JSON content into an object
     *
     * @returns {*}
     */
    const loadPackageJson = () => {
        return Func.measureTime((resolve) => {
            const fs = require("fs");

            const rawData = fs.readFileSync("package.json");
            const parsedData = JSON.parse(rawData);

            if (parsedData) {
                packageJson = parsedData;
                packageJson.preamble = "Copyright 2025 " + packageJson.author + "\n" +
                "* Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
                "* you may not use this file except in compliance with the License.\n" +
                "* You may obtain a copy of the License at\n" +
                "* http://www.apache.org/licenses/LICENSE-2.0\n";
                resolve();
            } else {
                console.error("Could not load package.json");
                process.exit(1);
            }
        }, "Loaded package.json");
    };
    
    /**
     * minify css and Moved css files to dist directory
     *
     * @returns {Promise}
     */
    const css = () => {
        return Func.measureTime((resolve) => {
            Func.minify([ // parse scss files
                path.src + "/media/css/**/*"
            ], path.dist, false, packageJson.preamble).then(resolve);
        }, "minify css and Moved css files to dist directory");
    };
    
    /**
     * Copies the images to the dist directory
     *
     * @returns {Promise}
     */
    const img = () => {
        return Func.measureTime((resolve) => {
            Func.copy([path.src + "media/img/**/*"], [], path.dist ,false).then(resolve);
        }, "Moved image files to dist directory");
    };
        
    /**
     * Copies the images to the dist directory
     *
     * @returns {Promise}
     */
    const conf = () => {
        return Func.measureTime((resolve) => {
            Func.minify([
                path.src + "media/conf/*"
            ], path.dist, false, packageJson.preamble).then(resolve);
            
        }, "Moved conf files to dist directory");
    };
    
    /**
     * Parses the js files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const js = () => {
        return Func.measureTime((resolve) => {
            Func.concat( // concat extension javascripts
                [
                    path.src + "media/js/helper/**/*.js",
                    path.src + "media/js/client-page.js"
                ],
                path.tmp + "client-page-merged.js"
            )
            .then(() => {
                return Func.concat( // concat background javascripts
                    [
                        path.src + "media/js/bg/**/*.js",
                        path.src + "media/js/background.js"
                    ],
                    path.tmp + "worker-merged.js"
                );
            })
            .then(() => {
                return Func.concat( //manage need basic js(Additional HTML pages)
                    [
                        path.src + "media/js/helper/i18n.js",
                        path.src + "media/js/helper/style.js",
                        path.src + "media/js/helper/dao.js",
                    ],
                    path.tmp + "manage-basic-merged.js"
                );
            })
            .then(() => {
                return Func.replace({
                    [path.tmp + "client-page-merged.js"]: path.tmp + "client-page.js",
                    [path.tmp + "worker-merged.js"]: path.tmp + "worker.js",
                    [path.tmp + "manage-basic-merged.js"]: path.tmp + "manage-basic.js"
                }, [
                    [/}\)\(jsu\);[\s\S]*?\(\$\s*=>\s*{[\s\S]*?"use strict";/mig, ""]
                ]);
            })
            .then(() => { // delay execution, so the files are created properly before being used to minify
                return new Promise((rslv) => {
                    setTimeout(rslv, 1000);
                });
            })
            .then(() => {
                return Func.minify([
                    path.tmp + "client-page.js",
                    path.tmp + "worker.js",
                    path.src + "media/js/opts.js"
                ], path.dist + "media/js/", true, packageJson.preamble);
            })
            .then(() => {
                return Func.minify([
                    path.src + "media/js/lib/jst.js",
                    path.src + "media/js/lib/jscs.js",
                    path.src + "media/js/lib/jsbg.js"
                ], path.dist + "media/js/lib/", true, packageJson.preamble);
            })
            .then(() => {
                return Func.minify([
                    path.tmp + "manage-basic.js",
                ], path.dist + "media/js/m/", true, packageJson.preamble);
            })
            .then(resolve);
        }, "Moved js files to dist directory");
    };
    
    /**
     * Copies the images to the dist directory
     *
     * @returns {Promise}
     */
    const dev = () => {
	    return Func.measureTime((resolve) => {
        	//promise
        	Func.powerfulRemove(path.divDist)//remove
        	.then(()=>{
        		return Func.powerfulCopy(path.src, path.devDist);//copy
        	})
			.then(()=>{
				return Func.replace({ // parse manifest.json
				    [path.src + "manifest-"+platform+".json"]: path.devDist + "manifest.json"
				}, []);
			})
			.then(resolve)
        }, "dev version deploy successfully");
    };
    
    
    /**
     * Generate zip file from dist directory
     *
     * @returns {Promise}
     */
    const zip = () => {
        return Func.measureTime((resolve) => {
            Func.zipDirectory(path.dist, path.distZip + packageJson.name + "_" + packageJson.versionName + "_" + platform + ".zip").then(resolve);
        }, "Created zip file from dist directory");
    };

    const safari = () =>{
        return Func.measureTime((resolve) => {
            Func.powerfulCopy(path.dist, "safari_extension/whilesave/whilesave Extension/Resources").then(resolve);
        }, "copy to safari project successfully");
    }
    
    const standardizedConf = async ()=>{
        const fs = require('fs');
        const { default: stripJsonComments } = await import('strip-json-comments');
        const configPath = path.src + 'config/coupon_supports.conf';

        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = stripJsonComments(raw);

        fs.writeFileSync(configPath, config.trim(), 'utf-8');
        return config;
    };

    const autoSupports = async () => {
        const fs = require("fs");
        const supportsPath = path.src+"media/js/helper/base/data/supports.js";
        const code = fs.readFileSync(supportsPath, "utf-8");
        const match = code.match(/(?:export\s+)?const\s+defaultSupportsString\s*=\s*`([\s\S]*?)`\s*;?/);
        if (!match) {
            throw new Error("Not Find defaultSupportsString");
        }

        // Beautify the code and maintain consistent formatting.
        const supportString = await standardizedConf();
        const support = JSON.parse(supportString);
        let formattedJson = JSON.stringify(support, null, 4);
        formattedJson = formattedJson
            .split('\n')
            .map(line => '            ' + line) // 12 blanks
            .join('\n');

        // Rewrite the supports.js file
        const newCode = code.replace(
            match[0],
            `const defaultSupportsString = \`\n${formattedJson}\n        \`;`
        );
        fs.writeFileSync(supportsPath, newCode, "utf8");
        
        // write SUPPORTS.md
        const lines = [];
        lines.push("## Websites Supported by Whilesave");
        lines.push("Whilesave only supports the following platforms and matches URLs using the \"Permission Pattern\" matching method.");
        lines.push("");
        lines.push("| Platform | Permission Pattern |");    
        lines.push("|----------|--------------------|");
        for (const key in support) {
            const {p, match} = support[key];
            const cleanedMatch = match
                .replace(/\\\\/g, '\\')
                .replace(/\|/g, '&#124;');
            lines.push(
                `| ${p} | ${cleanedMatch} |`
            );
        }

        const supportMarkdown = lines.join("\n");
        fs.writeFileSync("./SUPPORTS.md", supportMarkdown, "utf8");
    };

    //execute
    Build();
})();