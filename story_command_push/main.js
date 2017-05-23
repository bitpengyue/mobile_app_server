var MongoClient = require('mongodb').MongoClient;
var f = require('./lib/foreach.js')

var serverUrl = process.env.SERVER_URL || 'http://host1.tiegushi.com/';
var DB_CONN = process.env.MONGO_URL;
var db = null;
var postId = process.env.POST_ID;
var postTitle = process.env.POST_TITLE;
var postAuthor =  process.env.POST_AUTHOR;
var postCommandText = process.env.POST_COMMAND_TEXT;

function mqttPushNotificationInit() {
     MongoClient.connect(DB_CONN, {poolSize:20 , reconnectTries: Infinity}, function(err, mongodb){
      if (err) {
        console.log('Mongo connect Error:' + err);
      }
      console.log('Mongo connect');
      db = mongodb;
      db.on('timeout',     function(){console.log('MongoClient.connect timeout')});
      db.on('error',       function(){console.log('MongoClient.connect error')});
      db.on('close',       function(){console.log('MongoClient.connect close')});
      db.on('reconnect',   function(){
          console.log('MongoClient.connect reconnect')
      });
      sendNotification(db)
    });
}



function sendNotification(db, cb) {
  var usersdb = db.collection('users');
  var pushTokens = db.collection('pushTokens');
  var PushMessages = db.collection('pushmessages');

  usersdb.find({type:{$exists: true},token:{$exists: true}},{fields:{'type':1, 'token':1,'profile.waitReadCount':1}}).toArray(function(err,users){
    if (err) {
      console.log('Error:'+err)
      return cb && cb(err);
    }
    console.log('users count ====',users.length)
    users.forEach(function(user){
      if (user && user.type && user.token) {
        pushTokens.findOne({ type: user.type, token: user.token }, function (err, pushTokenObj) {
          if (err) {
            console.log('Error:' + err);
            return cb && cb(err);
          }
          if (!pushTokenObj || pushTokenObj.userId !== user._id) {
            return cb && cb('pushToken not found');
          }
          var content = '';
          var pushToken = {
            type: user.type,
            token: user.token
          };
          content = '故事贴小秘:';
          var commentText = '';
          var extras = {
            type: 'tiegushirecommend',
            postId: postId
          }
          var waitReadCount = (user.profile && user.profile.waitReadCount) ? user.profile.waitReadCount : 1;
          var tidyDoc = {
            _id: postId,
            postId: postId,
            postTitle: postTitle,
            ownerName: postAuthor,
            commentText: commentText
          };

          var dataObj = {
            fromserver: encodeURIComponent(serverUrl),
            eventType: 'tiegushirecommend',
            doc: tidyDoc,
            userId: 'AsK6G8FvBn525bgEC',
            content: content,
            extras: extras,
            toUserId: user._id,
            pushToken: pushToken,
            waitReadCount: waitReadCount
          }
          var dataArray = [];
          dataArray.push(dataObj);
          console.log(JSON.stringify(dataArray))
          // PushMessages.insert({pushMessage: dataArray, createAt: new Date()},function(err,result){
          //   if(err){
          //     console.log('Error:'+err);
          //     return cb && cb(err);
          //   } else {
          //     console.log(result)
          //     return cb && cb(null);
          //   }
          // })
        });
      }
      else {
        return cb && cb('toUser/type/token not found');
      }
    });
  });
}

mqttPushNotificationInit();