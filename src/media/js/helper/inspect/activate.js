($ => {
    "use strict";
  
    /**
     * @param {*} ext 
     */
    $.ActivateHelper = function (ext) {

        this.generate = function (couponTotal, badgeData, dragData, interfaceData) {
            
            const badgeCss = Object.entries(badgeData)
                .map(([key, value]) => `${key.replace("_","-")}:${value}`)
                .join(';');
            const dragCss = Object.entries(dragData)
                .map(([key, value]) => `${key.replace("_","-")}:${value}`)
                .join(';');
            const interfaceCss = Object.entries(interfaceData)
                .map(([key, value]) => `${key.replace("_","-")}:${value}`)
                .join(';');

            //Drag button
            const drag = ext.helper.elementUtil.createElement("div", {
                className: "drag all-center",
                attributes:{
                    "style":dragCss,
                },
                childrens:[ext.helper.elementUtil.createElement("img", {
                    attributes:{
                        src:"data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='10'%20height='17'%20viewBox='0%200%2010%2017'%3e%3cg%20id='drag_icon'%20data-name='drag%20icon'%20transform='translate(-756.458%20-5682.563)'%3e%3ccircle%20id='Ellipse_277'%20data-name='Ellipse%20277'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(756.458%205682.563)'%20fill='%23fff'/%3e%3ccircle%20id='Ellipse_280'%20data-name='Ellipse%20280'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(763.458%205682.563)'%20fill='%23fff'/%3e%3ccircle%20id='Ellipse_281'%20data-name='Ellipse%20281'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(756.458%205689.563)'%20fill='%23fff'/%3e%3ccircle%20id='Ellipse_283'%20data-name='Ellipse%20283'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(756.458%205696.563)'%20fill='%23fff'/%3e%3ccircle%20id='Ellipse_282'%20data-name='Ellipse%20282'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(763.458%205689.563)'%20fill='%23fff'/%3e%3ccircle%20id='Ellipse_284'%20data-name='Ellipse%20284'%20cx='1.5'%20cy='1.5'%20r='1.5'%20transform='translate(763.458%205696.563)'%20fill='%23fff'/%3e%3c/g%3e%3c/svg%3e",
                        draggable:false
                    }
                })]
            });

            //Logo section
            const logoChildrens = [];
            if(!!couponTotal){
                const logoNotification = ext.helper.elementUtil.createElement("div", {
                    className: "notification all-center pulse-reveal",
                    text:couponTotal,
                    attributes:{
                        "style":badgeCss,
                    }
                });
                logoChildrens.push(logoNotification);
            }
            const logo = ext.helper.elementUtil.createElement("div", {
                className: "logo",
                childrens:logoChildrens,
                attributes:{
                    "style":interfaceCss,
                },
            });
            const content = ext.helper.elementUtil.createElement("div", {
                className:"content",
                childrens:[logo, drag],
            });
            const widget = ext.helper.elementUtil.createElement("div", {
                className:"widget",
                attributes:{
                    "style":"top:"+this.getActivateTop()+"px",
                },
                childrens:[content]
            });

            this.addEventListenerDrag(drag, widget);
            return {"widget":widget, "logo":logo};
        };
        
        this.updateActivateTop = function(top){
            ext.helper.dao.setDataByKey($.opts.storageKeys.position.logoTop, top);
        };

        this.getActivateTop = function(){
            let top = ext.helper.dao.getData($.opts.storageKeys.position.logoTop, ext.helper.dao.getDefaults().p.logoTop);
            if(top >= window.innerHeight - 50){
                top = window.innerHeight - 50;
            }
            return top;
        };

        this.addEventListenerDrag = function(drag, widget){
            let isDragging = false, startY, elementY;
            let windowHeight = window.innerHeight;
            const self = this;
            function onMouseMove(e) { //Mouse movement event
                if (!isDragging) return;
                const deltaY = e.clientY - startY;

                let top = elementY + deltaY;
                if(top < 0) {
                    top = 0;
                }else if(top>windowHeight-50){
                    top = windowHeight-50;
                }
                widget.style.top = `${top}px`;
                self.updateActivateTop(top);
            }
            function onMouseUp() { //Mouse release event
                if (!isDragging) return;
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            drag.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                startY = e.clientY;
                elementY = parseInt(widget.style.top, 10) || 0;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
  
        };
    };
})(jsu);