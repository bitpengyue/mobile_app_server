/**
 * Created by simba on 5/2/17.
 */

const { Wechaty } = require('wechaty')
var DDP = require('ddp');
var login = require('ddp-login');
var async = require('async');
var mqtt = require('mqtt');

var Datastore = require('nedb')
    , db = new Datastore({ filename: 'wechatbot.db', autoload: true });

var testNeo4J = require('./test_neo4j');
var mqttOptions = {
    keepalive:30,
    reconnectPeriod:20*1000
}
var mqttClient  = mqtt.connect('ws://tmq.tiegushi.com:80',mqttOptions);
mqttClient.on('connect' ,function () {
    console.log('Connected to mqtt server')
    mqttClient.subscribe('status/service',{qos:1})
})
mqttClient.on('message' ,function (topic,message) {
    console.log(topic+': '+message);
    if(topic === 'status/service' ){
        var json = JSON.parse(message);
        if(json.service && typeof json.serviceIndex !== 'undefined') {
            var isProd = !!json.production;
            db.update({
                service: json.service,
                serviceIndex: json.serviceIndex,
                isProd: isProd
            }, {
                $set: {by: new Date().getTime()}
            }, {upsert: true}, function (err, doc) {
                console.log(err)
                console.log(doc)
                // A new document { _id: 'id5', planet: 'Pluton', distance: 38 } has been added to the collection
            });
        }
    }
})
var switchAccount = require('./switch-account');

var host = "host1.tiegushi.com";
var port = 80;

var ddpClient = new DDP({
    host: host,
    port: port
});

var token = null;
var loginUser = null;
var baseLogin = function(callback){
    login(ddpClient, {
        env: 'METEOR_TOKEN',
        method: 'account',
        account: 'monitor@163.com',
        pass: 'qwezxc',
        retry: 1,
        plaintext: false
    }, function(error, userInfo){
        if (!error){
            token = userInfo.token;
            loginUser = userInfo;
        } else {
            token = null;
            loginUser = null;
        }
        console.log('login user:', userInfo);
        callback && callback(error, userInfo)
    });
};
var ddpLogin = function(callback){
    if (token)
        return login.loginWithToken(ddpClient, token, function (error, userInfo) {
            if (error) {return baseLogin(callback);}
            callback && callback(error, userInfo)
        });
    baseLogin(callback);
};

function testLogin(callback){
    var begin = new Date()
    ddpClient.connect(function (err) {
        if (err) {
            //reportToWechatRoomAlertALL('机器人助理 无法通过DDP连接到服务器 '+host+':'+port);
            try{
                ddpClient.close()
            } catch(e){
            }
            try {
                callback('机器人助理 无法通过DDP连接到服务器 '+host+':'+port)
            } catch(e){
            }
            return
        }


        ddpLogin(function(error, userInfo){
            if (error) {
                //reportToWechatRoomAlertALL('机器人助理 登陆故事贴失败')
                ddpClient.close()
                try{
                    callback('无法通过DDP登陆故事贴')
                } catch (e){
                }
                return
            } else {
                // We are now logged in, with userInfo.token as our session auth token.
                // token = userInfo.token;
                var timeDiff = new Date() - begin
                // reportToWechatRoom('机器人助理 成功登陆故事贴,耗时'+timeDiff+'ms')
                // ddpClient.close()
                try{
                    callback(null,'成功登陆('+timeDiff+'ms)')
                } catch (e){
                }
                return
            }
        });

        // login(ddpClient,
        //     {  // Options below are the defaults
        //         env: 'METEOR_TOKEN',  // Name of an environment variable to check for a
        //                               // token. If a token is found and is good,
        //                               // authentication will require no user interaction.
        //         method: 'account',    // Login method: account, email, username or token
        //         account: 'monitor@163.com',        // Prompt for account info by default
        //         pass: 'qwezxc',           // Prompt for password by default
        //         retry: 1,             // Number of login attempts to make
        //         plaintext: false      // Do not fallback to plaintext password compatibility
        //                               // for older non-bcrypt accounts
        //     },
        //     function (error, userInfo) {
        //         if (error) {
        //             reportToWechatRoomAlertALL('机器人助理 登陆故事贴失败')
        //             ddpClient.close()
        //             try{
        //                 callback('Error')
        //             } catch (e){

        //             }
        //             return
        //         } else {
        //             // We are now logged in, with userInfo.token as our session auth token.
        //             token = userInfo.token;
        //             var timeDiff = new Date() - begin
        //             reportToWechatRoom('机器人助理 成功登陆故事贴,耗时'+timeDiff+'ms')
        //             // ddpClient.close()
        //             try{
        //                 callback(null,'Success')
        //             } catch (e){
        //             }
        //             return
        //         }
        //     }
        // );
    });
}

