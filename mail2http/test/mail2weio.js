(function() {
  var weibo = require('weibo'), 
  uuid = require('node-uuid'), 
  connect = require('connect'),
  console = require('console'), 
  tapi = weibo.tapi, 
  redis = require("redis"),
  client = redis.createClient();
  client.on("error", function (err) {
    console.error("Error " + err);
  });

  weibo.init('weibo', '1869125062', 'd128d7a473c7a06ba0b84284a24c7924');

  var app = connect(connect.query(), connect.cookieParser(), connect.session({
    secret : uuid.v4()
  }),
  weibo.oauth({
    login_path : '/login',
    logout_path : '/logout',
    blogtype_field : 'type'
  }), connect.errorHandler({
    stack : true,
    dump : true
  }));

  app.use('/', function(req, res, next) {
    var user = req.session.oauthUser;
    res.writeHeader(200, {
      'Content-Type' : 'text/html'
    });
    if(!user) {
      res.end('<a href="/login?type=weibo">Login</a> first, please.');
      return;
    }

    if(client.connected){
      client.set(user.screen_name,JSON.stringify({'token' : user.oauth_token_key , 'secret': user.oauth_token_secret}),function(){
        
      });

      process.nextTick(function(){
          client.get(user.screen_name,function(){
            var data = JSON.parse(arguments[1]);
            console.log(data);
            var authedUser = {
              blogtype : 'tsina',
              blogType : 'tsina',
              authtype : 'oauth',
              oauth_token_key : data.token,
              oauth_token_secret : data.secret
            };
            tapi.verify_credentials(authedUser, function(error, t_user) {
              if(error)
                console.log('err:' + JSON.stringify(error));
              else {
                console.log('user:' + JSON.stringify(t_user));
              }
            });

            /*
             //tapi update has a bug(fixed): https://github.com/fengmk2/node-weibo/issues/8
             tapi.update({ user:authedUser, status : '这个bug很恶心'},function(err,data){
             if(err){
              console.log('err:'+JSON.stringify(err));
             }else {
              console.log('update:'+JSON.stringify(data));
             }
             });

             tapi.upload({
              user : authedUser,
              status : 'update api bug fixed'
            }, './face.jpeg', function(err, data) {
              if(err) {
                console.log('err:' + JSON.stringify(err));
              } else {
                console.log('img uploaded :' + data.t_url);
              }
            });
             */
          });
      });
    }
    res.end('login ok');
    //res.end('Hello, <a href="' + user.t_url + '" target="_blank">@' + user.screen_name + '</a>. ' + '<a href="/logout">Logout</a>');
  });

  app.listen(8080);
})();
