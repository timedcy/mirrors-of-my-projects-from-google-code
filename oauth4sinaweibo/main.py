#!/usr/bin/env python

__author__ = "newdongyuwei@gmail.com"

import oauth4sina

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

class MainHandler(webapp.RequestHandler):
  def get(self, mode=""):
    application_key = "1349068952" 
    application_secret = "e13844dcb27a702b9c74d0d41ef583c5"  
    callback_url = "%s/verify" % self.request.host_url
    
    client = oauth4sina.SinaMiniBlogClient(application_key, application_secret, 
        callback_url)
    
    if mode == "login":
      return self.redirect(client.get_authorization_url())
      
    if mode == "verify":
      auth_token = self.request.get("oauth_token")
      auth_verifier = self.request.get("oauth_verifier")
      #user_info = client.get_user_info(auth_token, auth_verifier)
      #return self.response.out.write(user_info)
      res = client.update_status('test飞信机器人',auth_token,auth_verifier)
      return self.response.out.write(res)
    
    self.response.out.write("<a href='/login'>Login via sina miniblog</a>")

def main():
  application = webapp.WSGIApplication([('/(.*)', MainHandler)],debug=True)
  util.run_wsgi_app(application)

if __name__ == '__main__':
  main()
