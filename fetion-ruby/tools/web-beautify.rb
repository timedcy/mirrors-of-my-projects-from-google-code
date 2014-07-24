require 'rubygems'
require 'sinatra'
require 'ruby2ruby'
require 'ruby_parser'

HTML = "
	<form action='/beautify' method='post'>
		<textarea name='code' style='width:80%;height:50%;'>_Source_Code_</textarea>
		<input type='submit' value='beautify ruby source code'/>
	</form>"

get '/' do 
	HTML.sub(/_Source_Code_/,'')
end

post '/beautify' do 
	begin
		parser    = RubyParser.new
		ruby2ruby = Ruby2Ruby.new
		sexp      = parser.process(params['code'])
		"beautified successfully! #{HTML.sub(/_Source_Code_/,ruby2ruby.process(sexp))}"
	rescue Exception => e
		"parse failed ! #{HTML.sub(/_Source_Code_/,'')}"
	end
end