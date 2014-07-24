/**
 * @fileoverview web msn binding to miniblog
 */
$import("sina/sina.js");
$import("sina/app.js");
$import('sina/core/events/addEvent.js');
$import('sina/core/events/fireEvent.js');
$import('sina/core/events/stopEvent.js');
$import('sina/core/function/bind2.js');
$import("sina/core/dom/getXY.js");
$import("sina/utils/template.js");
$import("sina/core/array/each.js");
$import("sina/core/dom/getElementsByAttr.js");
$import("sina/core/string/trim.js");
$import("sina/core/string/byteLength.js");
$import("sina/core/string/leftB.js");
$import("diy/general_animation.js");
$import("sina/utils/io/ajax.js");
$import("sina/core/system/getScrollPos.js");
$import("diy/dialog.js");
$import("sina/core/string/encodeHTML.js");
$import("diy/msn/_msn.js");
$import("diy/msn/templates.js");
$import("jobs/connect_msn.js");

Sina.msn.MSN = {
    config:function(/*Object*/option){
        this.clientid = option['clientid'];
        this.channelurl = option['channelurl'];
        this.callbackurl = option['callbackurl'];
        this.scope = option['scope']; 
        this.ui = option['ui']||this.initContainer();
        
        return this;
    },
    initContainer:function(){
        var dom = $C('div');
        this.setFixedPosition(dom);
        document.body.appendChild(dom);
        return dom;
    },
    inited:false,
    init:function(callback){
        //for debug ,U can use loader.debug.js
        var me = this;
        me.checkMsnbarSet(function(){
            me._loadScript("http://js.live.net/4.1/loader.js",Core.Function.bind2(me.startup,me));
        });
        me.afterLogIn = callback || function(){};
    },
    _loadScript:function(src,callback){
        var script = document.createElement("script");
        script.charset = "UTF-8";
        script.defer = true;
        script.setAttribute("type", "text/javascript");
        var head = document.getElementsByTagName("head")[0];
        script[document.all ? "onreadystatechange" : "onload"] = function(){
            if (this.onload || this.readyState.toLowerCase() === 'complete' || this.readyState.toLowerCase() === 'loaded') {
                callback();
                this.onreadystatechange = this.onload = null;
                head.removeChild(this);
            }
        };
        script.setAttribute("src", src);
        head.appendChild(script);
    },
    startup:function(){
    		if(window.Microsoft){//gzip+jsonp可能会在IE6下加载解压执行js失败
    			var me = Sina.msn.MSN;
    			me.inited = true;
	        me.showLoading();
	        Microsoft.Live.Core.Loader.initialize({market: "zh-CN"});
	        Microsoft.Live.Core.Loader.load(["microsoft.live"], function(){
	            Microsoft.Live.App.initialize({
	                channelurl: me.channelurl,
	                callbackurl:me.callbackurl,
	                clientid: me.clientid,
	                scope: me.scope,
	                onLoad: "Sina.msn.MSN.onAppLoaded"
	            });
	        });
    		}
    },
    //探测用户是否配置了显示msn bar.
    checkMsnbarSet:function(callback){
        Utils.Io.Ajax.request("http://t.sina.com.cn/msn/checkMsnbarSet.php",{
            "onComplete"  : function (oResult){
                if(oResult && oResult.code && oResult.code === "A00006" && typeof callback === 'function'){
                    callback();
                }
            },
            "onException" : function(e){},
            "returnType"  : "json",
            "GET"        : {
                
            }
        });
    },
    switchMSNBar:function(cmd,callback){
    		Utils.Io.Ajax.request("http://t.sina.com.cn/msn/msnset_post.php",{
            "onComplete"  : function (oResult){
                if(oResult && oResult.code && oResult.code === "A00006"){
                    callback();
                }
            },
            "onException" : function(e){},
            "returnType"  : "json",
            "POST"        : {
                'msn_tools':cmd//'0'关闭msn bar，'1'开启msn bar显示。
            }
    		});
    },
    destoryMsnBar:function(callback){
        this.switchMSNBar('0',callback);
    },
    //connect登录和refreshtoken时，必须按照http://207.46.16.248/en-us/library/ff752581.aspx的要求设置所有msn相关cookie
    refreshToken:function(){
        var me = this;
        Utils.Io.Ajax.request("/msn/refreshtoken.php",{
            "onComplete"  : function (oResult){
                if(oResult && oResult.code && oResult.code === "A00006"){
                    if(oResult.token){
                        var auth = Microsoft.Live.App.get_auth();
                        auth.readState();//重新读取、加载最新的cookie状态
                        Microsoft.Live.App.signIn();
                    }
                }
            },
            "onException" : function(e){},
            "returnType"  : "json",
            "GET"        : {
                
            }
        });
    },
    //检查聊天对象是否是微博用户，如果是，显示其微博profile页链接，如果不是，显示邀请链接。
    isRegisted:function(cid,email,callback,error){
    		if(cid && email){
    			var me = this;
	        Utils.Io.Ajax.request("/msn/aj_isRegisted.php",{
	            "onComplete"  : function (oResult){
	                if(oResult && oResult.code && oResult.code === "A00006"){
	                    if(oResult.uid && oResult.sex){
	                        callback(oResult.uid,oResult.sex);
	                    }
	                }else{
	                		error();
	                }
	            },
	            "onException" : function(e){},
	            "returnType"  : "json",
	            "POST"        : {
	            		'cid':cid,
	                'email':email
	            }
	        });
    		}
    },
    signIn:function(){
        this.messengerContext.signIn();
    },
    signOut:function(){
        this.messengerContext.signOut();
    },
    sendMessage:function(conv,msg){
        if(conv.isTextMessageValid(msg)){
            var msg = new Microsoft.Live.Messenger.TextMessage(msg, null);//震动消息 new Microsoft.Live.Messenger.NudgeMessage()
            conv.sendMessage(msg, null);
            return true;
        }
        return false;
    },
    getProfile:function(){
        var user = this.user,presence = user.get_presence(), contact = user.get_contact(); 
        return {
            displayName:this.getName(contact),
            status:presence.get_status(),
            face:presence.get_displayPictureUrl()
        };
    },
	getName:function(contact,noEncode){
			var name = contact.get_displayName()||contact.get_nickname()||contact.get_fullName()||"";
			name = noEncode? name :this.encodeHTML(name);
			return name;
	},
	getEmail:function(contact){
		return contact.get_currentAddress().get_address()||contact.get_currentAddress().$1.address||"";
	},
    setStatus:function(st){
        this.user.get_presence().set_status(st);//Microsoft.Live.Messenger.PresenceStatus.busy
    },
    encodeHTML : function(str){
		return str.replace(/&/mg,"&amp;").replace(/</mg,"&lt;").replace(/>/mg,"&gt;");
	},
    _eachGroup:function(groups,callback){
        if(groups.get_count){
            for(var i=0,len=groups.get_count();i<len;i++){
                callback(groups.get_item(i));
            }
        }else if(groups.length){
            this._each(groups,callback);
        }
    },
    //按照分组名称拼音排序;把"常用联系人"放到第一位
    _groupSort:function(groups){
        var arr = [], fav;
        this._eachGroup(groups,function(group){
            if(group.get_name() === '常用联系人' || group.get_name() === 'Favorites'){
                fav = group;
            }else{
               arr.push(group); 
            }
        });
        arr.sort(function(a,b){
            return a.get_name().localeCompare(b.get_name());
        });
        
        if(fav){
            arr.unshift(fav);
        }
        return arr;
    },
    _each:Core.Array.each,
    
    //主动创建新会话
    createConversation:function(contact){
    		if(contact.get_cid() === this.user.get_contact().get_cid()){
    			return ;
    		}
        var conv = this.conversations.create(contact); 
        if(contact && conv){
            this.showChatWindow(contact,conv);
        }
        return conv;
    },
    //----------------------------------------------show UI-------------------------------------------------
    toggleDisplay :function(newObj){
        this._position();
        if(this.openedDom){
            if(this.openedDom === newObj){
                if(newObj.style.display === 'none'){
                    newObj.style.display = '';
                }else{
                    newObj.style.display = 'none';
                }
                return;
            }
            this.openedDom.style.display = "none";
        }
        if(newObj){
            this.openedDom = newObj;
            this.openedDom.style.display = "";
        }
    },
    showChatWindow:function(contact,conversation){
        conversation.set_hasUnreadMessages(false);//get_hasUnreadMessages() true or false
        if($E("msg_notice_" + contact.get_cid())){
            $E("msg_notice_" + contact.get_cid()).children[0].style.color = "black";
        }
        
        var dom,me = this;
        if(dom = $E('msn_chat_window')){
            var rawName = me.getName(contact,true);
            var name = Core.String.byteLength(rawName) <= 24 ? rawName : Core.String.leftB(rawName,20) + "...";
            dom.innerHTML = (new Utils.Template(Sina.msn.Templates.chatWindow)).evaluate({
            		status:me.classObj[contact.get_presence().get_status()],
                face:contact.get_presence().get_displayPictureUrl(),
                name: me.encodeHTML(name)
            });
        }else{
            dom = $C('div');
            dom.id = "msn_chat_window";
            var rawName = me.getName(contact,true);
            var name = Core.String.byteLength(rawName) <= 24 ? rawName : Core.String.leftB(rawName,20) + "...";
            dom.innerHTML = (new Utils.Template(Sina.msn.Templates.chatWindow)).evaluate({
            		status:me.classObj[contact.get_presence().get_status()],
                face:contact.get_presence().get_displayPictureUrl(),
                name:me.encodeHTML(name)
            });
            var ui = this.ui;
            ui.insertBefore(dom,ui.children[0]);
        }
		$E('msn_chat_name').title = [me.getName(contact,true), me.getEmail(contact)].join(" || ");
        $E('msn_face_icon').onerror = function(){
        		this.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/msnpic.gif";
        		this.onerror = null;//避免ie下可能死循环 
        };
        $E('msn_close_chat').onclick = function(){
            me._closeChatWindow(contact.get_cid());
            me._position2();
            return false;
        };
        $E('hide_msn_chatwindow').onclick = function(){
            $E('msn_chat_window').style.display = 'none';
            me._position2();
            return false;
        };
        this.toggleDisplay(dom);
        dom.setAttribute('cid',contact.get_cid());

        if($E('msn_msg_notice').style.display === "none"){
            this.updateBottomBar(1,contact,conversation);
        }

        this.loadChatHistory(conversation);
        
        var content = $E('chat_content');
        content.value = "";
        content.focus();
        
        me.showInvite(contact,content);

        function sendMessage(){
            var msg = Core.String.trim(content.value);
            if(msg){
                if(!me.sendMessage(conversation,msg)){
                    App.cartoon.noticeInput(content);
                }else{
                    setTimeout(function(){
                        content.value = "";
                        me.showChatItem(me.user,msg,me);
                    },300);
                }
            }else{
                App.cartoon.noticeInput(content);
            }
            return false;
        }
        function enterSubmit(e){
            if (e.keyCode === 13 || e.which === 13 || e.charCode ===13) {
                if(!e.ctrlKey){//enter提交
                    sendMessage();
                    Core.Events.stopEvent(e);//不换行就提交
                }else{//ctrl+enter换行
                    if(document.selection && document.selection.createRange){
                        content.focus();
                        var range = document.selection.createRange();
                        range.text = "\r\n";
                        range.collapse(false);
                        range.select();
                    }else{
                        content.value = content.value + "\r\n";
                    }
                }
            }
        }
        Core.Events.addEvent(content, enterSubmit, 'keydown');//拼音输入法enter不提交（keyup会提交）
        $E('send_msg').onclick = sendMessage;
    },
    showInvite:function(contact,content){
    		var me = this, inviteLink = $E('msn_invite_user'), cid = contact.get_cid(), allSex = '他|她'.split("|");
        me._registed = me._registed || {};
        if(me._registed[cid]){//先从缓存中查找已经注册的用户
        		inviteLink.innerHTML = $CLTMSG["MSN023"].replace('sex',me._registed[cid].sex);
        		inviteLink.href = "http://t.sina.com.cn/uid/profile/".replace('uid',me._registed[cid].uid);
        		inviteLink.onclick = function(){};
        }else{
        		me.isRegisted(contact.get_cid(),me.getEmail(contact),function(uid,sex){
	        		sex = sex === "1" ? allSex[0] : allSex[1];
	        		inviteLink.innerHTML = $CLTMSG["MSN023"].replace('sex',sex);
	        		inviteLink.href = "http://t.sina.com.cn/uid/profile/".replace('uid',uid);
	        		inviteLink.onclick = function(){};
	        		
	        		me._registed[cid] = {
	        			uid:uid,
	        			sex:sex
	        		};
	        },function(){
	        		inviteLink.innerHTML = $CLTMSG["MSN024"];
	        		inviteLink.href = "javascript:void(0)";
	        		inviteLink.onclick = function(){
	        			content.value = $CLTMSG["MSN025"].replace('uid',$CONFIG.$uid);
	        			return false;
	        		};
	        });
        }
    },
    _closeChatWindow:function(cid){
        var bar = $E('msn_bar'),span = $E('msn_msg_span'),notice = $E('msn_msg_notice'),chatWindow = $E('msn_chat_window');
        chatWindow.style.display = 'none';
        var list = $E('msg_notice_list');
		if($E('msg_notice_'+ cid)){
			list.removeChild($E('msg_notice_'+ cid));
		}
        if(list.children.length === 0){
            span.style.display = 'none';
            notice.style.display = 'none';
            bar.className = "msnBar msnBarS";
        }else{
            bar.className = "msnBar";
        }
    },
    //type=0(主动发起的会话消息状态),type=1（新到消息闪烁提醒状态)
    updateBottomBar:function(type,contact,conversation){
        var bar = $E('msn_bar'),span = $E('msn_msg_span'),notice = $E('msn_msg_notice'),chatWindow = $E('msn_chat_window'),
        noticeImg = $E('msn_notice_img'),closeChat = $E('msn_close_chat');
        bar.className = "msnBar";
        span.style.display = '';
        notice.style.display = '';
        noticeImg.src = "http://img.t.sinajs.cn/t3/style/images/common/transparent.gif";
        noticeImg.className = 'micon minspeak';
        noticeImg.style.cssText = "width:14px;height:12px;";
        var me = this;
        notice.onclick = function(){
            me.toggleNoticeList();
            return false;
        };
        
        if(type === 2){
            var me = this;
            me.showNoticeItem(contact,conversation,true);
            if(type === 2){
                noticeImg.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/speak.gif";
                noticeImg.className = "shine";
                noticeImg.style.width = "26px";
                noticeImg.style.height = "30px";
                setTimeout(function(){
                		if(noticeImg.className === "shine"){
						noticeImg.className = "noshine";
	                    noticeImg.style.width = "26px";
	                		noticeImg.style.height = "30px";
	                    noticeImg.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/speak_no.gif";                			
                		}
                },3000);
            }else{
                noticeImg.className = "noshine";
                noticeImg.style.width = "26px";
                noticeImg.style.height = "30px";
                noticeImg.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/speak_no.gif";
            }
        }
    },
    hasUnreadMessages:function(){
        var convs = this.conversations;
        for (var i = 0,len = convs.get_count(); i < len; i++){
            var c = convs.get_item(i);
            if (!c.get_closed() && c.get_hasUnreadMessages()){
                return true;
            }
        }
        return false;
    },
    showNoticeItem:function(contact,conversation,bNew){
        var cid = contact.get_cid(), id = "msg_notice_" + cid ;
        if(!$E(id)){
            var item = $C("LI");
            item.id = id;
            var rawName = this.getName(contact,true);
            var name  = Core.String.byteLength(rawName) <= 10 ? rawName : Core.String.leftB(rawName,7) + "...";
            item.innerHTML = (new Utils.Template(Sina.msn.Templates.noticeItem)).evaluate({
                name:this.encodeHTML(name),
                status:this.classObj[contact.get_presence().get_status()],
                color:bNew? "orange":"black"
            });
        		var email = this.getEmail(contact); 
            item.title = [rawName,email].join(" || ");
            var me =  this;
            item.onclick = function(){
            		me.createConversation(contact);
            		return false;
            };
            if($E('msg_notice_list')){
                $E('msg_notice_list').appendChild(item);
            }
        }else{//update
        		$E(id).children[0].style.color = bNew? "orange":"black";
        }
    },
    createNoticeList:function(){
        var list = $C('div');
        list.innerHTML = Sina.msn.Templates.msgNoticeList;
        document.body.appendChild(list);
        $E('msn_notice_list').style.display = 'none';
        var me = this;
        $E('close_msn_notices').onclick = function(){
            $E('msn_notice_list').style.display = 'none';
            me._position2();
            return false;
        };
    },
    toggleNoticeList:function(){
        if(!this._hasNoticeList){
            var ui = this.ui;
            ui.insertBefore($E("msn_notice_list"),ui.children[0]);
            this._hasNoticeList = true;
        }
        this.toggleDisplay($E("msn_notice_list"));
    },
    showChatItem:function(contact,msg,context){
        var dom1 = $C('LI');
        var name = this.getName(contact);
        dom1.innerHTML = name + $CLTMSG['MSN002'];
        var list = $E('chat_list');
        list.appendChild(dom1);
        this._each(this.encodeHTML(Core.String.trim(msg)).split(/(\r\n|\n|\r)/mg),function(item){
        		if(Core.String.trim(item)){
        			var dom2 = $C('LI');
        			dom2.innerHTML = '<span class="dot"></span>' + item;
        			list.appendChild(dom2);
        		}
        });
        var pNode = list.parentNode;
        pNode.scrollTop = pNode.scrollHeight;
        
        if(!context.hasUnreadMessages()){
        		var noticeImg = $E('msn_notice_img');
        		noticeImg.src = "http://img.t.sinajs.cn/t3/style/images/common/transparent.gif";
	        noticeImg.className = 'micon minspeak';
	        noticeImg.style.cssText = "width:14px;height:12px;";
        }
    },
    loadChatHistory:function(conversation){
        var history = conversation.get_history();
        var histEnum = history.getEnumerator();
        while (histEnum.moveNext()){
            var current = histEnum.get_current();
            var contact = current.get_sender().get_contact();
            if(current && current.get_text){
            		this.showChatItem(contact,current.get_text(),this);
            }
        }
    },
    setActiveClass:function(dom){
    		if(dom){
			if(this._activeDom && this._activeDom != dom){
				this._activeDom.className = Core.String.trim(this._activeDom.className.replace('active',' '));
			}
			this._activeDom = dom;
			dom.className = dom.className.indexOf('active')  === -1 ?  dom.className + " active" : Core.String.trim(dom.className.replace('active',' '))  ;
		}
    },
    //显示设置层
    showSetting : function(dom){
		this.setActiveClass(dom);
        var div;
        if(!(div = $E("setting_container"))){
            var _this = this;
            var _profile = _this.getProfile();

            //创建一个div，用于放置设置工具条的容器。
            div = document.createElement("div");
            div.id = 'setting_container';
            div.className = "msnBox headpBox";
            var name = _profile.displayName;
            div.innerHTML = (new Utils.Template(Sina.msn.Templates.setting)).evaluate({
                status: _this.classObj[_profile.status],
                face : _profile.face,
                titleName : name,
                displayName : Core.String.byteLength(name) <= 10 ? name : Core.String.leftB(name,7) + "..."
            });
            var ui = this.ui;
            ui.insertBefore(div,ui.children[0]);
            div.style.display = '';
            
			$E('msn_face_img').onerror = function(){
        			this.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/msnpic.gif";
	        		this.onerror = null;//避免ie下可能死循环 
	        };
        
            var _setting_list = $E("setting_list");
            var btns = _setting_list.getElementsByTagName("a");
            //遍历a节点。并绑定它们的onclick事件。
            var headStatus = $E("head_status");
            var _profileC = $E("msn_profile").children[0];
            for(var i = 0;i<btns.length;i++){
                (function(index){
                var btn = btns[index];
                if(_profile.status == parseInt(btn.getAttribute("status"))){
                    btn.parentNode.className = "current";
                }
                btn.onclick =  function(){
                    var _status = this.getAttribute("status");
                    //如果存在status属性，则说明是需要设置状态的，调用状态设置函数。
                    if(_status){
                        //设置当前用户在线状态，msn bar 需要同步一下此状态。
                        _this.setStatus(parseInt(_status));
                        _this.setStatusClass(_status);//先假写状态，事件回调中再真写一次(让用户爽一会)。
                        return false;
                    }else{
                        //如果是最后一个a节点，则是要关闭聊天工具条。
                        if(index === btns.length - 1){
                            var dialog = App.confirm($CLTMSG['MSN016'] ,{
                                ok:function(){
                                   _this.destoryMsnBar(function(){
                                        Microsoft.Live.App.signOut();
                                        Microsoft.Live.App.get_auth().resetState();//清空cookie
                                        setTimeout(function(){
                                            document.body.removeChild(_this.ui);
                                        },200);
                                    }); 
                                },
                                cancel_focus:true
                            });
                            
                            return false;
                        }
                    }
                };
                })(i);
            }
            var me = this;
            $E("minimize").onclick = function(){
                div.style.display = "none";
                me._position2();
                return false;
            }
        }
        this.toggleDisplay(div);
    },
    showLoading:function(){
        this.ui.innerHTML = Sina.msn.Templates.loading;
    },
    
    //see http://msdn.microsoft.com/en-us/library/microsoft.live.messenger.presencestatus.aspx
    classObj : {0:'w',1 : "g", 2 : "w", 3 : "r", 4:'',5:'y', 6:"y",7:'r',8:'y'},
    setStatusClass : function(st){
        var _st = typeof st === "undefined" ? this.getProfile().status : st;
        var _c = this.classObj[_st];
        var _status = $E("msn_profile").children[0];
        _status.className = "micon minhead"+(_st == 1 ? "" : "_"+_c);
        var _headStatus = $E("head_status");
        if(_headStatus) _headStatus.className = "headpic hp_"+_c;
        var settingList;
        if(settingList = $E("setting_list")){
            var _prev =Core.Dom.getElementsByClass(settingList, "li", "current")[0];
            if(_prev) _prev.className = "";
        }

        if($E("setting_list")){
            var _curr = Core.Dom.getElementsByAttr($E("setting_list"), "status", _st)[0];
            if(_curr)_curr.parentNode.className = "current";
        }
    },
    showMsnBar:function(contactsCollection){
        this.ui.innerHTML = Sina.msn.Templates.bottomBar;
        this.setStatusClass();
    },
    onlineBuddies:{},
    //在所有分组UI中展现该contact UI
    showContact:function(contact,bSearch){
        var me = this, groups = contact.get_groups();
        if(contact.get_isOnline()){
        		if(contact.get_groups().length === 0 ){
    				var pNode = $E('msn_ungrouped_contact_list');
				var list = Core.Dom.getElementsByAttr(pNode, 'cid', contact.get_cid());
				if(list.length === 0){
					if(pNode.parentNode.children[0].style.display === "none"){
		    	    			pNode.style.display = "none";
		    	    		}
					pNode.appendChild(me._buildContactDom(contact));
					if(bSearch !==true && !me.onlineBuddies[contact.get_cid()]){
						me.onlineBuddies[contact.get_cid()] = true;
						me.count++;
						me.updateOnlineCount();
					}
				}
    			}else{
    				me._eachGroup(groups,function(group){
    					var list;
			    	    if(list = $E(group.get_name() + "_contact_list")){
			    	    		if(list.parentNode.children[0].style.display === "none"){
			    	    			list.style.display = "none";
			    	    		}
			    	        list.appendChild(me._buildContactDom(contact));
			    	        if(bSearch !==true && !me.onlineBuddies[contact.get_cid()]){
							me.onlineBuddies[contact.get_cid()] = true;
							me.count++;
							me.updateOnlineCount();
						}
			    	    }
			    	});
    			}
        }
    },
    _buildContactDom:function(contact){
        var me = this;
        var dom = $C('LI');
        dom.onclick = function(){
            var conv = me.createConversation(contact);
            if(conv){
            		me.showNoticeItem(contact,conv,false);
            }
            return false;
        }
        dom.setAttribute('cid',contact.get_cid());
        var rawName = me.getName(contact,true);
        var name  = Core.String.byteLength(rawName) <= 9 ? rawName : Core.String.leftB(rawName,6) + "...";//先截取后转码
        var email = this.getEmail(contact); 
        dom.innerHTML = (new Utils.Template(Sina.msn.Templates.contact)).evaluate({
            status:me.classObj[contact.get_presence().get_status()],
            contact_name:this.encodeHTML(name),
            title:''
        });
		dom.children[0].title = [me.getName(contact,true),email].join(" || ");
        return dom;
    },
    //在所有分组UI中隐藏（删除）该contact UI
    hideContact:function(contact,bSearch){
        var me = this, each = this._each;
        me._eachGroup(contact.get_groups(),function(group){
            var pNode = $E(group.get_name() + "_contact_list");
            if(pNode){
                var list = Core.Dom.getElementsByAttr(pNode, 'cid', contact.get_cid());
                each(list,function(item){
                    pNode.removeChild(item);
                    if(bSearch !==true && me.onlineBuddies[contact.get_cid()]){
						me.onlineBuddies[contact.get_cid()] = null;
						me.count--;
						me.updateOnlineCount();
					}
                }); 
            }
		});
		
		var pNode = $E('msn_ungrouped_contact_list');
        if(pNode){
            var list = Core.Dom.getElementsByAttr(pNode, 'cid', contact.get_cid());
            each(list,function(item){
                pNode.removeChild(item);
                if(bSearch !==true && me.onlineBuddies[contact.get_cid()]){
					me.onlineBuddies[contact.get_cid()] = null;
					me.count--;
					me.updateOnlineCount();
				}
            }); 
        }
    },
    //在所有分组UI中更新该contact对应的UI
    updateContact:function(contact){
        this.hideContact(contact);
        this.showContact(contact);
    },
    //用新的contactList更新当前展现的contactList.搜索可以使用本方法.
    updateContactList:function(contactList){
    		var me = this;
        var collection = me.contactsCollection, len = collection.get_count();
        for(var j = 0;j<len;j++){
            me.hideContact(collection.get_item(j),true);
        }
        me._each(contactList,function(contact){
        		me.showContact(contact,true);
        });
    },
    _position2:function(dom){
        if($IE6){
            this.ui.style.top = Core.System.getScrollPos(document)[0] +  document.documentElement.clientHeight - 30 + "px";
        }
    },
    _position:function(dom){
        if($IE6){
        		var me = this;
        		me._scroll_ = -(me._scroll_) || 1;
            window.scrollBy(me._scroll_,me._scroll_);//hack !//每次反向scroll，避免页面scroll高度、宽度不断变化。
        }
    },
    setFixedPosition:function(dom){
        if($IE6){
            dom.style.cssText = "position:absolute;left:2px;z-index:1000;";
            dom.style.top = Core.System.getScrollPos(document)[0] +  document.documentElement.clientHeight - 30 + "px";
            var addEvent = Core.Events.addEvent;
            var timer = 0;
            addEvent(window,function(){
                clearTimeout(timer);
                timer = setTimeout(function(){
                    dom.style.top = Core.System.getScrollPos(document)[0] +  document.documentElement.clientHeight - dom.offsetHeight - 30 + "px";
                }, 200);
            },"scroll");
            
            addEvent(window, function(){
                dom.style.top = Core.System.getScrollPos(document)[0] +  document.documentElement.clientHeight - dom.offsetHeight - 30 + "px";
            }, "resize");
        }else{
            dom.style.cssText = "position:fixed;bottom:31px;left:2px;z-index:101;";
        }
    },
    //渲染所有分组容器UI
    showGroupList:function(dom,bShow){
    		var me = this;
		if(dom){
			me.setActiveClass(dom);
		}
		var oPopup;
        if(oPopup = $E('grouped_contact_list')){
            if(!me._hasGroupList){
                var ui = me.ui;
                ui.insertBefore(oPopup,ui.children[0]);
                me._hasGroupList = true;
            }
            me.toggleDisplay(oPopup);
            if(bShow){
            		oPopup.style.display = '';
            }
        }else{
        		me.createGroupList();
        }
    },
    createGroupList:function(){
    		var me = this;
		var oPopup;
        oPopup = $C("div");
        oPopup.id = 'grouped_contact_list';
        oPopup.innerHTML = Sina.msn.Templates.groupList;
        document.body.appendChild(oPopup);
	    oPopup.style.display = "none";
	    
	    var list = me._groupSort(me.user.get_groups());
		me._each(list,function(group){
            me.showGroup(group);
		});
		me.createUnGrouped();
        me.bindSuggest();
        
        $E('close_msn_contactlist').onclick = function(){
            $E('grouped_contact_list').style.display = 'none';
            me._position2();
            return false;
        };
    },
    //创建'其他联系人'分组
    createUnGrouped:function(){
        var gDom = $C("div");
        gDom.className = "sbCon";
        var name = $CLTMSG['MSN003'];
        gDom.innerHTML = (new Utils.Template(Sina.msn.Templates.group)).evaluate({
            group_name:name,
            group_id:'msn_ungrouped',
            title:name
        });
        $E('msn_group_list').appendChild(gDom);
    },
    showGroup:function(group){
        var gDom = $C("div");
        gDom.className = "sbCon";
        var name = group.get_name(), name1, name2 = this.encodeHTML(name);
        if(name=== '常用联系人' || name === 'Favorites'){
        		name1 = '<img width="16" height="15" class="msnstar" src="http://img.t.sinajs.cn/t3/style/images/common/transparent.gif">' + name ;
        }else{
        		name1 = Core.String.byteLength(name2) <= 9 ? name2 : Core.String.leftB(name2,6) + "...";
        }
        gDom.name = name;
        gDom.innerHTML = (new Utils.Template(Sina.msn.Templates.group)).evaluate({
            group_name:name1,
            group_id:name2,
            title:name
        });
        $E('msn_group_list').appendChild(gDom);
    },
    hideGroup:function(name){
        var list = document.getElementsByName(name);
        this._each(list,function(group){
            group.parentNode.removeChild(group);
        });
    },
    //'group'为组展开状态,'group groupUP'为闭合状态
    toggleGroup:function(dom){
        var sibling = dom.parentNode.children[1];
        if(dom.className === 'group'){
            dom.className = 'group groupUP';
            sibling.style.display = "none";
        }else{
            dom.className = 'group';
            sibling.style.display = "";
        }
    },
    //-------------------------------------------------events----------------------------------------------------
    bindSuggest:function(){
        var _this = this, _timer, prev, _result, onlineUsersStr, input = $E("msn_suggest"), speed = 100, contactsCollection = _this.contactsCollection
                , _defaultValue = input.value, groupList = $E("msn_group_list"), clearBtn = $E("clear_result");
        function search(contact,key){
            var _contactName = _this.getName(contact).toLowerCase();
            var email = _this.getEmail(contact).toLowerCase();
            key = key.toLowerCase();
            if(_contactName.indexOf(key)>-1 || email.indexOf(key)>-1){
                return contact;
            }
            return null;
        }
        function suggest(key){
            var contactsCollection = _this.contactsCollection; 
            var len = contactsCollection.get_count();
            var ret = [];
            for(var i = 0;i<len;i++){
                var contact = contactsCollection.get_item(i);
                if(search(contact,key)){
                		ret.push(contact);
                }
            }
            for(var cid in _this.ungrouped){
            		if(!(cid in {}) && _this.ungrouped[cid]){
            			if(search(_this.ungrouped[cid],key)){
	                		ret.push(_this.ungrouped[cid]);
	                }
            		}
            }
            return ret;
        }

         var suggestFunc = function() {
             var _thisV = input.value;
             prev = Core.String.trim(_thisV);
             var data = suggest(prev);
             if(prev === ""){
                 input.parentNode.className = "input inputf";
                 clearBtn.style.display = "none";
             }else{
                 input.parentNode.className = "input inputf";
                 clearBtn.style.display = "";
             }
             
             _this.updateContactList(data);
            
             if(data.length === 0){
             	 if(!$E('msn_search_none')){
                 	var dom = $C('DIV');
					dom.id = 'msn_search_none'
					dom.className = 'sbCon sbcNone';
					dom.innerHTML = '<ul>\
					    <li class="none">msg</li>\
					  </ul>'.replace('msg',$CLTMSG['MSN015'])   ; 
                		$E('msn_group_list').appendChild(dom);
                 }else{
                 	$E('msn_search_none').style.display = '';
                 }
             }else{
             	 if($E('msn_search_none')){
                 	$E('msn_search_none').style.display = 'none';
                 }
             }
             var groups = Core.Dom.getElementsByClass(groupList, "a", "group");
             _this._each(groups, function(group) {
                 var ul = group.parentNode.children[1]; 
                 var schR = ul.children.length != 0;
                 //如果当前分组内搜索结果为空（ul节点没有子节点），或者清空结果时，将当前分组显示，其他情况隐藏。
                 group.style.display = schR || (prev == "")? "" : "none";
                 if(schR && ul.style.display === "none"){
                     Core.Events.fireEvent(group, "click");
                 }
             });
         };
         input.onkeyup = function(event) {
             if (_timer) {
                 clearTimeout(_timer);
             }
             _timer = setTimeout(suggestFunc, speed);
         };
         clearBtn.onclick = function(){
             input.value = "";
             suggestFunc();
             input.focus();
             return false;
         };
         input.onfocus = function() {
             var _thisV = Core.String.trim(this.value);
             if (_thisV === _defaultValue) {
			 	this.value = "";
				input.parentNode.className = 'input inputf';
				clearBtn.style.display = "none";
			 }
         };
         input.onblur = function() {
             var _thisV = Core.String.trim(this.value);
             if (_thisV === ""){
			 	this.value = _defaultValue;
				input.parentNode.className = 'input';
			 	clearBtn.style.display = "none";
			 } 
         };
    },
    onAppLoaded:function(appLoadedEventArgs){
    		var msn = Sina.msn.MSN;
        var messengerContext = msn.messengerContext = Microsoft.Live.App.get_messengerContext();
        messengerContext.onSignedIn(Core.Function.bind2(msn.onSignedIn,msn));
        messengerContext.onContactPresenceChanged(Core.Function.bind2(msn.onContactPresenceChanged,msn));
        
        var auth = Microsoft.Live.App.get_auth();
        /* 设置正确的wl_accessTokenExpires cookie是保证auth.get_accessTokenExpired()返回正确结果的关键。
         * connect登录和refreshtoken时，必须按照http://207.46.16.248/en-us/library/ff752581.aspx的要求设置所有相关cookie
         */
        if(auth.get_accessTokenExpired() && auth.get_state() !== Microsoft.Live.AuthState.authenticated){//4
            msn.refreshToken();
        }
        
        //60s(现代浏览器10s)后还没有登录成功就刷新token重新登录.时间如果太短，会导致重新登录，从而使本地聊天记录丢失。
        var interval = $IE6 ? 60000 : 10000;
		setTimeout(function(){
			if(!msn.signed){
				msn.refreshToken();
			}
		},interval);
    },
    signed:false,
    onSignedIn:function(evtArgs){
        if (evtArgs === Microsoft.Live.AsyncResultCode.success) {
            this.dataContext = Microsoft.Live.App.get_dataContext();
            var user = this.user = this.messengerContext.get_user();
            user.get_settings().set_displayNameMode(Microsoft.Live.Messenger.DisplayNameMode.fullName);//or displayName
            var msn = this;
            this.conversations = user.get_conversations();
            this.conversations.add_collectionChanged(Core.Function.bind2(msn.onConversationsChanged,msn));
            user.get_groups().add_collectionChanged(Core.Function.bind2(msn.OnGroupsChange,msn));
            this.createGroupList();
            this.createNoticeList();
            var contactsCollection = this.contactsCollection = this.messengerContext.getOnlineContacts();
            contactsCollection.add_collectionChanged(Core.Function.bind2(msn.OnlineStatusChange,msn));
            var len = this.contactsCollection.get_count();
            this.showMsnBar(contactsCollection);
            this.afterLogIn();
            this.signed = true;
        }
    },
    ungrouped:{},
    onContactPresenceChanged:function(cid, name, value){
        var me = this;
        setTimeout(function(){//这个延时非常必要，不然contact可能查找不到;延时太短会很卡。
            //var contact = me.contactsCollection.findByCid(cid) || me.offlineContacts[cid];//离线用户缓存中查找聊天过程中离线的用户
            	var contact = me.user ? me.user.get_contacts().findByCid(cid) : me.contactsCollection.findByCid(cid) ;//先在所有用户中查找
            	if(contact.get_groups().length === 0 ){
            		if(contact.get_isOnline()){
            			me.ungrouped[cid] = contact;
            			me.showContact(contact);
            		}else{
            			me.ungrouped[cid] = null;
            			me.hideContact(contact);
            		}
			}
            
            if(contact && (name === 'displayName' || name ==='Status' )){ // || name ==='DisplayPictureUrl'
            		if(cid=== me.user.get_contact().get_cid() && name === 'Status'){
            			 me.setStatusClass(value);
            		}
                me.updateContact(contact);
                var rawName = me.getName(contact,true);
                var n  = Core.String.byteLength(rawName) <= 10 ?rawName : Core.String.leftB(rawName,7) + "..."
                if($E('msg_notice_' + contact.get_cid())){
		            $E('msg_notice_' + contact.get_cid()).innerHTML = (new Utils.Template(Sina.msn.Templates.noticeItem)).evaluate({
		                name:me.encodeHTML(n),
		                status:me.classObj[contact.get_presence().get_status()],
		                color:$E('msg_notice_' + contact.get_cid()).children[0].style.color||"black"
		            });
                }
                if($E('msn_chat_head')){
                		if($E('msn_chat_window').getAttribute('cid') === contact.get_cid()){
                			var n2 = Core.String.byteLength(rawName) <= 24 ? rawName : Core.String.leftB(rawName,21) + "...";
                			$E('msn_chat_head').innerHTML = (new Utils.Template(Sina.msn.Templates.chatHead)).evaluate({
			            		status:me.classObj[contact.get_presence().get_status()],
			                face:contact.get_presence().get_displayPictureUrl(),
			                name: me.encodeHTML(n2)
			            });
			            $E('msn_face_icon').onerror = function(){
				        		this.src = "http://img.t.sinajs.cn/t3/style/images/msnbar/msnpic.gif";
				        		this.onerror = null;//避免ie下可能死循环 
				        };
                		}
                }
            }
        },200);
    },
    //统一处理消息到达事件
    onMessageReceived:function(conv, e){
        if(e.get_message().get_type() === Microsoft.Live.Messenger.MessageType.textMessage){
            var message = e.get_message(), sender = message.get_sender(), contact = sender.get_contact();
            if(sender.get_cid() === this.user.get_contact().get_cid()){
                return;//忽略自己发出的消息--本地存储导致的
            }
            
			/**
			 * console.log(conv,conv.get_hasUnreadMessages(),conv.get_reloaded(),message,message.get_reloaded());
			 * conv.get_reloaded()为true则表明是历史会话，false则为新会话。
			 * message.get_reloaded()为false表明是本页新消息，true则为刷新前页面的历史消息。
			 * 有新消息时microsoft msn js api会自动设置conv.set_hasUnreadMessages(true)
			 * */
            if(conv.get_hasUnreadMessages() || !message.get_reloaded()){
            		var bNotice = false;
            		if($E('msn_chat_window') && $E('msn_chat_window').style.display !== "none"){
	                var cid = $E('msn_chat_window').getAttribute('cid');
	                if(cid === sender.get_cid()){
	                		bNotice = true;
	                    this.showChatItem(sender.get_contact(),message.get_text(),this);
	                    conv.set_hasUnreadMessages(false);
	                    this.showNoticeItem(contact,conv,false);
	                }
	            }
	            if($E('msn_bar') && !bNotice){
	                this.updateBottomBar(2,contact,conv);
	            }
            }
        }
    },
    onSendMsgFailed:function(sender, e){
        var message = e.get_message(); 
        var name = message.get_sender().get_presence().get_displayName();
        var result = e.get_resultCode(); 
        var userState = e.get_userState(); 
        if (result === Microsoft.Live.Messenger.SendMessageResultCode.failure) {
            alert('SendMsgFailed: ' + message.get_text() + "-resultCode: "+result+"-userState:"+userState);
        }
    },
    //监听聊天会话(所有会话均在此统一add_messageReceived，别处不可重复监听信息到达事件)
    onConversationsChanged:function(sender,e){
        var me = this,each = me._each;
        if (e.get_action() != Microsoft.Live.Messenger.NotifyCollectionChangedAction.reset) {
            var newItems = e.get_newItems(),oldItems = e.get_oldItems();
             each(newItems,function(item){
                item.add_messageReceived(Core.Function.bind2(Sina.msn.MSN.onMessageReceived,Sina.msn.MSN));
                item.add_sendMessageFailed(Core.Function.bind2(Sina.msn.MSN.onSendMsgFailed,Sina.msn.MSN));
            });
            each(oldItems,function(item){
                item.remove_messageReceived(Core.Function.bind2(Sina.msn.MSN.onMessageReceived,Sina.msn.MSN));
                item.remove_sendMessageFailed(Core.Function.bind2(Sina.msn.MSN.onSendMsgFailed,Sina.msn.MSN));
            });
        }
    },
    count:0,
    updateOnlineCount:function(){
    		var me = this; count = $E('msn_count');
        if(count){
        		me.count = me.count < 0 ? 0 :  me.count;
            count.innerHTML = me.count > 99 ? 99 + "+"+$CLTMSG['MSN004']:me.count + $CLTMSG['MSN004'];
        }
    		if(me.count <= 0){
    			setTimeout(function(){
    				if(me.count < 0){
    					Microsoft.Live.App.signIn();
    				}
    			},1000);
    		}
    },
    //用户上线，或者下线
    OnlineStatusChange: function(sender, e) {
        if (e.get_action() != Microsoft.Live.Messenger.NotifyCollectionChangedAction.reset) {
            var me = this, each = me._each, input;
            var newItems = e.get_newItems(),oldItems = e.get_oldItems();
            each(newItems,function(item){
            		me.showContact(item);
            });
            each(oldItems,function(item){
                me.hideContact(item);
            });
        }
    },
    //分组增加或者删除
    OnGroupsChange: function(sender, e) {
        if (e.get_action() != Microsoft.Live.Messenger.NotifyCollectionChangedAction.reset) {
            var me = this, each = me._each;
            var newItems = e.get_newItems(),oldItems = e.get_oldItems();
            each(newItems,function(item){
                me.showGroup(item);
            });
            each(oldItems,function(item){
                me.hideGroup(item);
            });
        }
    }
};

