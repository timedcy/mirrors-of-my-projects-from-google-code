require 'rubygems'
require 'eventmachine'
require 'em-http-request'

Fetion_Status = {
  '在线' => '1' ,
  '忙碌' => '2' ,
  '离开' => '3' ,
  '隐身' => '4' 
}
EM.run{
  mobile = '13651368727'#my mobile
  password = 'xxxx'#my fetion password
  headers = {
      'Host' => 'f.10086.cn',
      'Referer' => 'http://f.10086.cn/im/login/login.action',
      'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:5.0.1) Gecko/20100101 Firefox/5.0.1',
      'Accept'  => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language' => 'en-us,en;q=0.5',
      'Accept-Encoding' => 'gzip, deflate',
      'Accept-Charset'  => 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
      'Connection'  => 'keep-alive'
    }
    
    http = EventMachine::HttpRequest.new('http://f.10086.cn/im/login/login.action').get(:head => headers)
    http.errback { 
      p 'error'; EM.stop
    }
    http.callback {
      cookie = http.response_header['SET_COOKIE']
      puts cookie
      p http.response_header.status
      p http.response_header
      p http.response
      jsessionid = cookie.split(";")[0].split('JSESSIONID=')[1]
      body = "pass=#{password}&loginstatus=4&m=#{mobile}"
      http2 = EventMachine::HttpRequest.new("http://f.10086.cn/im/login/inputpasssubmit1.action;jsessionid=#{jsessionid}").post({
        :body => {
          :m => mobile,
          :pass => password,
          :loginstatus => '4'
        },#body,
        :head => headers.merge({
          :Cookie => cookie #,'Content-Type' => 'application/x-www-form-urlencoded','Content-Length' => body.length
         })
      })
      #If you provide a Ruby string, then make sure to specify the correct encoding headers such that
      # the upstream servers knows how to parse your data. 
      #Alternatively, you can provide a Ruby hash, in which case em-http will form-encode the data for you, 
      #set it as the POST body, and set the proper form-encoding HTTP headers within the request.
      http2.errback { 
        p 'error'; EM.stop
      }
      http2.callback {
        cookie2 = http2.response_header['SET_COOKIE'] 
        p cookie2
        p http2.response_header.status
        p http2.response_header
        p http2.response
        
        #send msg to self
        http3 = EventMachine::HttpRequest.new("http://f.10086.cn/im/user/sendMsgToMyselfs.action").post({
                :body => {
                  :msg => 'test dyw 消息'
                },#body,
                :head => headers.merge({
                  :Cookie => cookie + ";" + cookie2.join(";") 
                 })
              })
              http3.callback { 
                p http3.response
              }
 
      }
    }
}
