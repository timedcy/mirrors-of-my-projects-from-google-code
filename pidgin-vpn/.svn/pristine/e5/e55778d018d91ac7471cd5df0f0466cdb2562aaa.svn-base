#!/usr/bin/python
# -*- coding: utf-8 -*-
#Using GPL v2
#Author: newdongyuwei@gmail.com
#Version:0.1

import commands, dbus, gobject
from dbus.mainloop.glib import DBusGMainLoop

#trusted_buddies should not hurt your computer
trusted_buddy_list = ["newdongyuwei@gmail.com"]

def recieve(account, sender, message, conversation, flags):
        print str(sender)
        print message
        if trusted_buddy_list.__contains__(str(sender).split("/")[0]):
                # extract python code in <%  %> .Pleace pay attention to python's indent.
                message = message.strip()
                raw_mark = True
                start = message.find("<%")
                end = message.find("%>")
                if start == -1:
                        start = message.find("&lt;%")
                        raw_mark = False
                if end == -1:
                        end = message.find("%&gt;")
                        
                if message and start!=-1 and end!=-1:
                        bus = dbus.SessionBus()
                        obj = bus.get_object("im.pidgin.purple.PurpleService",
                        "/im/pidgin/purple/PurpleObject")
                        purple = dbus.Interface(obj,"im.pidgin.purple.PurpleInterface")
                        account_id = purple.PurpleAccountsGetAllActive()[0]
                        conversation = purple.PurpleConversationNew(1, account_id, sender)
                        im = purple.PurpleConvIm(conversation)
                        content = ""
                        if raw_mark:
                                content = message[start + 2 : end]
                        else:
                                content = message[start + 5 : end]
                        content = content.replace("&apos;","'").replace("&quot;",'"')
                        print content
                        open("pidgin_dbus_temp.py","w").write(content)
                        #feedback = os.popen('python pidgin_dbus_temp.py').read()
                        status, feedback = commands.getstatusoutput('python pidgin_dbus_temp.py')
                        print status, feedback
                        purple.PurpleConvImSend(im, str(feedback))

DBusGMainLoop(set_as_default=True)
bus = dbus.SessionBus()
bus.add_signal_receiver(recieve,
        dbus_interface="im.pidgin.purple.PurpleInterface",
        signal_name="ReceivedImMsg")

loop = gobject.MainLoop()
loop.run()