//----------------------------------------------------------------------
App._lock_ = false;
//勋章层中开启msn聊天时操作
App.startMsnChat = function(){
	/*
	 * 1、接口地址：
	http://t.sina.com.cn/msn/aj_checkmsn.php
	 
	2、参数：
	  GET参数 oid  ： 为访问用户的Uid
	 
	3、返回值：
	  成功：code : A00006   o_cid : 为访问用户绑定MSN的cid
	  失败：code:
	                   M12006    当前用户未开启
	                   M12007    访问用户未绑定
	                   M12008    访问用户未开启
	                   M12009    当前用户未绑定
	 * */
	 
	var msn = Sina.msn.MSN;
	
	function chatWith(email){
		if(window.Microsoft && msn.signed){
			if($CONFIG.$oid ===$CONFIG.$uid){
   				msn.showGroupList(null,true);
   			}else{
       			email && chat(email);
   			}
		}else{
			if(msn.inited){//避免同一页面重复请求、加载js
				return;
			}
			msn.init(function(){
				setTimeout(function(){
					msn.signed && email && chat(email);
				},2000);
			});
		}
	}
	function autoCloseDialog(dialog){
		setTimeout(function(){
			if(!dialog._distory){
				dialog.close();
			}
		},3000);
	}
	function chat(email){
		var contact = msn.contactsCollection.find(email, Microsoft.Live.Messenger.IMAddressType.windowsLive);
		if(contact){
			var conv = msn.createConversation(contact);
			if(conv){
				msn.showNoticeItem(contact,conv,false);
			}
		}else{
			var str = $CLTMSG['MSN017'] .replace('name',scope.realname).replace('sex',scope.sex);
			var dialog = App.alert( str ,{});
			autoCloseDialog(dialog);
		}
	}
	if(!App._lock_){
		App._lock_ = true;
		Utils.Io.Ajax.request("http://t.sina.com.cn/msn/aj_checkmsn.php",{
	        "onComplete"  : function (oResult){
	        		App._lock_ = false;
	            if(oResult && oResult.code){
	               if(oResult.code === "A00006"){
	               		chatWith(oResult.o_msn);//o_msn是msn邮件地址
	               }
	               if(oResult.code === "M12006"){
	               		var dialog = App.confirm($CLTMSG['MSN018'] ,{
	               			ok_label : $CLTMSG['MSN019'],
	                        ok:function(){
	                           	msn.switchMSNBar('1',function(){
	                           		chatWith(oResult.o_msn);
	                           	});
	                        },
	                        ok_focus:true
	                    });
	               }
	               if(oResult.code === "M12007"){
	               		var str = $CLTMSG['MSN020'].replace('name',scope.realname).replace('sex',scope.sex);
	               		var dialog = App.alert(str ,{});
	               		autoCloseDialog(dialog);
	               }
	               if(oResult.code === "M12008"){//访问用户未开启
	               		chatWith(oResult.o_msn);
	               }
	               if(oResult.code === "M12009"){
	               		var dialog = App.confirm($CLTMSG['MSN021'] ,{
	               			ok_label :$CLTMSG['MSN022'],
	                        ok:function(){
	                        		App.connectMSN();
	                        		return false;
	                        },
	                        ok_focus:true
	                    });
	               }
	            }
	        },
	        "onException" : function(e){
	        		App._lock_ = false;
	        },
	        "returnType"  : "json",
	        "GET"        : {
	            oid:$CONFIG.$oid
	        }
	    });
	}
    return false;
};
//--------------------------------------------------------------------