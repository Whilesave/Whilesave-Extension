($ => {
    "use strict";

    /**
     * This JavaScript will only run on websites supported by 
     * 
     * `SupportsHelper.defaultSupportsString` and `SubscribeHelper.websites`, 
     * and will not run on other websites.
     */
    const ClientPage = function () {
		
		//Script execution entry point
        //Startup process, get supports -> init helpers -> int
        this.run = () => {
            (new $.SupportsHelper()).getSupport().then((object)=>{
                const {support, supports} = object;

                //Coupon search and rebate operations will only be performed on websites that are compatible with the support file.
                if(support){
                    initHelpers(support, supports);
                    init(support, supports);
                    addMessageListener();
                }
                new $.SubscribeHelper(this).run();
            });
        };
        
        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialize helper
         * @param {*} support 
         * @param {*} supports 
         */
        const initHelpers = (support, supports) => {
            this.helper = {
                dao:new $.DaoHelper(this),
                i18n: new $.I18nHelper(this),
                cacheContainers: new $.DataStoreHelper(), //For storing virtual DOM nodes
                toast: new $.ToastHelper(),
                logger: new $.LoggerHelper(this),
                styleHelper: new $.StyleHelper(this),
                file: new $.FileHelper(this),
                util: new $.UtilHelper(this),
                elementUtil: new $.ElementUtilHelper(this),
                request: new $.RequestHelper(this, support, supports),
                featureControl: new $.FeatureControlHelper(this,support),
                coupon:{
                    inspectCouponsHTML: new $.InspectCouponsHTMLHelper(this, support, supports),
                    goodsHistory: new $.GoodsHistoryHelper(this, support),
                    goodsRecord: new $.GoodsRecordHelper(this, support)
                }
            };
        };

        /**
         * Logic related to handling coupons and rebates
         * 
         * @param {*} support 
         * @param {*} supports 
         */
        const init = (support, supports)=>{

            if($.browserName==="safari"){ //Safari updates may be delayed, so clear it every time you open it.
                this.sendBackgroundMessage($.opts.messageActions.updateToolbar, 
                    {text:"", toolbarIconFlash:false}
                ); 
            }

            this.helper.dao.init().then(()=>{
                return Promise.all([
                    this.helper.i18n.init(),
                    this.helper.styleHelper.addStylesheets(["base","commonBase"]),
                    this.helper.request.initRequestData()
                ]);
            }).then(()=>{
                //Below are all the adapted platforms; if not adapted, no action is required.
                const platform = support.p;
                const tasksMap = {};    //Save specific operation task o: specific object, f: specific method, p: specific parameters
                let isShopping = true;  //false, not a shopping platform, no need to check the right button

                //Specific operations for all platforms (create new instances for each platform separately to save memory)
                if(platform == supports.jtmMid.p){
                    isShopping = false;
                    new $.MidListenerHelper(this).run();
                }
                //Search engine reminder
                else if(platform == supports.google.p || platform == supports.bing.p){
                    isShopping = false;
                    new $.SearchEnginScreenHelper(this, support).run();
                }
                //Shopping platform
                else if(platform == supports.aliexpress.p){
                    const aliexpress = new $.AliexpressHelper(this, supports.aliexpress);
                    const aliexpressSearch = new $.AliexpressSearchHelper(this, supports.aliexpress);

                    this.helper.coupon.aliexpress = aliexpress;
                    this.helper.coupon.aliexpressSearch = aliexpressSearch;
                    tasksMap.aliexpress = [{o:aliexpress, f: "run", p:null}];
                    tasksMap.aliexpressSearch = [{o:aliexpressSearch, f: "run", p:null}];

                }else if(platform == supports.ebay.p){
                    const ebay = new $.EbayHelper(this, supports.ebay);
                    const ebaySearch = new $.EbaySearchHelper(this, supports.ebay);

                    this.helper.coupon.ebay = ebay;
                    this.helper.coupon.ebaySearch = ebaySearch;
                    tasksMap.ebay = [{o:ebay, f: "run", p:null}];
                    tasksMap.ebaySearch = [{o:ebaySearch, f: "run", p:null}];
                    
                }else if(platform == supports.bestbuy.p){
                    const bestbuy = new $.BestbuyHelper(this, supports.bestbuy);
                    const bestbuySearch = new $.BestbuySearchHelper(this, supports.bestbuy);

                    this.helper.coupon.bestbuy = bestbuy;
                    this.helper.coupon.bestbuySearch = bestbuySearch;
                    tasksMap.bestbuy = [{o:bestbuy, f: "run", p:null}];
                    tasksMap.bestbuySearch = [{o:bestbuySearch, f: "run", p:null}];
                }else if(platform == supports.lazada.p){
                    const lazada = new $.LazadaHelper(this, supports.lazada);
                    const lazadaSearch = new $.LazadaSearchHelper(this, supports.lazada);

                    this.helper.coupon.lazada = lazada;
                    this.helper.coupon.lazadaSearch = lazadaSearch;
                    tasksMap.lazada = [{o:lazada, f: "run", p:null}];
                    tasksMap.lazadaSearch = [{o:lazadaSearch, f: "run", p:null}];
                    
                }else if(platform == supports.banggood.p){
                    const banggood = new $.BanggoodHelper(this, supports.banggood);
                    const banggoodSearch = new $.BanggoodSearchHelper(this, supports.banggood);

                    this.helper.coupon.banggood = banggood;
                    this.helper.coupon.banggoodSearch = banggoodSearch;
                    tasksMap.banggood = [{o:banggood, f: "run", p:null}];
                    tasksMap.banggoodSearch = [{o:banggoodSearch, f: "run", p:null}];
                    
                }else if(platform == supports.amazon.p){
                    const amazon = new $.AmazonHelper(this, supports.amazon);

                    this.helper.coupon.amazon = amazon;
                    tasksMap.amazon = [{o:amazon, f: "run", p:null}];
                    
                }

                if(isShopping){ //All shopping platforms need to display the right-click button.
                    this.helper.coupon.inspectCouponsHTML.run();
                    this.helper.coupon.goodsRecord.run();

                    for(let key in tasksMap){ //Unified Execution Entry
                        tasksMap[key].forEach((task, index) => {
                            task.o[task.f](task.p);
                        });
                    }
                }
            });
        }

        /**
         * Monitor messages
         */
        const addMessageListener = () =>{
            $.api.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === $.opts.messageActions.toolbarIconClick) {
                    this.helper.coupon.inspectCouponsHTML.run(2);
                }
            });
        }
        /**
         * Send message
         * @param {*} action 
         * @param {*} value 
         * @param {*} callback 
         */
        this.sendBackgroundMessage = (action, value, callback) => {
            $.api.runtime.sendMessage({action: action, value:value});
        };

        this.logger=(level="info", ...messages)=>{
        	if($.isDev){
        		this.helper.logger.log(level, ...messages);
        	}
	    };
    };
    
    new ClientPage().run();
})(jsu);