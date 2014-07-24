#! /usr/bin/ruby
#author newdongyuwei@gmail.com

%w(rubygems sinatra sinatra/base eventmachine  em-websocket stringio ).each{|lib|require lib}

class WebServer < Sinatra::Base
    set :run ,true
    set :port, 9999
    set :environment, :production
    
	get '/' do
		'please input ruby code (try ruby over WebSocket):
		<hr>
		<textarea id="content" style="width:500px;height:200px;"> puts 123.methods.sort </textarea>
		<br>
        <button id="send">run ruby code!</button>
		<hr>
		excution result:
		<br>
		<textarea id="log" style="width:500px;height:200px"></textarea>
		<script>
			(function() {
				if (window.WebSocket || window.MozWebSocket) {
					var url = "ws://host:7777".replace("host",window.location.hostname);
					var ws = window.WebSocket ?  new WebSocket(url) : new MozWebSocket(url);
                    var timer;
					ws.onopen = function() {
                        //重要:无数据时保持连接心跳
						timer = setInterval( function() {
							if(ws.readyState === 1  && ws.bufferedAmount === 0) {
								ws.send("KeepAlive");
							}
						}, 20000);
					};
					ws.onmessage = function(evt) {
						var data = evt.data;
						var log = document.getElementById("log");
						log.value = data;
					};
					ws.onclose = function() {
                        clearInterval(timer);
						console.log("socket closed");
					};
					document.getElementById("send").onclick = function() {
						ws.send(document.getElementById("content").value.split("\n").join(";"));
					};
				} else {
					alert("You browser does not support  web sockets,try chrome,safari5 ,firefox6,or opera11(opera:config#UserPrefs|EnableWebSockets)");
				};
			})();
		</script>
        '
	end
end

EM.kqueue = true if EM.kqueue? 
EM.epoll = true if EM.epoll?

EventMachine.run {
	WebServer.run!
	EventMachine::WebSocket.start(:host => "0.0.0.0",:port => 7777) do |ws|
		ws.onopen { puts "WebSocket connection open" }
		ws.onmessage do |msg|
			if msg != "KeepAlive"
				Thread.start{
					$SAFE = 3 #保证安全性
					begin
						$stdout = StringIO.new
						eval(msg)
						ws.send( $stdout.string)
					rescue
						ws.send($!.to_s) 
					ensure
						 $stdout = STDOUT 
					end
				}
			end
		end
		ws.onclose { puts "WebSocket Connection closed" }
	end
}