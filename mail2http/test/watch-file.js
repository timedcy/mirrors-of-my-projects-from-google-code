var fs = require('fs');
var file = './mail-path.txt';
var last ,content;
fs.watchFile(file, function (curr, prev) {
    fs.readFile(file, function (err, data) {
        content = data.toString();
        if(content !== last ){
            console.log('content change:',content)
        }
        last = content;
    });
});
