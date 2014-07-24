//解析邮件,post到指定api
(function(){
    var console = require('console'),
    fs          = require("fs"),
    http        = require("http"),
    MailParser  = require("mailparser").MailParser,
    multiparter = require("multiparter");

    var weibo = require('weibo'), 
    uuid = require('node-uuid'), 
    connect = require('connect'),
    tapi = weibo.tapi, 
    redis = require("redis"),
    client = redis.createClient();

    var querystring = require('querystring');
    var http = require('http');

    client.on("error", function (err) {
        console.error("redis connection Error " + err);
    });

    weibo.init('weibo', '1869125062', 'd128d7a473c7a06ba0b84284a24c7924');

    var app = connect(connect.query(), connect.cookieParser(), connect.session({
        secret : uuid.v4()
    }),weibo.oauth({
        login_path : '/login',
        logout_path : '/logout',
        blogtype_field : 'type'
    }), connect.errorHandler({
        stack : true,
        dump : true
    }));

    app.use('/', function(req, res, next) {
        var user = req.session.oauthUser;
        res.writeHeader(200, {
          'Content-Type' : 'text/html'
        });
        if(!user) {
          res.end('<a href="/login?type=weibo">授权使用邮件发微博</a>');
          return;
        }
        res.end('<ul>\
            <li>绑定邮箱,请发邮件到 v@session.im (邮件 <b>主题</b> 必须为 token&secret <b>邮件内容M</b>可以为空)</li>\
            <li>绑定邮箱后,发邮件到 t@session.im (邮件 <b>主题</b> 即为微博内容,<b>图片附件</b>会自动发布为微博图片. <b>邮件内容</b>可以为空)即可发布微博</li>\
        <ul>'.replace('token',user.oauth_token_key).replace('secret',user.oauth_token_secret));
    });

    app.listen(9876);

    process.on('message', function(msg) {
        //避免长时间邮件解析操作影响邮件服务器io处理
        process.nextTick(function(){
            parseMail(msg.mail,msg.to);
        });
	});

    function parseMail(data,to){
        var mailparser  = new MailParser({
            streamAttachments : true
        });

        var path;
        mailparser.on("attachment", function(attachment){
            if(attachment && attachment.fileName && /(.GIF|.JPEG|.JPG|.PNG)$/.test(attachment.fileName.toUpperCase())){
                path = "/tmp/weibo_" + attachment.generatedFileName;
                attachment.stream.pipe(fs.createWriteStream(path));
            }
        });

        mailparser.on("end", function(mail){ 
            //避免长时间邮件上传操作影响邮件服务器io处理
            process.nextTick(function(){
                switch(to){
                    case 'v':
                        if(client.connected && mail.subject.indexOf('&') !== -1){
                            var arr = mail.subject.split("&");
                            client.set(mail.from[0].address, JSON.stringify({'token' : arr[0] , 'secret': arr[1]}),function(){
                                console.log(mail.headers.from + " authed ok!");
                            });
                        }
                        break;
                    case 't':
                        client.get(mail.from[0].address,function(){
                            try{
                               var auth = JSON.parse(arguments[1]);
                            }catch(e){
                                
                            }
                            if(auth && mail.subject){
                                publishWeibo(auth,mail.subject,function(){
                                    mail.attachments && mail.attachments.forEach(function(attachment,i){
                                        fs.unlink('/tmp/weibo_' + attachment.generatedFileName, function (err) {
                                            console.log(path + "  deleted.");
                                        });
                                    });
                                },path); 
                            }
                        });
                        break;
                    case 'l':
                        //让老服务代理
                        getFriendTimeline(mail.from[0].address);
                        break;
                }
            });
        });

        mailparser.write(data);
        mailparser.end();
        mailparser = null;
    }

    function publishWeibo(auth,status,cb,picPath){
        var authedUser = {
            blogtype : 'tsina',
            blogType : 'tsina',
            authtype : 'oauth',
            oauth_token_key : auth.token,
            oauth_token_secret : auth.secret
        };
        if(picPath){
            tapi.upload({
                    user : authedUser,
                    status : leftB(status || "分享图片" , 140)
                }, picPath, function(err, data) {
                cb();
                if(err) {
                    console.error(err);
                }else{
                    console.log("upload a weibo image !");
                }
            });
        }else{
            tapi.update({ 
                user:authedUser, 
                status : leftB(status,140)
            },function(err,data){
                cb();
                if(err){
                    console.error(err);
                }else{
                    console.log("published a weibo !");
                }
            });
        }
    }

    function leftB(str, lens){
        var s = str.replace(/\*/g, ' ').replace(/[^\x00-\xff]/g, '**');
        str = str.slice(0, s.slice(0, lens).replace(/\*\*/g, ' ').replace(/\*/g, '').length);
        if (Math.ceil(str.replace(/[^\x00-\xff]/g,'aa').length/2) > lens && lens > 0) {
            str = str.slice(0, str.length - 1);
        }
        return str;
    };

    function getFriendTimeline(sender) {
        var post_data = querystring.stringify({
            'sender' : sender
        });

        // Set up the request
        var post_req = http.request({
            host: 'mail2weibo.session.im',
            port: '80',
            path: '/weibo/l/',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': post_data.length
            }
        }, function(res) {
            
        });

        post_req.write(post_data);
        post_req.end();
    }
})();
