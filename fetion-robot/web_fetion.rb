#! /usr/bin/ruby
#author newdongyuwei@gmail.com

if GC.respond_to?(:copy_on_write_friendly=)
   GC.copy_on_write_friendly = true
end

$KCODE = 'UTF-8'#解决中文乱码问题

%w(rubygems sinatra sinatra/base net/http net/https json erubis eventmachine em-websocket).each{|lib|require lib}

require 'ruby-growl'if RUBY_PLATFORM.downcase.include?("darwin")

class WebFetion < Sinatra::Base
    @@Version = 0
    @@webim_sessionid = ''
    
    enable :sessions
    use Rack::Static, :urls => ["/images","/css","/js" ], :root => "views"
    set  :run, true
    
    def self.version
        @@Version
    end
    
    def self.version= v
        @@Version = v
    end
    
    def self.webim_sessionid
        @@webim_sessionid
    end
    
    def self.websocket= ws
        @@websocket = ws
    end
    
    def self.server_push data
        @@websocket.send data
    end
    
    def https_request(path,method,body,headers,hasVersion)
        if not body
            body =  "ssid=#{@@webim_sessionid}"
        end
        if not headers
             headers = {
                'Referer' => 'https://webim.feixin.10086.cn/',
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Connection' => 'keep-alive'
             }
        end
        http = Net::HTTP.new('webim.feixin.10086.cn', 443)
        #http.set_debug_output STDERR
        http.use_ssl = true
        http.timeout = 10
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE # turn off SSL warning
        if hasVersion
            path = "#{path}?Version=#{@@Version}"
            @@Version = @@Version + 1
        end
        
        if method == 'GET'
            return (resp, data = http.get(path, nil))
        else
            return (resp, data = http.post(path, body,headers))
        end
    end
    def self.https_request(path,method,body,headers,hasVersion)
        if not body
            body =  "ssid=#{@@webim_sessionid}"
        end
        if not headers
             headers = {
                'Referer' => 'https://webim.feixin.10086.cn/',
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Connection' => 'keep-alive'
             }
        end
        http = Net::HTTP.new('webim.feixin.10086.cn', 443)
        #http.set_debug_output STDERR
        http.use_ssl = true
        http.timeout = 10
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE # turn off SSL warning
        if hasVersion
            path = "#{path}?Version=#{@@Version}"
            @@Version = @@Version + 1
        end
        
        if method == 'GET'
            return (resp, data = http.get(path, nil))
        else
            return (resp, data = http.post(path, body,headers))
        end
    end
    
    get '/get_personal_info' do
        resp, data = self.https_request("/WebIM/GetPersonalInfo.aspx",'POST',nil,nil,true)
        puts data
        info = JSON(data)
        if info['rc'] == 200
            return data
        end
    end
    
    get '/get_contact_list' do
        resp, data = self.https_request("/WebIM/GetContactList.aspx",'POST',nil,nil,true)
        info = JSON(data)
        puts data
        if info['rc'] == 200
            return data
        end
    end
    
    #isSendSms='1' 发短信到手机 ,isSendSms='0'普通消息
    post '/send_msg' do #(to,msg,isSendSms='0')
        body = "To=#{params['to']}&IsSendSms=#{params['isSendSms']}&msg=#{params['msg']}&ssid=#{@@webim_sessionid}"
        resp, data = self.https_request("/WebIM/SendMsg.aspx",'POST',body,nil,true)
        info = JSON(data)
        puts data
        if info['rc']== 200
            puts 'send msg ok!'
            if Object.const_defined? :Growl
               g = Growl.new "127.0.0.1", "ruby-growl", ["ruby-growl Notification"]
               g.notify "ruby-growl Notification", "send msg result",'send msg ok!'
            end
            return data
        end
    end
    
    get '/' do
        erubis :index
    end


    post '/login' do
        body = "UserName=#{params['UserName']}&Pwd=#{params['Pwd']}&OnlineStatus=400&Ccp=#{params['Ccp']}"
        puts body
        
        session['name'] = params['UserName']
        session['pwd'] = params['Pwd']
        
        headers = {
            'Cookie' => session['ccpsession'],
            'Referer' => 'https://webim.feixin.10086.cn/',
            'Content-Type' => 'application/x-www-form-urlencoded'
         }
        resp, data = self.https_request(  "/WebIM/Login.aspx",'POST',body,headers,false)
        puts data
        begin
            rc = JSON(data)['rc']
            if rc == 200
                webim_sessionid = resp.response['set-cookie'].split('webim_sessionid=')[1].split(';')[0]
                @@webim_sessionid = session['webim_sessionid'] = webim_sessionid
                data
            else
                redirect "/"
            end
        rescue Exception=>e
           puts e.to_str
           redirect "/"
        end
    end
    
    get '/get_code_img' do
        resp, data = self.https_request( '/WebIM/GetPicCode.aspx?Type=ccpsession','GET',nil,nil,false)
        cookie = resp.response['set-cookie'].split(';')[0]
        session['ccpsession'] = cookie
        resp.body
    end
    
    #isSendSms='1' 发短信到手机 ,isSendSms='0'普通消息
    def self.send_msg(to,msg,isSendSms='0')
        body = "To=#{to}&IsSendSms=#{isSendSms}&msg=#{msg}&ssid=#{@@webim_sessionid}"
        resp, data = self.https_request("/WebIM/SendMsg.aspx",'POST',body,nil,true)
        info = JSON(data)
        puts data
        if info['rc']== 200
            puts 'send msg ok!'
        end
        return data
    end
    
    def self.keep_alive
        Thread.new { 
            loop { 
                begin 
                    resp, data = self.https_request("/WebIM/GetConnect.aspx",'POST',nil,nil,true)
                    info = JSON(data)
                    if info['rc']== 200
                        puts resp,data
                        self.server_push data
                    end
                rescue Exception=>e
                    puts  e.to_str
                end
                sleep 3
             }
         }
    end
end

EventMachine.run {
    WebFetion.run!
    EventMachine::WebSocket.start(:host => "0.0.0.0",:port => 7777) do |ws|
        WebFetion.websocket = ws;
        ws.onopen {
          puts "WebSocket connection open"
        }
        ws.onmessage { |msg|
          puts "WebSocket Recieved message: #{msg}"
          if msg === 'keep-alive'
            begin
                WebFetion.keep_alive
            rescue Exception=>e
                puts e.to_str
            end
          end
        }
        ws.onclose { puts "WebSocket Connection closed" }
    end
}
