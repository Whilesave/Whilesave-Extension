($ => {
    
    "use strict";
    $.GoodsRecordHelper = function (ext, support) {

        this.run = ()=>{

            const href = window.location.href;
            const platform = support.p;
            if(support.record.disabled){
                return;
            }

            const {title, price, cover} = support.record.elements;
            if(!support.detail.test(href)){
                return;
            }

            const id = ext.helper.util.getGoodsIdByLink(href);
            ext.logger("info", "goods detail> title", title);
            ext.logger("info", "goods detail> price", price);
            ext.logger("info", "goods detail> cover", cover);

            if(title && price && cover){
                Promise.all([
                    $.waitForElement(price, document.body, false),
                    $.waitForElement(cover, document.body, true),
                ]).then((elements)=>{
                    const priceElement = elements[0];
                    const coverElement = elements[1];
                    const titleElement = document.querySelector(title);

                    ext.logger("info", "goods detail> titleElement", titleElement);
                    ext.logger("info", "goods detail> priceElement", priceElement);
                    ext.logger("info", "goods detail> coverElement", coverElement);

                    if(coverElement && priceElement){
                        var imgSrc = "";
                        if(coverElement.tagName == "IMG"){ //Images generally use lazy loading.
                            imgSrc = coverElement.getAttribute("data-src") 
                                || coverElement.getAttribute("data-url") || coverElement.getAttribute("src");

                        }else if(coverElement.tagName == "SOURCE"){
                            imgSrc = coverElement.getAttribute("srcSet") || coverElement.getAttribute("src")
                        }
                        const price = priceElement ? priceElement.innerText : "Unknown";
                        const title = titleElement ? titleElement.innerText : "--";
                        const goods = {"id":id, "url":href, "pic":imgSrc, "date":(new Date()).getTime(), "price":price, "title":title}
                        ext.helper.coupon.goodsHistory.push(platform, goods);
                    }
                }).catch(()=>{});
            }
        }
	}
})(jsu);