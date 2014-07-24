var cp = require('child_process');
var n = cp.fork(__dirname + '/child-worker.js');

n.on('message', function(m) {
  console.log('PARENT got message:', m);
});

n.send(process.pid);

/*
var processPool = {}, list = [];
for(var i=0;i<2;i++){
	var worker = cp.fork(__dirname + '/child-worker.js');
	processPool[worker.pid] = worker;
	list.push(worker);
	worker.on('message', function(m) {
	  console.log('PARENT got message:', m);
	});
}
*/


