#!/usr/bin/ruby
# Using GPL v2
# Author:: DongYuwei(mailto:newdongyuwei@gmail.com)
# 2012-06-13 更新,又可以工作了

require 'uri'
require 'net/http'
require 'net/https'
require "socket"
require 'rexml/document'
require 'digest/md5'
require 'digest/sha1'
require 'openssl'
require "iconv"

class Fetion
   def initialize(phone_num , password)
      @phone_num = phone_num;
      @password = password;
      @domain = "fetion.com.cn";
      @login_xml = '<args><device accept-language="default" machine-code="0A0003000000" /><caps value="1FFF" /><events value="7F" /><user-info mobile-no="%s" user-id="%s"><personal version="0" attributes="v4default;alv2-version;alv2-warn;dynamic-version" /><custom-config version="0"/><contact-list version="0" buddy-attributes="v4default" /></user-info><credentials domains="fetion.com.cn;m161.com.cn;www.ikuwa.cn;games.fetion.com.cn;turn.fetion.com.cn;pos.fetion.com.cn;ent.fetion.com.cn;mms.fetion.com.cn"/><presence><basic value="%s" desc="" /><extendeds /></presence></args>'

      self.init
   end

   def init
      doc = REXML::Document.new(self.get_system_config())
      sipc_proxy = ""
      doc.elements.each("//sipc-proxy") do |element|
         sipc_proxy = element.text
      end
      @SIPC = SIPC.new(sipc_proxy);

      sipc_url = ""
      doc.elements.each("//ssi-app-sign-in-v2") do |element|
         sipc_url = element.text
      end
      @fetion_num = self.get_fetion_num(self.SSIAppSignIn(sipc_url))
   end

   def login()
      req1 = sprintf("R #{@domain} SIP-C/4.0\r\nF: %s\r\nI: 1\r\nQ: 1 R\r\nCN: #{random_string(32)}\r\nCL: type=\"pc\",version=\"4.1.1160\"\r\n\r\n",@fetion_num)
      res1 = @SIPC.request(req1)

      @nonce = res1.scan(/nonce="(.*)",/)[0][0].split(',')[0][0..-2]
      @key = res1.scan(/key="(.*)",/)[0][0].split(',')[0]

      @response = generate_response
      @login_xml = sprintf(@login_xml,@phone_num,@user_id , '400')#@user_status
      req2 = sprintf("R #{@domain} SIP-C/4.0\r\nF: %s\r\nI: 1\r\nQ: 1 R\r\nA: Digest algorithm=\"SHA1-sess-v4\",response=\"%s\"\r\nL: %s\r\n\r\n",@fetion_num,@response,@login_xml.length)
      res2 = @SIPC.request(req2 + @login_xml)
   end

   def generate_response
      p1 = Digest::SHA1.hexdigest("#{@domain}:#{@password}")
      p2 = Digest::SHA1.hexdigest([@user_id.to_i].pack('i') + [p1].pack("H*"))
      str = @nonce + [p2].pack("H*") + [random_string(64)].pack("H*")

      rsa_key = OpenSSL::PKey::RSA.new
      exponent = OpenSSL::BN.new @key[-6..-1].hex.to_s
      modulus = OpenSSL::BN.new @key[0...-6].hex.to_s
      rsa_key.e = exponent
      rsa_key.n = modulus

      rsa_key.public_encrypt(str).unpack("H*").first.upcase
   end

   def random_string(length=64)
      chars = (('a'..'z').to_a + ('A'..'Z').to_a + (0..9).to_a).join('')
      str = ''
      length.times { str << chars[rand(chars.size)] }
      str
   end
   def send_sms(phone, sms_text)
      sms_text = Iconv.iconv("UTF-8","UTF-8",sms_text)[0]
      request = sprintf("M %s SIP-C/4.0\r\nF: %s\r\nI: 2\r\nQ: 1 M\r\nT: tel:%s\r\nN: SendSMS\r\nL: %s\r\n\r\n",@domain, @fetion_num, phone, sms_text.length)
      request = request + sms_text
      @SIPC.request(request)
   end

   def send_sms_to_self(sms_text)
      sms_text = Iconv.iconv("UTF-8","UTF-8",sms_text)[0]
      request = sprintf("M %s SIP-C/4.0\r\nF: %s\r\nI: 2\r\nQ: 1 M\r\nT: %s\r\nN: SendCatSMS\r\nL: %s\r\n\r\n",@domain, @fetion_num, @uri, sms_text.length)
      request = request + sms_text
      @SIPC.request(request)
   end

   def logout
      logout_request = sprintf("R %s SIP-C/4.0\r\nF: %s\r\nI: 1 \r\nQ: 3 R\r\nX: 0\r\n\r\n", @domain, @fetion_num)
      @SIPC.request(logout_request)
   end

   def get_system_config()
      uri = URI.parse("http://nav.fetion.com.cn/nav/getsystemconfig.aspx")
      http = Net::HTTP.new(uri.host, uri.port)
      params = sprintf('<config><user mobile-no="%s" /><client type="PC" version="%s" platform="W5.1" /><servers version="0" /><service-no version="0" /><parameters version="0" /><hints version="0" /><http-applications version="0" /><client-config version="0" /><services version="0" /><banners version="0" /></config>',@phone_num,"4.1.1160")
      headers = {
         'Content-Type' => 'application/x-www-form-urlencoded'
      }
      resp = http.post(uri.path, params, headers)
      puts "system_config: #{resp.body}"
      resp.body
   end

   def SSIAppSignIn(url)
      uri = URI.parse(url)
      path = "#{uri.path}?mobileno=#{@phone_num}&domains=#{@domain}%3bm161.com.cn%3bwww.ikuwa.cn&v4digest-type=1&v4digest=" + Digest::SHA1.hexdigest("fetion.com.cn:#{@password}")
      http = Net::HTTP.new(uri.host,uri.port)
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE # turn off SSL warning
      resp, xml = http.get(path, nil)
      puts "SSIAppSignIn: #{xml}"
      xml
   end

   def get_fetion_num(xml)
      doc = REXML::Document.new(xml)
      doc.elements.each("//results/user") do |element|
         @uri = element.attribute("uri").value
         @user_id = element.attribute("user-id").value
         @user_status = element.attribute("user-status").value
      end
      @uri.scan(/sip:([0-9]+)@/)[0][0]
   end

   def keep_alive(&callback)
      loop {
         cmd = sprintf("R fetion.com.cn SIP-C/4.0\r\nF: %s\r\nI: 1 \r\nQ: 1 R\r\nN: KeepAlive\r\n\r\n", @fetion_num)
         res = @SIPC.request(cmd)
         if block_given?
            yield res
         end
         sleep 5
      }
   end

end

class SIPC
   def initialize(sipc_addr)
      uri = sipc_addr.split(":")
      @socket = TCPSocket.new(uri[0], uri[1].to_i)
   end

   # send SIP request
   def request(sip_request)
      puts "req:\n#{sip_request}"
      @socket.write_nonblock(sip_request)
      IO.select [@socket]
      res = ""
      begin
         while chunk = @socket.read_nonblock(4096)
            res = res + chunk
         end
      rescue
         #puts "Error: #{$!}"
      end
      puts "res:\n#{res}"
      res
   end
end

#for test
if __FILE__ == $0
   fetion = Fetion.new "phone_num","xxoo"
   fetion.login
   #fetion.send_sms_to_self "test-ruby-fetion-中文"
   #fetion.send_sms "13651368727","any sms"
   fetion.keep_alive{|res|
      data = res.split(/\r\n\r\n/)
      if data[data.size - 2] && data[data.size - 2][0] == 'M'[0]
         puts "\n*********** Msg received :************\n#{data[data.size - 1]}"
      end
   }
   #fetion.logout
end