function testSubscribeShowPost(callback){
    var begin = new Date()
    ddpClient.subscribe(
        'postInfoById',                  // name of Meteor Publish function to subscribe to 
        ['WrnSqg89a3r4nPwXr'],                       // any parameters used by the Publish function 
        function (error) {
            if (error) {
                //reportToWechatRoomAlertALL('获取一篇帖子数据  失败！')
                reportToWechatRoomAlertALL(error)
                ddpClient.unsubscribe('WrnSqg89a3r4nPwXr')
                ddpClient.close()
                try{
                    callback('无法通过DDP获取帖子数据')
                } catch (e){

                }
                return
            } else {
                console.log('posts complete:');
                console.log(ddpClient.collections.posts);
                var timeDiff = new Date() - begin
                //reportToWechatRoom('成功获取一篇帖子数据,  耗时'+timeDiff+'ms')
                ddpClient.unsubscribe('WrnSqg89a3r4nPwXr')
                ddpClient.close()
                try{
                    callback(null,'帖子数据('+timeDiff+'ms)')
                } catch (e){
                }
                return
            }
        }
    );
}

function getProductionServerOnlineStatus(callback){
    var begin = new Date().getTime() - 60*1000;
    db.count({ isProd: true }, function (err, prodServer) {
        db.count( {$and:[{isProd: true},{by :{$gt:begin}}]}, function (err,prodServerOnline) {
            if(prodServerOnline < prodServer){
                db.find( {$and:[{isProd: true},{by :{$lt:begin}}]}, function (err,docs) {
                    var serverLists = []
                    for(var i=0;i<docs.length;i++){
                        serverLists.push(docs[i].service+'['+docs[i].serviceIndex+']')
                    }
                    callback(serverLists.toString()+'不在线或异常，请检查')
                })
                return
            }
            db.count({ isProd: false }, function (err, testServer) {
                db.count( {$and:[{isProd: false},{by :{$gt:begin}}]}, function (err,testServerOnline) {

                    if(testServerOnline < testServer){
                        db.find( {$and:[{isProd: false},{by :{$lt:begin}}]}, function (err,docs) {
                            var serverLists = []
                            for(var i=0;i<docs.length;i++){
                                serverLists.push(docs[i].service+'['+docs[i].serviceIndex+']')
                            }
                            console.log(serverLists.toString()+'不在线或不在调试')
                        })
                    }
                    try{
                        var msg = '['+prodServerOnline+'/' +prodServer+']产品服务器在线,['+testServerOnline+'/' +testServer+']本地服务器在线'
                        callback(null,msg)
                    } catch (e){
                    }
                });
            });
        });
    });
}
function reportHowManyProductionServerIsBeingMonitored(){
    db.find({isProd: true}, function (err,docs) {
        var serverLists = []
        if(docs.length>0){
            for(var i=0;i<docs.length;i++){
                serverLists.push(docs[i].service+'['+docs[i].serviceIndex+']')
            }
            var msg = '正在监控'+serverLists.length+'台产品服务器('+serverLists.toString()+')'
            console.log(msg)
            reportToWechatRoom(msg)
        } else {
            console.log('未能成功监测产品服务器')
            reportToWechatRoom('未能成功监测产品服务器')
        }
    })
function testSwitchAccount(callback){
    var begin = new Date();

    if (!loginUser.id)
        return;
        
    switchAccount(ddpClient, loginUser.id, 'mdaRAZBL73d8KsQP7', function(err){
        if (err){
            ddpClient.close();
            //reportToWechatRoomAlertALL('！');
            //reportToWechatRoomAlertALL(error);
            try{callback && callback('切换帐号  失败');}catch(e){}
        } else {
            var timeDiff = new Date() - begin;
            //reportToWechatRoom('切换帐号,  耗时'+timeDiff+'ms');
            try{callback && callback(null,'切换帐号('+timeDiff+'ms)');}catch(e){}
        }
    });
}

var globalRoom = null
var reportToWechatRoom = function(string){
    if(string && globalRoom){
        globalRoom.say(string)
    }
}
var reportToWechatRoomAlertALL = function(string){
    if(string && globalRoom){
        globalRoom.say(string,globalRoom.memberList())
    }
}
wechatInstance = Wechaty.instance() // Singleton

wechatInstance.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
wechatInstance.on('login',       user => console.log(`User ${user} logined`))
wechatInstance.on('message', function(message){
    if(!globalRoom){
        var room = message.room()
        if(room && room.topic()==='故事贴监控群'){
            globalRoom = room;
            globalRoom.say('机器人助理 加入监控群，每次重启 机器人助理 后，需要任意人在监控群中发言激活功能')

            intervalTask()
            reportHowManyProductionServerIsBeingMonitored()
            console.log(room)
        }
    }
    console.log(`Message: ${message}`)
})
wechatInstance.init()

taskList = [testLogin,testSubscribeShowPost,testSwitchAccount,testNeo4J,getProductionServerOnlineStatus]

var intervalTask = function(){
    async.series(taskList,function(err,results){
        if(!err){
            console.log(err)
            var msg = '['+ results.length + '/'+ taskList.length + '] 检查通过,详情:' + results.toString()
            reportToWechatRoom(msg)
            console.log(msg)
        } else {
            console.log('失败：'+err)
            reportToWechatRoomAlertALL(err)
        }
    })
}
setInterval(intervalTask, 1*60*1000)
setInterval(reportHowManyProductionServerIsBeingMonitored,15*60*100)

intervalTask()
reportHowManyProductionServerIsBeingMonitored()