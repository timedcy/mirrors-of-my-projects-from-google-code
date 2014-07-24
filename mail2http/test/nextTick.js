var console = require("console");
console.log(11);
process.nextTick(function(){
	console.log(22);
});
console.log(33);

//see https://gist.github.com/1257394
//process.nextTick vs setTimeout(fn, 0)

var start = new Date().getTime();
for (var i = 0; i < 1024 * 1024; i++) {
  process.nextTick(function () { 
  	Math.sqrt(i) ;
  	console.log(i,new Date().getTime() - start);
  	//38335ms
  });
}