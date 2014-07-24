var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;
var console = require('console');

var numReqs = 0;
if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork();
    worker.on('message', function(msg) {
      console.log(msg);
      if (msg.cmd && msg.cmd === 'notifyRequest') {
        numReqs++;
      }
    });
  }

  setInterval(function() {
    //firefox safari浏览器下numReqs符合预期,但是chrome浏览器下每次刷新页面numReqs会+2,而非+1. 奇怪?!
    //chrome will load favicon.ico
    console.log("numReqs =", numReqs);
  }, 5000);

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died. restart...');
    cluster.fork();//重启woker进程. 但如果Master进程被杀死,worker进程都会被相继杀死.
  });

} else {
    //所有worker共享同一端口,由操作系统内核做load balance
    http.Server(function(req, res) {
      console.log(req.url);
      //chrome will load favicon.ico
      res.writeHead(200, {'content-type': 'text/html'});
      //process.pid只在不同浏览器中访问时才可能不同,同一浏览器始终相同
      res.end(process.pid + " hello world\n");
      // Send message to master process
      if(req.url !== '/favicon.ico'){
        process.send({ cmd: 'notifyRequest' });
      }
      
    }).listen(8000);  
}