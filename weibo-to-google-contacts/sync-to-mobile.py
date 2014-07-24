#!/usr/bin/env python
# -*- coding: utf-8 -*-
#sync contacts of SINA WeiBo to Google contacts,then U can sync all contacts to your Mobile using *Google Sync* client.
#see: http://code.google.com/apis/contacts/docs/3.0/developers_guide_python.html && http://www.google.com/mobile/sync/
#by newdongyuwei@gmail.com | yuwei@staff

import atom
import gdata.contacts
import gdata.contacts.service
import csv

class WeiBoContacts():
    def __init__(self,email,password,csv_file):
        self.email = email
        self.password = password
        self.csv = csv_file

    def login(self):
        print "login,please wait..."
        client = gdata.contacts.service.ContactsService()
        client.email = self.email
        client.password = self.password
        client.source = ''
        client.ProgrammaticLogin()
        self.client = client
        return self

    def add_contact(self,group_entry,name,extension_number='',mobile='',email='',msn='',weibo_nick='',weibo_uri=''):
        notes = "name:%s\nmobile:%s\nextension_number:%s\nemail:%s\nmsn:%s\nweibo_nick:%s\nweibo_uri:%s" % (name.decode('utf8'),mobile,extension_number,email,msn,weibo_nick.decode('utf8'),weibo_uri)
        print notes
        new_contact = gdata.contacts.ContactEntry(title=atom.Title(text=name))
        new_contact.phone_number.append(gdata.contacts.PhoneNumber(rel=gdata.contacts.PHONE_MOBILE, text=mobile))
        new_contact.phone_number.append(gdata.contacts.PhoneNumber(rel=gdata.contacts.PHONE_WORK, text=extension_number))
        new_contact.email.append(gdata.contacts.Email(address=email+"@staff.sina.com.cn",primary='true', rel=gdata.contacts.REL_WORK))
        new_contact.email.append(gdata.contacts.Email(address=msn,rel=gdata.contacts.REL_WORK))
        new_contact.extended_property.append(gdata.ExtendedProperty(name='微博昵称'.decode('utf8'), value=weibo_nick))
        new_contact.extended_property.append(gdata.ExtendedProperty(name='微博域名'.decode('utf8'), value=weibo_uri))
        new_contact.content = atom.Content(text=notes)
        contact_entry = self.client.CreateContact(new_contact)
        contact_entry.group_membership_info.append(gdata.contacts.GroupMembershipInfo(href=group_entry.id.text))
        self.client.UpdateContact(contact_entry.GetEditLink().href, contact_entry)

    def parse_csv(self):
        contacts = csv.reader(open(self.csv, "r"))
        contact_list = []
        for data in contacts:
            contact_list.append(data)
        self.contact_list = contact_list[2:]
        return self

    def add_contacts(self):
        group_entry = self.client.CreateGroup(gdata.contacts.GroupEntry(title=atom.Title(text='weibo')))
        for data in self.contact_list:
            try:
                self.add_contact(group_entry,data[2],data[3],data[4],data[5],data[6],data[7],data[8])#部门||姓名|分机|手机|邮箱|MSN|微博昵称|微博域名
            except Exception as err:
                print 'Error:',err

if __name__ == "__main__":
    import sys
    if sys.argv.__len__() != 4 :
        print " ".join(["usage:","python %s" % (sys.argv[0]), "your_account@gmail.com","your_password",".csv file of weibo contacts"])
    else:
        #weibo_contacts = WeiBoContacts('xxxx@gmail.com','password','contacts.csv')
        weibo_contacts = WeiBoContacts(sys.argv[1],sys.argv[2],sys.argv[3])
        weibo_contacts.login().parse_csv().add_contacts()
        
