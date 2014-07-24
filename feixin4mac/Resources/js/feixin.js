/*
*@author newdongyuwei@gmail.com | http://weibo.com/dongyuwei | http://session.im
*/
dojo.addOnLoad(function () {
    var console = window.console || {
        log: function () {},
        info: function () {},
        error: function () {}
    };

    function Notifier() {

    }
    
    Notifier.prototype.notify = function (icon, title, body,timeout,callback) {
        var popup = Titanium.Notification.createNotification(Titanium.UI.createWindow());
        popup.setIcon(icon);
        popup.setTitle(title);
        popup.setMessage(body);
        popup.setTimeout(timeout || 7000);
        popup.setCallback(callback || function(){
            console.log('Titanium.Notification.Notification:',body);
        });
        popup.show();
        return true;
    }
    var notifier = new Notifier();
    
    var WebFetion = {
        ccpsession:'',
        ssid : '',
        sid: '',
        uid: '',
        name:'',
        version : 0,
        loadImage:function(){
            var path = Titanium.Filesystem.getUserDirectory().toString() + Titanium.Filesystem.getSeparator() + 'code.jpeg';
            var request = Titanium.Network.createHTTPClient();
            request.setTimeout(10000);
            var me = this;
            request.onerror = function(e) {
                console.log('error when loadImage:',e);
            };
            if (request.open('GET', 'https://webim.feixin.10086.cn/WebIM/GetPicCode.aspx?Type=ccpsession&'+ Math.random())) {
                request.receive(function(data) {
                    var file = Titanium.Filesystem.getFile(path);
                    var stream = Titanium.Filesystem.getFileStream(file);
                    stream.open(Titanium.Filesystem.MODE_WRITE);
                    stream.write(data);
                    stream.close();
                    dojo.byId('login_code').src = 'file:///' + path + "?" + Math.random();//去掉缓存
                    dojo.byId('login').disabled = false;
                    me.ccpsession = request.getResponseHeader('set-cookie').split(';')[0];
                    console.log('ccpsession:',me.ccpsession);
                    request = null;
                });
            }
        },
        login: function (e) {
            dojo.stopEvent(e);
            var status = dojo.byId('login_form').elements['OnlineStatus'].checked ? '0' : '400';
            dojo.byId('set_status').value = status;
            this.post('https://webim.feixin.10086.cn/WebIM/Login.aspx', 
                dojo.mixin(dojo.formToObject('login_form'),
                {
                    'OnlineStatus':status
                    // ,'Ccp':this.dbc_to_sbc(dojo.byId('login_form').elements['Ccp'].value)
                    ,'AccountType' : 1
                }), dojo.hitch(this, function (json,io) {
                window.localStorage.setItem('name', dojo.trim(dojo.byId('login_form').elements['UserName'].value));
                window.localStorage.setItem('pwd', dojo.trim(dojo.byId('login_form').elements['Pwd'].value));
                switch(json.rc){
                    case 200:
                        dojo.fadeOut({
                            node: "login_form",
                            onEnd: function () {
                                dojo.style("login_form", "display", "none");
                                dojo.style("login", "display", "none");
                            }
                        }).play();
                        this.ssid = io.xhr.getResponseHeader('set-cookie').split('webim_sessionid=')[1].split(';')[0]
                        console.log(io.xhr.getResponseHeader('set-cookie'));
                        this.get_personal_info();
                        break;
                    case 311://手机号码/飞信号码错误
                         notifier.notify('','错误提示:','手机号码/飞信号码错误!');
                        break;
                    case 321://密码错误
                        notifier.notify('','错误提示:','密码错误!');
                        break;
                    case 312://验证码错误
                        notifier.notify('','错误提示:','验证码错误!请重新输入');
                        this.loadImage();//登陆失败就重新加载验证码图片
                        break;
                }
            }),{
                'Cookie':this.ccpsession
            });
        },
        
        //当前登陆用户的飞信号
        get_personal_info: function () {
            var me = this;
            me.post('https://webim.feixin.10086.cn/WebIM/GetPersonalInfo.aspx?Version=' + me.version, {ssid:me.ssid}, function (data) {
                console.log(data)
                if (data.rc === 200) {
                    var rv = data.rv;
                    dojo.style("user_info", "display", "block");
                    me.name = dojo.byId('name').innerHTML = rv.nn;
                    dojo.byId('nick_name').innerHTML = rv.i;
                    dojo.byId('sid').innerHTML = rv.sid;
                    me.sid = rv.sid;
                    me.uid = rv.uid;//发短信需要
                    dojo.style("loading", "display", "");
                    me.get_contact_list();
                }
            });
            me.version = me.version + 1;
        },
        get_contact_list: function () {
            var me = this;
            me.post('https://webim.feixin.10086.cn/WebIM/GetContactList.aspx?Version=' + me.version, {ssid:me.ssid}, function (data) {
                console.log(data);
                if (data.rc === 200) {
                    dojo.style("loading", "display", "none");
                    var rv = data.rv;

                    dojo.forEach(rv.bl, function (group) {
                        me.show_group(group);
                    });

                    dojo.forEach(rv.bds, function (buddy) {
                        me.show_contact(buddy);
                    });
                    dojo.style("contact_list", "display", "block");
                    me.keep_alive();
                }
            });
            me.version = me.version + 1;
        },
        status: { //pd
            '0': '隐身',
            '100': '离开',
            '150': '外出就餐',
            '300': '马上回来',
            '365': '离线',
            '400': '在线',
            '500': '接听电话',
            '600': '忙碌',
            '850': '会议中'
        },
        contacts: {},
        icons:{},
        logout:false,
        newMsgCount:{},
        totalMsgCount:0,
        buddyStatus:{},
        keep_alive:function(){
            var me = this;
            me.post('https://webim.feixin.10086.cn/WebIM/GetConnect.aspx?Version=' + me.version, {ssid:me.ssid}, function (data) {
                console.log(data);
                if (data && data.rc === 200) {
                    var rv = data.rv;
                    dojo.forEach(rv, function (item) {
                        if (item.DataType === 2 && item.Data) {
                            if(item.Data.pb == '0'){
                                item.Data.pb = '365';
                            }
                            me.buddyStatus[item.Data.uid] = item.Data.pd || me.status[item.Data.pb]||"";
                            dojo.forEach(document.getElementsByName(item.Data.uid), function (dom) {
                                if (me.status[item.Data.pb]) {
                                    dom.innerHTML = "  " + (item.Data.pd || me.status[item.Data.pb]||"");
                                }
                                //i是签名，nn是名称，mn手机号;nn是用户自己名称，ln是备注名称
                                dom.parentNode.title = [item.Data.i, item.Data.mn, item.Data.uri].join(" ");
                                if(!me.contacts[item.Data.uid]){
                                    me.contacts[item.Data.uid] = item.Data.ln || item.Data.nn  || item.Data.uid;
                                }
                                
                                item.Data.ln && item.Data.ln !=="" && me.update_contact_name(item.Data.uid,item.Data.ln);
                                if (item.Data.crc) {
                                    var img = document.createElement("img");
                                    me.icons[item.Data.uid] = img.src = me.template("http://webim.feixin.10086.cn/WebIM/GetPortrait.aspx?did=#{uid}&Size=3&Crc=#{crc}&mid=#{uid}", {
                                        uid: item.Data.uid,
                                        crc: item.Data.crc
                                    });
                                    img.className = 'buddy-icon';
                                    dom.parentNode.insertBefore(img, dom.parentNode.children[0]);
                                }
                            });
                        }
                        if (item.DataType === 3 && item.Data) {
                            console.log("new msg:",item.Data.msg);
                            var msg = (me.contacts[item.Data.fromUid] || item.Data.fromUid) + " ：" + item.Data.msg + " (" + (new Date()).toLocaleString().replace("格林尼治标准时间+0800","-") + ")";
                            try {
                                notifier.notify('', "飞信新消息:", msg);
                            } catch (e) {
                                alert(msg);
                            }
                            me.save_history(item.Data.fromUid, msg);
                            
                            if(me.current_peer_uid != item.Data.fromUid){
                                dojo.query('img[uid="UID"]'.replace('UID',item.Data.fromUid))[0].style.display = 'inline-block';
                                me.newMsgCount[item.Data.fromUid] = me.newMsgCount[item.Data.fromUid] + 1;
                                me.set_badge(++me.totalMsgCount);
                            }else{
                                me.show_chat_dialog(item.Data.fromUid, me.contacts[item.Data.fromUid] || item.Data.fromUid);
                            }
                        }
                        if (item.DataType === 4 && item.Data) {
                            if(item.Data.ec === 900){
                                me.logout = true;
                                notifier.notify('','错误提示:','该用户在其它客户端登录');
                                setTimeout(function(){
                                    Titanium.App.restart();
                                },2000);
                            }else{
                                notifier.notify('','错误提示:',item.Data.emsg);
                            }
                        }
                    });
                }
                setTimeout(function(){
                    if(!me.logout){
                        me.keep_alive();
                    }
                },100);
            });
            me.version = me.version + 1;
        },
        set_presence: function (presence) {
            this.post('https://webim.feixin.10086.cn/WebIM/SetPresence.aspx?Version=' + this.version, {
                'Presence': presence,//400
                'Custom': this.status[presence],
                'ssid':this.ssid
            }, function (data) {
                console.log(data);
                if (data.rc === 200) {
                    notifier.notify('', "提示:", '设置状态成功！');
                    //todo
                }else{
                    notifier.notify('', "提示:", '设置状态失败,请重试。');
                }
            });
            this.version = this.version + 1;
        },
        send_msg: function (to, msg, isSendSms) {
            this.post('https://webim.feixin.10086.cn/WebIM/SendMsg.aspx?Version=' + this.version, {
                'To': to,
                'msg': msg,
                'ssid':this.ssid,
                'IsSendSms': isSendSms ? '1' : '0'
            }, function (data) {
                console.log(data);
                if (data.rc === 200) {
                    notifier.notify('', "消息发送结果:", '发送成功！');
                }else{
                    notifier.notify('', "消息发送结果:", '发送失败！请重新发送。');
                }
            });
            this.version = this.version + 1;
        },
        send_sms: function (toUID, sms) {
            this.post('http://webim.feixin.10086.cn/content/WebIM/SendSMS.aspx?Version=' + this.version, {
                'Receivers': toUID,
                'UserName':toUID,
                'Message': sms,
                'ssid':this.ssid
            }, function (data) {
                console.log(data);
                if (data.rc === 200) {
                    notifier.notify('', "短信发送结果:", '发送成功！');
                }else{
                    notifier.notify('', "短信发送结果:", '发送失败！请重新发送。');
                }
            });
            this.version = this.version + 1;
        },
        send_sms_to_self: function (sms) {
            this.post('http://webim.feixin.10086.cn/content/WebIM/SendSMS.aspx?Version=' + this.version, {
                'Receivers': this.uid,
                'UserName':this.uid,
                'Message': sms,
                'ssid':this.ssid
            }, function (data) {
                console.log(data);
                if (data.rc === 200) {
                    notifier.notify('', "短信发送结果:", '发送成功！');
                }else{
                    notifier.notify('', "短信发送结果:", '发送失败！请重新发送。');
                }
            });
            this.version = this.version + 1;
        },
        get: function (url, data, callback, timeout) {
            dojo.xhrGet({
                url: url,
                content: data,
                load: callback,
                error: function () {
                    //console.error(arguments);
                }
            });
        },
        post: function (url, data, callback,headers) {
            headers = headers || {};
            dojo.xhrPost({
                url: url,
                handleAs: 'json',
                load: callback,
                content: data,
                error: function () {
                    console.error(arguments);
                },
                headers: dojo.mixin({ 
                    'Accept':'application/json, text/javascript, */*'
                    ,'Accept-Charset':'UTF-8,*;q=0.5'
                    ,'Accept-Encoding':'gzip,deflate,sdch'
                    ,'Accept-Language':'en-US,en;q=0.8'
                    ,'Connection':'keep-alive'
                    ,'Content-Type':'application/x-www-form-urlencoded'
                    //"Content-Type":"application/x-www-form-urlencoded; charset=utf-8",
                    ,'Referer' : 'https://webim.feixin.10086.cn/'
                    ,'Host':'webim.feixin.10086.cn'
                    ,'Origin':'https://webim.feixin.10086.cn'
                    ,'Referer':'https://webim.feixin.10086.cn/login.aspx'
                    ,'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.47 Safari/536.11'
                },headers)
            });

        },
        
        template: function (tmpl, data) {
            return tmpl.replace(/(#\{(.*?)\})/g, function () {
                return data[arguments[2]] || "";
            });
        },
        show_group: function (group) {
            var dom = document.createElement('li');
            var tmpl = '<div><a class="group-name"  herf="javascript:void(0);" id="group_#{id}">▼#{name}</a></div>\
            <ul id="group_#{id}_contactlist" class="group">\
            </ul>';

            dom.innerHTML = this.template(tmpl, {
                id: group.id,
                name: group.n
            });
            dojo.byId('contact_list').appendChild(dom);
            var el = dojo.byId("group_" + group.id + "_contactlist");
            var link = dom.children[0].children[0];
            dojo.connect(dojo.byId("group_" + group.id), 'click', function () {
                if(el.style.display === "none"){
                    el.style.display = "" ;
                    link.innerHTML = "▼" + group.n;
                }else{
                    el.style.display = "none" ;
                    link.innerHTML = "►" + group.n;
                }
            });
        },
        current_peer_uid:0,
        show_contact: function (contact) {
            var dom = document.createElement('li');
            dom.className = "buddy";
            var tmpl = '<a  herf="javascript:void(0);" uid="#{uid}" uri="#{uri}">#{nick}</a>\
		    <span name="#{uid}" class="status-text"></span><img uid="#{uid}" class="new-msg-icon" src="../images/sun.gif"/>';
		    var uid = contact.uid, nick = contact.ln || contact.nn  || contact.uid;
		    this.contacts[uid] = nick;
            dom.setAttribute('uid',uid);
            this.newMsgCount[uid] = 0;
            dom.innerHTML = this.template(tmpl, {
                nick: nick,
                uid: uid,
                uri: contact.uri
            });
            
            dojo.connect(dom, 'click', this, function () {
                this.current_peer_uid = uid;
                dojo.query("img.new-msg-icon",dom)[0].style.display = "none";
                this.totalMsgCount -= this.newMsgCount[uid];
                this.set_badge(this.totalMsgCount);
                this.newMsgCount[uid] = 0;
                this.show_chat_dialog(contact.uid, nick);
                dojo.byId('peer-status').innerHTML = this.buddyStatus[uid] ;
            });
            
            var list = dojo.byId('group_' + contact.bl + '_contactlist');
            if (list) {
                list.appendChild(dom);
            }
        },
        update_contact_name: function (uid,name) {
            dojo.forEach(dojo.query('a[uid="UID"]'.replace('UID',uid),dojo.byId('contact_list')),function(item){
                item.innerHTML = name;
            });
        },
        set_badge:function(number){
            if(number > 0){
                Titanium.UI.setBadge(number.toString());
            }else{
                Titanium.UI.setBadge(0);
            }
        },
        show_chat_dialog: function (to, name) {
            dojo.byId('left_panel').style.display = "none";
            dojo.byId('chatWindow').style.display = "block";
            dojo.byId('peer').innerHTML = "和 " + (this.contacts[to]||name)   + " 聊天中...";
            this.load_history(to);

            var content = dojo.byId('chat_content');
            setTimeout(function(){
                content.focus();
            },2000);
            
            var me = this;

            function sendMessage() {
                var msg = me.trim(content.value);
                if (msg) {
                    me.send_msg(to, msg, dojo.byId('chat_checkbox').checked);
                    msg = "我: " + msg + " (" +(new Date()).toLocaleString().replace("格林尼治标准时间+0800","-") + ")";
                    me.save_history(to, msg);

                    setTimeout(function () {
                        content.value = "";
                        me.load_history(to);
                    }, 300);
                } else {
                    content.style.backgroundColor = "yellow";
                    setTimeout(function () {
                        content.style.backgroundColor = "";
                    }, 500);
                }
                return false;
            }

            function enterSubmit(e) {
                if (e.ctrlKey && e.keyCode === 13) {// || e.which === 13 || e.charCode === 13
                    sendMessage();
                    dojo.stopEvent(e); //不换行就提交
                }
            }

            dojo.forEach(me.handles, function (h) { //必须先解除这些绑定
                dojo.disconnect(h);
            });
            me.handles.push(dojo.connect(content, 'keydown', enterSubmit)); //拼音输入法enter不提交（keyup会提交）
            me.handles.push(dojo.connect(dojo.byId('send_msg'), "click", function () {
                sendMessage();
            }));
        },
        handles: [],
        trim: function (str) {
            return str.replace(/(\u3000|\s|\t)*$/gi, "").replace(/^(\u3000|\s|\t)*/gi, "");
        },
        //全角字转半角字
        dbc_to_sbc :function(str){
            return str.replace(/[\uff01-\uff5e]/g,function(a){
                return String.fromCharCode(a.charCodeAt(0)-65248);
            }).replace(/\u3000/g," ");
        },
        load_history: function (peer_uid) {
            dojo.byId('chat_history').innerHTML = "";
            var key = "web_fetion_" + peer_uid;
            var history = dojo.byId('chat_history');
            var his = window.localStorage.getItem(key) || "";
            dojo.forEach(his.split("###"), function (item) {
                if (item) {
                    var dom = document.createElement("LI");
                    dom.className = "chat-item";
                    if(/^我:/.test(item)){
                        dom.className = "chat-item chat-item-self";
                    }
                    dom.innerHTML = item;
                    history.appendChild(dom);
                }
            });
            var pNode = history.parentNode;
            pNode.scrollTop = pNode.scrollHeight;
        },
        save_history: function (peer_uid, msg) {
            var key = "web_fetion_" + peer_uid;
            window.localStorage.setItem(key, [window.localStorage.getItem(key), msg].join("###"));
        },
        copy_history:function(){
            var key = "web_fetion_" + this.current_peer_uid;
            Titanium.UI.Clipboard.setText((content = window.localStorage.getItem(key) || "").replace(/###/g,"\n"));
            notifier.notify('', "导出聊天记录:", '聊天记录已经复制到剪贴板!');
        },
        show_face:function(){
            var layer = dojo.byId('layer_face');
            layer.style.display = layer.style.display === 'block' ? 'none': 'block';
            /*
            var pos = dojo.position(dojo.byId('face'));
            layer.style.top = pos.x + 'px';
            layer.style.left = pos.y + 'px';
            */
        }
    };
    
    dojo.connect(dojo.byId('login'), 'click', WebFetion, 'login');
    dojo.connect(dojo.byId('login_form'), 'submit', function(e){
        dojo.stopEvent(e);
        WebFetion.login(e);
    });
    // WebFetion.loadImage();
    dojo.connect(dojo.byId('login_code'), 'click', function(){
        WebFetion.loadImage();
    });
    dojo.connect(dojo.byId('hide_chat_window'), 'click', function(){
        dojo.byId('chatWindow').style.display = 'none';
        dojo.byId('left_panel').style.display = "block";
    });
    
    dojo.byId('set_status').onchange = function(){
        if(this.value !== ""){
            WebFetion.set_presence(this.value);
        }
    };
    
    dojo.connect(dojo.byId('send_sms_to_self'), 'click', function(){
        var sms = window.prompt('请输入短信:');
        sms && WebFetion.send_sms_to_self(sms);
    });
    
    dojo.connect(dojo.byId('copy_history'), 'click', WebFetion, 'copy_history');
    dojo.connect(dojo.byId('face'), 'click', WebFetion, 'show_face');

    dojo.query('.layer_face img').forEach(function(img){
        img.onclick = function(){
            dojo.byId('layer_face').style.display = 'none';
            dojo.byId('chat_content').value += img.getAttribute('pattern');
        };
    });
    
    if (window.localStorage) {
        var elements = dojo.byId('login_form').elements;
        if(window.localStorage.getItem('name')){
            elements['UserName'].value = window.localStorage.getItem('name');
        } 
        if(window.localStorage.getItem('pwd')){
            elements['Pwd'].value = window.localStorage.getItem('pwd') ;
        }
    }
});