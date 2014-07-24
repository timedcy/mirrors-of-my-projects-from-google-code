(function(exports){
    var console = require('console'),
    cp = require('child_process');
    
    var worker = cp.fork(__dirname + '/worker.js');

    worker.on('message', function(m) {
      console.log('message from worker:', m);
    });
   
    //自动重启死亡worker子进程
    worker.on('exit', function () {
        console.log('mail2weibo worker is about to exit, refork the worker.');
        process.nextTick(function () {
           worker = cp.fork(__dirname + '/worker.js');
        });
    });
    
    process.on('uncaughtException', function(err) {
        console.error('Caught exception: ', err);
    });
    
    //Master退出时杀死所有worker进程
    process.on('SIGTERM', function() {
       console.log('Master killed');
       console.log('worker '+ worker.pid + ' killed');
       worker.kill();
       process.exit(0);
    });

    var postURL;
    exports.register = function () {
        postURL = this.config.get('mail2http.url');
    };


    exports.hook_queue = function(next, connection) {
        var lines = connection.transaction.data_lines;
        if (lines.length === 0) {
            return next(DENY);
        }
        next();
        worker.send({
            mail: lines.join(''),
            postURL : postURL
        });
    };
})(exports);

