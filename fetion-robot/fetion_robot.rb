#! /usr/bin/ruby
#author newdongyuwei@gmail.com
if GC.respond_to?(:copy_on_write_friendly=)
   GC.copy_on_write_friendly = true
end
$KCODE = 'UTF-8'#解决中文乱码问题
%w(rubygems fileutils sinatra sinatra/base net/http net/https json).each{|lib|require lib}
require 'ruby-growl'if RUBY_PLATFORM.downcase.include?("darwin")

class FetionRobot < Sinatra::Base
    @@Version = 0
    
    enable :sessions
    set  :run, true
    
    def https_request(path,method,body,headers,hasVersion)
        if not body
            body =  "ssid=#{session['webim_sessionid']}"
        end
        if not headers
             headers = {
                'Referer' => 'https://webim.feixin.10086.cn/',
                'Content-Type' => 'application/x-www-form-urlencoded'
             }
        end
        http = Net::HTTP.new('webim.feixin.10086.cn', 443)
        http.use_ssl = true
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
    
    def get_personal_info
        resp, data = self.https_request("/WebIM/GetPersonalInfo.aspx",'POST',nil,nil,true)
        puts data
        info = JSON(data)
        if info['rc'] == 200
            self.get_contact_list()
        end
    end
    
    def get_contact_list
        resp, data = self.https_request("/WebIM/GetContactList.aspx",'POST',nil,nil,true)
        info = JSON(data)
        puts data
        if info['rc'] == 200
            self.keep_alive
        end
    end
    
    def keep_alive
        Thread.new { 
            loop { 
                resp, data = self.https_request("/WebIM/GetConnect.aspx",'POST',nil,nil,true)
                info = JSON(data)
                puts info['rc']
                puts resp,data
                if info['rc']== 200
                    info['rv'].each do|item|
                        data = item['Data']
                        if item['DataType'] ==3 and data
                            if Object.const_defined? :Growl
                                g = Growl.new "127.0.0.1", "ruby-growl", ["ruby-growl Notification"]
                                g.notify "ruby-growl Notification", "New feixin message",data['msg']
                            end
                            self.send_msg(data['fromUid'],data['msg']+' - -feedfack')#just for ping-pong test
                        end
                    end
                end
                sleep 5
             }
         }
    end
    
    #isSendSms='1' 发短信到手机 ,isSendSms='0'普通消息
    def send_msg(to,msg,isSendSms='0')
        body = "To=#{to}&IsSendSms=#{isSendSms}&msg=#{msg}&ssid=#{session['webim_sessionid']}"
        resp, data = self.https_request("/WebIM/SendMsg.aspx",'POST',body,nil,true)
        info = JSON(data)
        puts data
        if info['rc']== 200
            puts 'send msg ok!'
        end
        return data
    end
    
    get '/' do
         "<form action='/login' method='post'>\
            <LABEL for='UserName' >手机或飞信号</LABEL><input name='UserName' type='text' />\
            <LABEL for='Pwd' >密码</LABEL><input name='Pwd' type='password'/>\
            <LABEL for='Ccp' >验证码</LABEL><input name='Ccp' type='text' />\
            <img onclick='window.location.reload(true)'  src='/get_code_img' />\  
            <input type='submit' value='登录飞信'/>\
         </form>"
    end

    post '/login' do
        body = "UserName=#{params['UserName']}&Pwd=#{params['Pwd']}&OnlineStatus=400&Ccp=#{params['Ccp']}"
        puts body
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
                session['webim_sessionid'] = webim_sessionid
                puts webim_sessionid
                self.get_personal_info()
                'login ok!'
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
end

FetionRobot.run!
