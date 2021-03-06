// code to run on server at startup
var MongoClient = require('mongodb').MongoClient;
var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var kue        = require('kue');
var cluster    = require('cluster');
var clusterWorkerSize = require('os').cpus().length;
var MongoOplog = require('mongo-oplog');
//var pushnotification = 
require('./3_pushnotification_trigger.js');
//var initPushServer = 
require('./pushserver_init.js');//.initPushServer;
//var getJSONObj = 
require('./utils.js');//.getJSONObj;
//var isArray = 
require('./utils.js');//.isArray;
require('./formatLog.js');

var SERVER_PORT = process.env.SERVER_PORT || 80;
var kuequeue;
var QUEUE_SIZE = 20;
var prefix = process.env.PREFIX || '';
var redis_prefix = prefix+'workai_pushnotification_task';
var redis_prefix_us = prefix+'workai_pushnotification_task_us';
var DB_CONN_STR = process.env.MONGO_URL || 'mongodb://workAIAdmin:weo23biHUI@aidb.tiegushi.com:27017/workai?replicaSet=workaioplog&readPreference=primaryPreferred&connectTimeoutMS=30000&socketTimeoutMS=30000&poolSize=20';
var MONGO_OPLOG = process.env.MONGO_OPLOG || 'mongodb://oplogger:J234sdfenvjfH@aidb.tiegushi.com:27017/local?authSource=admin';

var pushServer = initPushServer();
//pushServer.sendIOS('me', '9ce162f4beb26d45f4e91c7c83d57324a776a3fc3eaa81111e360ad0ae5e834c', 'aaa', 'aaa', 1);
//pushnotification(pushServer, {_id:'aaa'});

var totalRequestCount = 0;
var totalRedisTaskCount = 0;
var oplog = null;
var pushmessages = null;
var oplog_connect=function(db){
  if(oplog){
    oplog.destroy(function(){
      console.log('oplog destroy');
      oplog = null;
    });
  }

  oplog = MongoOplog(MONGO_OPLOG, {ns: 'workai.pushmessages'}).tail();
  oplog.on('insert', function (data) {
    console.log('pushmessages insert data:', data.o._id);
    if(data.o.pushMessage && data.o.pushMessage.length > 0){
      data.o.pushMessage.forEach(function(item, index) {
        if (!item.eventType || !item.doc || !item.userId) {
          console.log("   Push information from DB error: item="+JSON.stringify(item));
          return;
        }
        var fromserver = item.fromserver || '';
        var eventType = item.eventType || '';
        var doc = item.doc || '';
        var userId = item.userId || '';
        if (process.env.SERVER_IN_US) {
            console.log("   create task for US: "+index);
            //job = createTaskToKueQueue(redis_prefix_us, dbRecord._id, fromserver, eventType, doc, userId);
            job = createTaskToKueQueue(redis_prefix_us, data.o._id, item);
        } else {
            console.log("   create task for CN: "+index);
            //job = createTaskToKueQueue(redis_prefix, dbRecord._id, fromserver, eventType, doc, userId);
            job = createTaskToKueQueue(redis_prefix, data.o._id, item);
        }
      });
    }
    if(!pushmessages)
      pushmessages = db.collection('pushmessages');
    pushmessages.remove({_id: data.o._id});
  });
};
var sendHisPushMessage = function(db){
  if(!pushmessages)
    pushmessages = db.collection('pushmessages');

  var expireTime = new Date((new Date()).getTime() - 1000*60*60*2) //2小时;
  pushmessages.remove({createAt: {$lt: expireTime}});
  pushmessages.find({createAt: {$$gte: expireTime}}).toArray(function(err, docs) {
    if(err)
      return;

    docs.forEach(function(doc) {
      if(doc.pushMessage && doc.pushMessage.length > 0){
        doc.pushMessage.forEach(function(item, index) {
          if (!item.eventType || !item.doc || !item.userId) {
            console.log("   Push information from DB error: item="+JSON.stringify(item));
            return;
          }
          var fromserver = item.fromserver || '';
          var eventType = item.eventType || '';
          var doc = item.doc || '';
          var userId = item.userId || '';
          if (process.env.SERVER_IN_US) {
              console.log("   create task for US: "+index);
              //job = createTaskToKueQueue(redis_prefix_us, dbRecord._id, fromserver, eventType, doc, userId);
              job = createTaskToKueQueue(redis_prefix_us, doc._id, item);
          } else {
              console.log("   create task for CN: "+index);
              //job = createTaskToKueQueue(redis_prefix, dbRecord._id, fromserver, eventType, doc, userId);
              job = createTaskToKueQueue(redis_prefix, doc._id, item);
          }
        });
      }
      pushmessages.remove({_id: doc._id});
    });
  });
};

if (cluster.isMaster) {
  MongoClient.connect(DB_CONN_STR, {poolSize:20, reconnectTries:Infinity}, function(err, db) {
      if (err) {
          console.log('Error:' + err);
          return;
      }
      db.on('reconnect',   function(){
          console.log('MongoClient.connect reconnect')
          oplog_connect(db);
      });
      oplog_connect(db);
      sendHisPushMessage(db);
  });
}

