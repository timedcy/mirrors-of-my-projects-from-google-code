require 'rubygems'
require 'mail'
#require 'mustache'

hostname = 'localhost'#`hostname`.strip
          
Mail.defaults do
  delivery_method :smtp, { :address => hostname,
    :port    => 25,
    :domain  => hostname
  }
end

mail = Mail.new do
	from    'from@localhost'
	to      'to@localhost'
	subject 'test email subject'

	text_part do
		body 'This is plain text'
	end

	html_part do
		content_type 'text/html; charset=UTF-8'
		body '<h1>This is HTML</h1>'
	end

	add_file File.join(File.dirname(__FILE__),'attachment.txt')
	add_file File.join(File.dirname(__FILE__),'face.jpeg')
end

#mail = Mail.new Mustache.render(File.read('ipad-mail.eml'), :hostname => hostname)
mail.deliver!
