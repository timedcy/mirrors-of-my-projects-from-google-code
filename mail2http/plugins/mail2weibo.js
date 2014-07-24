(function(exports) {
    var path = require('path');
    var worker = require(path.join(__dirname ,'./weibo_oauth2_worker.js'));
    worker.startServer();
    
    process.on('uncaughtException', function(err) {
        console.error('Caught exception: ', err);
    });

    var to;
    exports.hook_rcpt = function(next, connection, params) {
        to = params[0].user
        if(this.config.get('rcpt_to_list', 'list').indexOf(to) === -1) {
            return next(DENY);
        }
        next();
    };

    exports.hook_queue = function(next, connection) {
        var lines = connection.transaction.data_lines;
        if(lines.length === 0) {
            return next(DENY);
        }
        next(OK);
        worker.parseMail(Buffer.concat(lines),to);
    };
})(exports);
