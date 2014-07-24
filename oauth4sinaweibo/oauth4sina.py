#!/usr/bin/env python
#by newdongyuwei@gmail.com
"""
borrowed from Mike Knapp(https://github.com/mikeknapp/AppEngine-OAuth-Library) 
"""

from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext import db

from cgi import parse_qs
from django.utils import simplejson as json
from hashlib import sha1
from hmac import new as hmac
from random import getrandbits
from time import time
from urllib import urlencode
from urllib import quote as urlquote
from urllib import unquote as urlunquote

import logging

auth_secret = ''

class OAuthClient():
  def __init__(self, consumer_key, consumer_secret, request_url,
               access_url, callback_url=None):

    self.consumer_key = consumer_key
    self.consumer_secret = consumer_secret
    self.request_url = request_url
    self.access_url = access_url
    self.callback_url = callback_url
    
  def prepare_request(self, url, token="", secret="", additional_params=None,
                      method=urlfetch.GET):

    def encode(text):
      return urlquote(str(text), "")

    params = {
      "oauth_consumer_key": self.consumer_key,
      "oauth_signature_method": "HMAC-SHA1",
      "oauth_timestamp": str(int(time())),
      "oauth_nonce": str(getrandbits(64)),
      "oauth_version": "1.0"
    }

    if token:
      params["oauth_token"] = token
    elif self.callback_url:
      params["oauth_callback"] = self.callback_url

    if additional_params:
        params.update(additional_params)

    for k,v in params.items():
        if isinstance(v, unicode):
            params[k] = v.encode('utf8')

    params_str = "&".join(["%s=%s" % (encode(k), encode(params[k]))
                           for k in sorted(params)])

    message = "&".join(["GET" if method == urlfetch.GET else "POST",
                        encode(url), encode(params_str)])

    key = "%s&%s" % (self.consumer_secret, secret) 
    signature = hmac(key, message, sha1)
    digest_base64 = signature.digest().encode("base64").strip()
    params["oauth_signature"] = digest_base64
    return urlencode(params)
    
    
  def make_async_request(self, url, token="", secret="", additional_params=None,
                   protected=False, method=urlfetch.GET):
    payload = self.prepare_request(url, token, secret, additional_params,
                                   method)
    if method == urlfetch.GET:
        url = "%s?%s" % (url, payload)
        payload = None
    headers = {"Authorization": "OAuth"} if protected else {}
    rpc = urlfetch.create_rpc(deadline=10.0)
    urlfetch.make_fetch_call(rpc, url, method=method, headers=headers, payload=payload)
    return rpc

  def make_request(self, url, token="", secret="", additional_params=None,
                                      protected=False, method=urlfetch.GET):
    return self.make_async_request(url, token, secret, additional_params, protected, method).get_result()
  
  def get_authorization_url(self):
    raise NotImplementedError, "Must be implemented by a subclass"

  def get_user_info(self, auth_token, auth_verifier=""):
    auth_token = urlunquote(auth_token)
    auth_verifier = urlunquote(auth_verifier)
    global auth_secret
    response = self.make_request(self.access_url,
                                token=auth_token,
                                secret=auth_secret,
                                additional_params={"oauth_verifier":auth_verifier})

    result = self._extract_credentials(response)
    user_info = self._lookup_user_info(result["token"], result["secret"])
    user_info.update(result)
    return user_info

  def _get_auth_token(self):
    response = self.make_request(self.request_url)
    result = self._extract_credentials(response)
    auth_token = result["token"]
    global auth_secret
    auth_secret = result["secret"]
    return auth_token

  def _extract_credentials(self, result):
    token = None
    secret = None
    parsed_results = parse_qs(result.content)
    if "oauth_token" in parsed_results:
      token = parsed_results["oauth_token"][0]

    if "oauth_token_secret" in parsed_results:
      secret = parsed_results["oauth_token_secret"][0]

    if not (token and secret) or result.status_code != 200:
      logging.error("Could not extract token/secret: %s" % result.content)

    return {
      "token": token,
      "secret": secret
    }

  def _lookup_user_info(self, access_token, access_secret):
    raise NotImplementedError, "Must be implemented by a subclass"

class SinaMiniBlogClient(OAuthClient):
  def __init__(self, consumer_key, consumer_secret, callback_url):
    OAuthClient.__init__(self,
        consumer_key,
        consumer_secret,
        "http://api.t.sina.com.cn/oauth/request_token",
        "http://api.t.sina.com.cn/oauth/access_token",
        callback_url)

  def get_authorization_url(self):
    token = self._get_auth_token()
    return "http://api.t.sina.com.cn/oauth/authorize?oauth_token=%s" % token

  def update_status(self, status,auth_token,auth_verifier=""):
    auth_token = urlunquote(auth_token)
    auth_verifier = urlunquote(auth_verifier)
    global auth_secret
    response = self.make_request(self.access_url,
                                token=auth_token,
                                secret=auth_secret,
                                additional_params={"oauth_verifier":auth_verifier})

    result = self._extract_credentials(response)
    data = self._update_status(result["token"], result["secret"],status)
    return data
    
  def _update_status(self, access_token, access_secret,status):
    response = self.make_request(
    "http://api.t.sina.com.cn/statuses/update.json",
    token=access_token, secret=access_secret, additional_params={'status':urlquote(str(status), "")},protected=True,method=urlfetch.POST)
    data = json.loads(response.content)
    return data
      
  def _lookup_user_info(self, access_token, access_secret):
    response = self.make_request(
        "http://api.t.sina.com.cn/account/verify_credentials.json",
        token=access_token, secret=access_secret, protected=True)
    data = json.loads(response.content)
    return data
    
