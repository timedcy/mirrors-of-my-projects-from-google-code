//解析邮件,post到指定api
(function(){
    var console = require('console'),
    fs          = require("fs"),
    http        = require("http"),
    MailParser  = require("mailparser").MailParser,
    multiparter = require("multiparter");

    process.on('message', function(msg) {
        //避免长时间邮件解析操作影响邮件服务器io处理
        process.nextTick(function(){
            parseMail(msg.mail,msg.postURL);
        });
	});

    function parseMail(data,postURL){
        var mailparser  = new MailParser({
            streamAttachments : true
        });

        mailparser.on("attachment", function(attachment){
            console.log(attachment)
            if(attachment && attachment.fileName){
                attachment.stream.pipe(fs.createWriteStream(process.cwd() + "/attachments/" + attachment.fileName ));           
            }
        });

        mailparser.on("end", function(mail){ 
            //避免长时间邮件上传操作影响邮件服务器io处理
            process.nextTick(function(){
                postMail2HTTP(mail,postURL);
            });
        });

        mailparser.write(data);
        mailparser.end();
        mailparser = null;
    }

    function postMail2HTTP(oMail,postURL){
        var host = postURL.split('http://')[1].split(':')[0], port = postURL.split('http://')[1].split(':')[1]
        var request = new multiparter.request(http, {
            host: host,
            port: port,
            path: "/upload",
            method: "POST"
        });

        var attachments = oMail.attachments;
        delete oMail.headers;
        delete oMail.attachments;


        for(var k in oMail){
            request.setParam(k, typeof oMail[k] === 'string' ? oMail[k] : JSON.stringify(oMail[k]));
        }

        var files = [];
        attachments && attachments.forEach(function(attachment,i){
            var path = process.cwd() + "/attachments/" + attachment.fileName;
            request.addStream(
                "attachment" + i,
                attachment.fileName,
                attachment.contentType,
                attachment.length,
                fs.createReadStream(path)
            );
            files.push(path);
        });

        request.send(function(error, response) {
            if(response && response.statusCode && response.statusCode === 200){
                process.send({ code: 200 });
            }
            files.forEach(function(path,i){
                fs.unlink(path, function (err) {
                    console.log(path + "  deleted.");
                });
            });
        });
    }
})();
