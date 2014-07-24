(function(exports){
    var console = require('console'),
    fs          = require("fs"),
    http        = require("http"),
    multiparter = require("multiparter"),
    MailParser  = require("mailparser").MailParser;
    
    var postURL;
    exports.register = function () {
        postURL = this.config.get('mail2http.url');
    };

    exports.hook_data = function (next, connection) {
        connection.transaction.parse_body = 1;
        return next();
    };   

    exports.hook_data_post = function (next, connection) {
        console.log(connection.transaction.body.header,connection.transaction.body.children);
        /*
        connection.transaction.body.children包含了所有内容(text body ,html body, attchments)
        根据state: 'attachment' or 'body' 和ct来判断
        1 如果追求性能提升,r就无必要使用mailparse.
        2 追求代码量简小,还是先用着吧.
        */
        next();
    };

    //hook_queue可以避免使用test_queue等queque插件
    exports.hook_queue = function(next, connection) {
        var lines = connection.transaction.data_lines;
        if (lines.length === 0) {
            return next(DENY);
        }
        next(OK);
        parseMail(lines.join(''));
    };


    function parseMail(data){
        var mailparser  = new MailParser({
            streamAttachments : true
        });

        mailparser.on("attachment", function(attachment){
            attachment.stream.pipe(fs.createWriteStream(process.cwd() + "/attachments/" + attachment.fileName ));
        });

        mailparser.on("end", function(mail){ 
            postMail2HTTP(mail);
        });

        mailparser.write(data);
        mailparser.end();
        mailparser = null;
    }

    function postMail2HTTP(oMail){
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
        attachments.forEach(function(attachment,i){
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
            if(response.statusCode === 200){
                files.forEach(function(path,i){
                    fs.unlink(path, function (err) {
                        console.log('successfully deleted ',path);
                    });
                });
            }
        });
    }
})(exports);

