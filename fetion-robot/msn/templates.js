$import("diy/msn/_msn.js");
(function(){
    var templates = {
        contact:'<a title="#{title}" href="javascript:void(0)"><span class="squicon squ_#{status}"></span>#{contact_name}</a>',
        
        group:'<a title="#{title}" onclick="Sina.msn.MSN.toggleGroup(this);return false;" class="group" href="javascript:void(0)"><span class="aticon"></span>#{group_name}</a><ul id="#{group_id}_contact_list" ></ul>',
        
        groupList:'<div class="msnBox speakBox">\
            <div class="title">\
                <a class="min" hidefocus="true" id="close_msn_contactlist" href="javascript:void(0)"></a>\
            </div>\
            <div class="speakBoxCon">\
                <h3><div class="input"><input id="msn_suggest" type="text" value="'+$CLTMSG['MSN005']+'" name="msn_suggest" /></div><a id="clear_result" style="display:none;" class="inputS" href="#"></a></h3>\
                <div class="sbc" id="msn_group_list">\
                </div>\
            </div>\
        </div>',
        
        loading:'<div class="msnBarbor">\
            <div class="msnBar msnBarS">\
                <img align="absmiddle" width="16" height="16" class="loading" src="#{src}" />'+$CLTMSG['MSN006']+'\
            </div>\
        </div>',
        
        bottomBar:'<div class="msnBarbor">\
            <div id="msn_bar" class="msnBar msnBarS">\
                <a class="headp" hidefocus="true" onclick="Sina.msn.MSN.showSetting(this);return false;" id="msn_profile"  href="javascript:void(0)">\
                    <img align="absmiddle" width="15" height="16" class="micon minhead" src="#{src}" /></a>\
                <span class="sline"></span>\
                <a class="pern"  hidefocus="true" onclick="Sina.msn.MSN.showGroupList(this);return false;" id="msn_count" href="javascript:void(0)" >0'+$CLTMSG['MSN004']+'</a>\
                <span style="display:none;" id="msn_msg_span" class="sline"></span>\
                <a style="display:none;" id="msn_msg_notice" class="speak" href="javascript:void(0)">\
                	<img id="msn_notice_img" width="14" height="12" class="micon minspeak" src="http://img.t.sinajs.cn/t3/style/images/common/transparent.gif" />\
                </a>\
            </div>\
        </div>',
        
        setting : '<div class="title"><a id="minimize" class="min" hidefocus="true" href="javascript:void(0)"></a></div>\
                    <div class="headpBoxCon">\
                        <h3>\
                            <div id="head_status" class="headpic hp_#{status}"><img id="msn_face_img" width="22" height="22" src="#{face}" />\
                            </div>\
                            <span title="#{titleName}" class="name">#{displayName}</span></h3>\
                        <ul id="setting_list">\
                            <li><a status="1" hidefocus="true" href="#"><span class="squicon squ_g"></span>'+$CLTMSG['MSN007']+'</a></li>\
                            <li><a status="3" hidefocus="true" href="#"><span class="squicon squ_r"></span>'+$CLTMSG['MSN008']+'</a></li>\
                            <li><a status="6" hidefocus="true" href="#"><span class="squicon squ_y"></span>'+$CLTMSG['MSN009']+'</a></li>\
                            <li><a status="2" hidefocus="true" href="#"><span class="squicon squ_w"></span>'+$CLTMSG['MSN010']+'</a></li>\
                            <li class="line"></li>\
                            <li><a href="/msn/bind.php">'+$CLTMSG['MSN011']+'</a></li>\
                            <li><a href="#">'+$CLTMSG['MSN012']+'</a></li>\
                        </ul>\
                    </div>',
        
        noticeItem:'<a  href="javascript:void(0)" style="color:#{color};"><span class="squicon squ_#{status}"></span>#{name}</a>',
        msgNoticeList:'<div id="msn_notice_list" class="msnBox perSpBox">\
            <div class="title">\
                <a class="min" id="close_msn_notices" href="javascript:void(0)"></a>\
            </div>\
            <div class="perSpBoxCon">\
                <ul id="msg_notice_list">\
                </ul>\
            </div>\
        </div>',
        chatWindow:'<div class="msnBox txtBox">\
            <div class="title">\
                <a class="min" id="hide_msn_chatwindow" href="javascript:void(0)"></a>\
                <a class="close" id="msn_close_chat" href="javascript:void(0)"></a>\
            </div>\
            <div class="txtBoxCon clearFix">\
                <h3 id="msn_chat_head">\
                    <div class="headpic hp_#{status}">\
                        <img id="msn_face_icon" width="22" height="22" src="#{face}" />\
                    </div><span class="name" id="msn_chat_name">#{name}</span></h3>\
                <div class="txtList">\
                    <ul id="chat_list">\
                    </ul>\
                </div>\
                <textarea class="textarea" value="" id="chat_content" name="chat_content">\
                </textarea>\
                	<div class="btnbox clearFix">\
				    <a class="linka"  target="_blank" id="msn_invite_user" href="javascript:void(0)" ></a>\
				    <a title="ctrl+Enter" class="btn_normal btnxs" id="send_msg" href="javascript:void(0)"><em>'+$CLTMSG['MSN013']+'</em></a>\
				</div>\
            </div>\
        </div>',
    		chatHead:'<div class="headpic hp_#{status}">\
            <img id="msn_face_icon" width="22" height="22" src="#{face}" />\
        </div><span class="name" id="msn_chat_name">#{name}</span>'
    };
    
    Sina.msn.Templates = {
        contact:templates.contact,
        group:templates.group,
        groupList:templates.groupList,
        loading:(new Utils.Template(templates.loading)).evaluate({
            src:'http://img.t.sinajs.cn/t3/style/images/common/loading.gif'
        }),
        bottomBar:(new Utils.Template(templates.bottomBar)).evaluate({
            src:'http://img.t.sinajs.cn/t3/style/images/common/transparent.gif'
        }),
        setting : templates.setting,
        noticeItem:templates.noticeItem,
        msgNoticeList:templates.msgNoticeList,
        chatWindow:templates.chatWindow,
        chatHead:templates.chatHead
    };
})();
