(function(){
	function contextMenuOnClick(info, tab) {
	  console.log(info,tab);
	  window.open('http://s.weibo.com/weibo/keyword'.replace('keyword',info.selectionText));
	}

	// ["all", "page", "frame", "selection", "link", "editable", "image", "video", "audio"];
	var menu = chrome.contextMenus.create({"title": "微博搜索 '%s' ", "contexts":['selection'],"onclick": contextMenuOnClick});
})();

