require 'rubygems'
require 'eventmachine'
require 'mail'

module Handler
    @last = ''
    @content = ''
    def file_modified
        puts "#{path} modified"
        @content = File.read(path)  
        if @content != @last
            puts 'content changed:', @content
            ##
            EM.next_tick do
                mail = Mail.read('./ipad-mail.eml')
                puts 'subject',mail.subject 
                puts mail.multipart?          
                puts mail.parts.length  
                puts 'from',mail.from.to_s
                puts '---------------'
                mail.attachments and mail.attachments.each do | attachment |
                    if (attachment.content_type.start_with?('image/'))
                        filename = attachment.filename
                        puts filename
                        begin
                            File.open(filename, "w+b", 0644) {|f| f.write attachment.body.decoded}
                        rescue Exception => e
                            puts "Unable to save data for #{filename} because #{e.message}"
                        end
                    end
                end 
            end
            ##
        end
        @last = @content
    end
 end
 
EM.epoll
EM.run {   
   File.exists?("mail.eml") and EM.watch_file("mail.eml", Handler)
}
 

