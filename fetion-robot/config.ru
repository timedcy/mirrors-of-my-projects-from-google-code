$:.unshift '.' 
ENV['RACK_ENV'] = "production"
require 'rubygems'
require 'fetion_robot'

run Sinatra::Application