function abornalDispose() {
    /*kuequeue.on('job enqueue', function(id, type){
      if (cluster.isMaster) {
        console.log('Master: Job %s got queued of type %s', id, type );
      } else {
        console.log('Slaver: Job %s got queued of type %s', id, type );
      }
    }).on('job complete', function(id, result){
        kue.Job.get(id, function(err, job){
        if (err) return;
            job.remove(function(err){
              if (err) throw err;
              if (cluster.isMaster) {
                console.log('Master: removed completed job #%d', job.id);
              } else {
                console.log('Slaver: removed completed job #%d', job.id);
              }
            });
        });
    });*/

    kuequeue.on('error', function(err) {
        if (cluster.isMaster) {
            console.log('Master: Oops... ', err);
        } else {
            console.log('Slaver: Oops... ', err);
        }
        //restartKueService();
    });

    kuequeue.watchStuckJobs(30*1000);

    kuequeue.inactiveCount(function(err, total){ // others are activeCount, completeCount, failedCount, delayedCount
        if (total > 100000) {
            console.log( 'We need some back pressure here' );
        }
    });
    kuequeue.failedCount('my-critical-job', function(err, total) {
        if (total > 10000) {
            console.log( 'This is tOoOo bad' );
        }
    });

    /*queue.process('my-error-prone-task', function(job, done){
        var domain = require('domain').create();
        domain.on('error', function(err){
            if (cluster.isMaster) {
                console.log('Master: domain on error');
            } else {
                console.log('Slaver: domain on error');
            }
            done(err);
        });
        domain.run(function(){ // your process function
            if (cluster.isMaster) {
              throw new Error('Master: bad things happen');
            } else {
              throw new Error('Slaver: bad things happen');
            }
            done();
        });
    });*/
}

function setKueProcessCallback() {
    function process_callback(job, done){
        function isObject(obj){ 
            return (typeof obj=='object')&&obj.constructor==Object; 
        } 
        console.log('------- Start --------');
        console.log('worker', cluster.worker.id, 'queue.process', job.data);
        var data = job.data;
        var _id = data._id;
        var itemObj = data.itemObj;
        /*var fromserver = itemObj.fromserver;
        var eventType = itemObj.eventType;
        var doc = itemObj.doc;
        var userId = itemObj.userId;
        var content = itemObj.content; 
        var extras = itemObj.extras;
        var toUserId = itemObj.toUserId;
        var toUserToken = itemObj.toUserToken;
        try {
            doc = JSON.parse(doc);
        } catch (error) {
            console.log("JSON.parse(doc) failed! doc="+doc);
            return -1;
        }*/

        if (!isObject(itemObj)) {
            console.log("itemObj is invalid, itemObj="+itemObj);
            done();
            return;
        }
        setTimeout(function() {
            try {
                pushnotification(pushServer, itemObj);
                job.progress(100, 100, JSON.stringify({'result': 'success'}));
                done();
            } catch (error) {
                console.log("Exception: in setKueProcessCallback, error="+error);
                console.log("Exception: in setKueProcessCallback, job.data="+JSON.stringify(job.data));
                done(new Error('failed'));
            }
        }, 0);
    }

    if (!process.env.SERVER_IN_US) {
        console.log("cluster Slaver: CN");
        kuequeue.process(redis_prefix, QUEUE_SIZE, process_callback);
    } else {
        console.log("cluster Slaver: US");
        kuequeue.process(redis_prefix_us, QUEUE_SIZE, process_callback);
    }
}

function startKueService() {
    var redis_server_url;
    if (process.env.SERVER_IN_US) {
        redis_server_url = 'usurlanalyser.tiegushi.com';
    } else {
        redis_server_url = 'urlanalyser.tiegushi.com';
    }
    kuequeue = kue.createQueue({
             //prefix: redis_prefix,
             redis: {
                 port: 6379,
                 host: redis_server_url,
                 auth: 'uwAL539mUJ'
             }});
    if (cluster.isMaster) {
        console.log("!!!!!!!!!! startKueService: Master...");
    } else {
        console.log("!!!!!!!!!! startKueService: Slaver...");
        setKueProcessCallback();
    }
}

