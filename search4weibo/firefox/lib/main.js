(function(){
	var cm = require("context-menu");
	cm.Item({
	  label: "微博搜索",
	  context: cm.SelectionContext(),
	  contentScript: 'self.on("context", function () {' +
	                 '  var text = window.getSelection().toString();' +
	                 '  if (text.length > 20)' +
	                 '    text = text.substr(0, 20) + "...";' +
	                 '  return "微博搜索 " + text ;' +
	                 '});' +
	                 'self.on("click", function (node, text) {window.open("http://s.weibo.com/weibo/" + window.getSelection().toString())});'
	});
})();
