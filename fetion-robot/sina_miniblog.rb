#! /usr/bin/ruby
#author newdongyuwei@gmail.com

require 'rubygems'   
require "sinatra"  
require  'oauth'
require 'oauth/consumer'
require 'yaml'
require 'logger'

class SinaWeiboClient
    def initialize()
        @loger = Logger.new(STDOUT)
        @loger.level = Logger::DEBUG
        
        auth = YAML.load(File.open(File.join(File.dirname(__FILE__),'auth.yaml'),"r"))
        if auth
            @api_key = auth[:api_key]
            @api_key_secret = auth[:api_key_secret]
            @access_token = auth[:access_token]
            @access_secret = auth[:access_secret]
        else
            @loger.error("no auth info from auth.yaml! client will exit.")  
            exit
        end
    end
    
    def access_token
        OAuth::AccessToken.new(self.consumer(),@access_token,@access_secret)
    end
    
    def update_status(status)
        self.access_token.post("http://api.t.sina.com.cn/statuses/update.json",{"status" => CGI.escape(status)})
    end
    
    def consumer(api_key=@api_key, api_key_secret=@api_key_secret)
        return OAuth::Consumer.new(api_key, api_key_secret , 
                                        { 
                                          :site=>"http://api.t.sina.com.cn",
                                          :request_token_path=>"/oauth/request_token",
                                          :access_token_path=>"/oauth/access_token",
                                          :authorize_path=>"/oauth/authorize",
                                          :signature_method=>"HMAC-SHA1",
                                          :scheme=>:header,
                                          :realm=>"#{@host}"
                                        }
         )
    end
end
 
class SinaWeiboAuth  <  Sinatra::Base
    set  :run ,true
    def initialize
        super
        @api_key='1869125062'
        @api_key_secret='d128d7a473c7a06ba0b84284a24c7924'
        @host = 'http://127.0.0.1:4567'
        @loger = Logger.new(STDOUT) # File.join(File.dirname(__FILE__),'sinaweibo.log')
        @loger.level = Logger::DEBUG
    end
    
    def consumer(api_key=@api_key, api_key_secret=@api_key_secret)
        return OAuth::Consumer.new(api_key, api_key_secret , 
                                        { 
                                          :site=>"http://api.t.sina.com.cn",
                                          :request_token_path=>"/oauth/request_token",
                                          :access_token_path=>"/oauth/access_token",
                                          :authorize_path=>"/oauth/authorize",
                                          :signature_method=>"HMAC-SHA1",
                                          :scheme=>:header,
                                          :realm=>"#{@host}"
                                        }
         )
    end

    get '/' do
        consumer = self.consumer()
        request_token = consumer.get_request_token
        href = request_token.authorize_url + "&oauth_callback=" + CGI.escape("#{@host}/callback")
        @loger.debug href
        "<a href='#{href}' title='auth'>login SinaWeibo to auth this app</a>"
    end

    get '/callback' do
        request_token = OAuth::RequestToken.new(self.consumer(), session[:request_token], session[:request_token_secret]) 
        access_token = request_token.get_access_token(:oauth_verifier => params[:oauth_verifier]) 
        @loger.debug "#{access_token.token},#{access_token.secret}" 
        auth = {
          :api_key =>  @api_key,
          :api_key_secret =>  @api_key_secret,
          :access_token => access_token.token,
          :access_secret => access_token.secret
        }
        YAML.dump(auth,File.open(File.join(File.dirname(__FILE__),'auth.yaml'),"w"))
        "auth succed!"
    end
end

SinaWeiboAuth.run!
