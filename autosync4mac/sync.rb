#author newdongyuwei@gmail.com

require 'rubygems'
require 'fsevents'
require 'net/scp'
require 'ruby-growl'if RUBY_PLATFORM.downcase.include?("darwin") #only macruby implemented growl lib supports click callback

$host = "10.210.74.63"
$username = "my name"
$password = "my password"
$_scp_ = Net::SCP.start($host, $username, :password => $password) # reuse the connection

source_dir = '/Users/yuwei/workspace/miniblog'
target_dir = '/data1/wwwroot/js.wcdn.cn/dev_js/miniblog'

def upload(source, target,recursive)
  begin
    $_scp_.upload!(source, target,:recursive => recursive)
    p "#{source} modified,synced to server !"
  rescue 
    $_scp_ = Net::SCP.start($host, $username, :password => $password)
    $_scp_.upload!(source, target,:recursive => recursive)
    p "#{source} modified,synced to server !"
  end

  begin
   #config growl listen to network connection
    if Object.const_defined? :Growl
      g = Growl.new "127.0.0.1", "ruby-growl", ["ruby-growl Notification"]
      g.notify "ruby-growl Notification", "File sync", "#{source} modified,synced to server !"
    end
  rescue
    p $!
  end
end

if File.exist?('.lock4autosyn')
  p 'sync process is already running!This process will exit.'
  exit
end

File.open('.lock4autosyn','w').close

Kernel.at_exit do
  p 'will delete lock file,exit.'
  File.delete('.lock4autosyn')
  if Object.const_defined? :Growl
      g = Growl.new "127.0.0.1", "ruby-growl", ["ruby-growl Notification"]
      g.notify "ruby-growl Notification", "error", "sync process exited !"
  end
end

stream = FSEvents::Stream.watch(source_dir) do |events|
    events.each do |event|
        event.modified_files.each do|modified|
            if (File.directory? modified or File.file? modified) and modified.grep(/\.(git|svn|hg)/).length == 0 #ignore .svn .hg .git
                upload(modified, target_dir + modified.split(source_dir)[1],File.directory?(modified) )
            end
        end
    end
end
stream.run
