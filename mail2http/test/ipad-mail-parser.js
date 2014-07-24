var fs = require("fs"), MailParser = require("mailparser").MailParser, data = fs.readFileSync('./ipad-mail.eml', 'utf-8');

var mailparser = new MailParser({
	streamAttachments : true
});

var path ;
mailparser.on("attachment", function(attachment) {
	if(attachment && attachment.fileName && /(.GIF|.JPEG|.JPG|.PNG)$/.test(attachment.fileName.toUpperCase())) {
		path = "/tmp/attachment_" + attachment.fileName;
		attachment.stream.pipe(fs.createWriteStream(path));
	}
});

mailparser.on("end", function(mail) {
	console.log('end');
	console.log(path);
});

mailparser.write(data);
mailparser.end();
mailparser = null;