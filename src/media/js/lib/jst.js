/**
 * jst - Javascript tool
 */
(() => {
    
    "use strict";

    const runningFetch=[];

    /**
     * jsuTools
     */
	const jsuTools = {
        /**
         * Promise for a delay of the given duration
         *
         * @param {int} t
         * @returns {Promise}
         */
        delay: (t = 0) => {
            return new Promise((resolve) => {
                setTimeout(resolve, t);
            });
        },
       
        fetch: (url, opts = {},timeout=null) => {
        	
        	if(JSON.stringify(opts) === '{}') {opts['method']="post"};
        	
        	const controller = new AbortController();
        	let signal=controller.signal;
        	
        	//promise
        	const promise = new Promise((resolve, reject)=>{
        		fetch(url, { signal:signal, ...opts })
	        	.then((response)=>{
	        		if (response.status < 400) {
	      				resolve(response);
	      			}else{
                        reject(response);//Refuse, enter catch, catch returns error to upper layer
                    }
	        	})
	        	.catch(e=>{
	      			runningFetch.push({url: url});//Preparing to abort.
	      			reject(null);
	      		});
        	});
        	let out = null;
        	if(timeout!=null){
        		if (signal){
                    signal.addEventListener("abort", () => controller.abort());
                }
        		out=setTimeout(() => controller.abort(), timeout);
        	}
        	return promise.finally(() => {if(out!=null) {clearTimeout(out)} });
        },


        fetchSimple: (url, method, params, timeout = 20*1000) => {
            const config = {
                method: method.toUpperCase()
            };
            if(config.method === "POST") {
                config.headers = {"Content-Type": "application/json;charset=UTF-8"};
                config.body = JSON.stringify(params);
            }
            return new Promise((resolve, reject)=>{
                this.fetch(url, config, timeout).then((response) => {
                    return response.ok ? response.text() : Promise.reject(response.statusText);
                }).then((result)=>{
                    return resolve({"code": "success", "result": result});
                }).catch((error) => {
                    return resolve({"code": "error", "result": error});
                });
            });
        },

        /**
         * Cancels all FetchRequests or only the ones with the given url
         *
         * @param {string} url
         */
        cancelFetch: (url = null) => {
            runningFetch.forEach((obj) => {
                if (url === null || obj.url === url) {
                    const controller = new AbortController();
                    controller.abort();
                    obj = null;
                }
            });
        },

        onPageLoad:(callback)=>{
            if (document.readyState === "complete") {
                callback();
            } else {
                window.addEventListener("DOMContentLoaded", callback, { once: true });
                window.addEventListener("load", callback, { once: true });
            }
        },

        waitForElement:(selector, target=document.body, allowEmpty = true, delay=100, maxDelay=10 * 1000)=>{
            return new Promise((resolve,reject) =>{
                let totalDelay = 0, element = null, result = false;
                if(target){
                    element = target.querySelector(selector);
                    let result = allowEmpty ? !!element : (!!element && !!element.innerHTML);
                    if(result){
                        resolve(element);
                        return;
                    }
                }
                const elementInterval = setInterval(()=>{
                    if(totalDelay >= maxDelay){
                        clearInterval(elementInterval);
                        resolve(null);
                    }
                    target = (target ?? document.body);
                    if(target){
                        element = target.querySelector(selector);
                        result = allowEmpty ? !!element : (!!element && !!element.innerHTML);
                        if(result){
                            clearInterval(elementInterval);
                            resolve(element);
                        }else{
                            totalDelay += delay;
                        }
                    }
                }, delay);
            });
        },

        forceGetElement: async function(handler){
            const getElements = async (handler)=>{
                const promiseArray = [];
                const handlers = handler.split("@");
                for(let i=0; i<handlers.length; i++){
                    const eleName = handlers[i];
                    if(!eleName){
                        continue;
                    }
                    if(eleName=="body"){
                        promiseArray.push(
                            new Promise((resolve,reject) =>{ resolve(document.body) })
                        );
                    }else if(eleName=="html"){
                        promiseArray.push(
                            new Promise((resolve,reject) =>{ resolve(document.html) })
                        );
                    }else{
                        promiseArray.push(this.waitForElement(eleName, document.body, true, 10, 1500));
                    }
                }
                let element = await Promise.race(promiseArray);
                return element;
            }
        
            let element = await getElements(handler);
            return new Promise((resolve,reject) =>{
                if(element){
                    resolve(element);
                    return;
                }
                const waitInterval = setInterval(()=>{
                    element = getElements(handler);
                    if(element){
                        clearInterval(waitInterval);
                        resolve(element);
                        return;
                    }
                }, 2000);
            });
        }
    };

    (()=>{
    	self.jsuTools = jsuTools;
    })();
    
})();