//function createTaskToKueQueue(prefix, _id, fromserver, eventType, doc, userId) {
function createTaskToKueQueue(prefix, _id, itemObj) {
    var job = kuequeue.create(prefix, {
      id: _id,
      itemObj:itemObj
      //fromserver: fromserver,
      //eventType: eventType,
      //doc: doc, //JSON.stringify(doc),
      //userId: userId
    }).priority('critical').removeOnComplete(true).save(function(err){
      if (!err) {
        console.log("   job.id = "+job.id+", _id="+_id);
      }
      console.log(']');
    });
    return job;
}
function initMqttReporter(){
    var mqtt    = require('mqtt');
    var mqttOptions = {
        keepalive:30,
        reconnectPeriod:20*1000
    }

    var client  = mqtt.connect('ws://tmq.tiegushi.com:80',mqttOptions);
    client.on('connect' ,function () {
        console.log('Connected to server')
    })

    var statusRecordInfo = null;
    updateSucc = function(){
        statusRecordInfo.succ++;
    }
    function initStatusRecord(){
        statusRecordInfo = {
            service: process.env.SERVICE_NAME ? process.env.SERVICE_NAME:'pushServer',
            production: process.env.PRODUCTION ? true:false,
            serviceIndex: process.env.SERVICE_INDEX ? process.env.SERVICE_INDEX:0,
            succ: 0,
            detail:{}
        }
    }
    function reportStatusToMQTTBroker(){
        client.publish('status/service', JSON.stringify(statusRecordInfo),{qos:1});
        initStatusRecord();
    }
    initStatusRecord();
    setInterval(reportStatusToMQTTBroker,30*1000);
}
if (cluster.isMaster) {
    console.log("clusterWorkerSize="+clusterWorkerSize);
    for (var i = 0; i < clusterWorkerSize; i++) {
        cluster.fork();
        console.log("cluster master fork: i="+i);
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.id + ' died..');
        cluster.fork();
    });
    cluster.on('disconnect', function() {
        console.log('Frank Worker disconnect..');
    });
    cluster.on('message', function(message) {
        console.log('master message form worker:', message);
    });

    if (process.env.isClient) {
        console.log("Master: work only for slaver mode.");
        return;
    } else {
        console.log("cluster work both for Master and slaver mode.");
    }

    var router = express.Router();
        router.get('/', function(req, res) {
        res.json({ message: 'hooray! welcome to our api!' });
    });

    router.route('/:_id')
        .post(function(req, res) {
            var job;

            totalRequestCount++;
            if (!req.query) {
                console.log("pushnotification: req.query is null, ignore this request.");
                return -1;
            }
            console.log('[');
            console.log('   req.params=' + JSON.stringify(req.params));
            console.log('   req.query=' + JSON.stringify(req.query));

            res.on('error', function(err){
                res.isResErr = true;
            });

            getJSONObj(req, res, function(error, dataArray){
                if (error || !dataArray || dataArray == '') {
                    console.log("   pushnotification: Get JSON Object failed! error="+error);
                    res.end(JSON.stringify({result: 'failed'}));
                    return -1;
                }
                if (!isArray(dataArray)) {
                    console.log("   pushnotification: received data is not an array! dataArray="+JSON.stringify(dataArray));
                    return -1;
                }
                dataArray.forEach(function(item, index) {
                    /*var fromserver = item.fromserver || '';
                    var eventType = item.eventType || '';
                    var doc = item.doc || '';
                    var userId = item.userId || '';

                    if (!item.eventType || !item.doc || !item.userId) {
                        console.log("   Push information error: item="+JSON.stringify(item));
                        return;
                    }*/
                    console.log("   index "+index+": "+JSON.stringify(item));
                    totalRedisTaskCount++;
                    console.log("totalRequestCount="+totalRequestCount);
                    console.log("totalRedisTaskCount="+totalRedisTaskCount);
                    if (process.env.SERVER_IN_US) {
                        console.log("   create task for US: "+index);
                        //job = createTaskToKueQueue(redis_prefix_us, req.params._id, fromserver, eventType, doc, userId);
                        job = createTaskToKueQueue(redis_prefix_us, req.params._id, item);
                    } else {
                        console.log("   create task for CN: "+index);
                        //job = createTaskToKueQueue(redis_prefix, req.params._id, fromserver, eventType, doc, userId);
                        job = createTaskToKueQueue(redis_prefix, req.params._id, item);
                    }
                    res.end(JSON.stringify({status:'success'}));

                    job.on('enqueue', function(id, type) {
                        console.log('Job '+id+'('+job.id+') got queued of type '+type); 
                    }).on('complete', function(result){
                        console.log('Job '+job.id+' completed with data '+result);
                    }).on('failed attempt', function(errorMessage, doneAttempts){
                        console.log('Job '+job.id+' attempt failed');
                        //res.end(JSON.stringify({status:'failed'}));
                    }).on('failed', function(errorMessage){
                        console.log('Job '+job.id+' failed');
                        //res.end(JSON.stringify({status:'failed'}));
                    }).on('progress', function(progress, data){
                        console.log('job #' + job.id + ' ' + progress + '% complete with data ', data);
                        if(res.isResErr === true) {
                            console.log("res error! Abort...");
                            return -1;
                        }
                        if (progress == 100) {
                            //writeRes(res, data, true);
                            //res.end(JSON.stringify(data));
                        }
                    });
                });
            });
        });
    initMqttReporter();
    startKueService();
    abornalDispose();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use('/pushnotification', router);
    app.listen(SERVER_PORT);
    console.log('Magic happens on port ' + SERVER_PORT);
} else {
    startKueService();
    abornalDispose();
}
