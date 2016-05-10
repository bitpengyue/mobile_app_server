/**
 * Created by simba on 5/6/16.
 */

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
//var url = 'mongodb://hotShareAdmin:aei_19056@host1.tiegushi.com:27017/hotShare';
var url = 'mongodb://localhost:27017/localdb';

var dbGraph = require("seraph")({ server: "http://localhost:7474",
    endpoint: "/db/data",
    user: "neo4j",
    pass: "123456" });
function check_user_existing(id,cb){
    if(id && id !='' && cb){
        dbGraph.find({userId: id}, 'User', function(err, results) {
            if (err) {
                // A Neo4j exception occurred
                cb(null);
                return;
            }
            // do something with the matched node(s).
            if(results && results.length > 0){
                console.log('Result is '+results)
                cb(results);
            } else {
                cb(null);
            }
        });
    }
}
function check_post_existing(id,cb){
    if(id && id !='' && cb){
        dbGraph.find({postId: id}, 'Post', function(err, results) {
            if (err) {
                // A Neo4j exception occurred
                cb(null);
                return;
            }
            // do something with the matched node(s).
            if(results && results.length > 0){
                console.log('Result is '+results)
                cb(results);
            } else {
                cb(null);
            }
        });
    }
}
function check_viewer_existing(id,cb){
    if(id && id !='' && cb){
        dbGraph.find({viewerId: id}, 'Viewer', function(err, results) {
            if (err) {
                // A Neo4j exception occurred
                cb(null);
                return;
            }
            // do something with the matched node(s).
            if(results && results.length > 0){
                console.log('Result is '+results)
                cb(results);
            } else {
                cb(null);
            }
        });
    }
}
function save_user_node(doc,cb){
    if (doc !== null) {
        check_user_existing(doc._id,function(result){
            if(result){
                console.log('Existing node');
                if(cb){
                    cb('Existing node')
                }
                return;
            }
            try{
                var userInfo={
                    userId:doc._id,
                    createdAt:doc.createdAt,
                    fullname: doc.profile.fullname,
                    device: doc.type,
                    sex: doc.profile.sex?doc.profile.sex:'',
                    lastLogonIP:doc.profile.lastLogonIP,
                    anonymous:doc.profile.anonymous?true:false,
                    browser:doc.profile.browser?true:false,
                    location:doc.profile.location
                }
                if(doc.services &&doc.services.weixin){
                    userInfo.wechatLogin = true
                } else {
                    userInfo.username = doc.username
                }
            } catch (e){
                if(cb){
                    cb('Cant Build userInfo')
                }
                return;
            }
            dbGraph.save(userInfo, function(err, nodeL) {
                if (err) {
                    console.log(err)
                    console.log(nodeL)
                    if(cb){
                        cb('Cant Save userInfo')
                    }
                    return;
                }
                dbGraph.label(nodeL, ['User'], function(err) {
                    if(cb){
                        cb()
                    }
                });
            });
        })
    }
}
function save_post_node(doc,cb){
    if (doc !== null) {
        check_post_existing(doc._id,function(result) {
            if (result) {
                console.log('Existing node');
                if(cb){
                    cb('Existing Node')
                }
                return;
            }
            try {
                var postInfo = {
                    postId: doc._id,
                    createdAt: doc.createdAt,
                    name: doc.title,
                    addonTitle: doc.addontitle,
                    ownerName: doc.ownerName,
                    ownerId: doc.owner
                }
            } catch (e) {
                if(cb){
                    cb('Cant build postInfo')
                }
                return
            }
            dbGraph.save(postInfo, function (err, nodeL) {
                if (err) {
                    console.log(err)
                    console.log(nodeL)
                    if(cb){
                        cb('Cant Save it')
                    }
                    return
                }
                dbGraph.label(nodeL, ['Post'], function (err) {
                    // `node` is now labelled with "Car" and "Hatchback"!
                    if(cb){
                        cb(null)
                    }
                });
            });
        })
    }
}
function save_viewer_node(doc,cb){
    if (doc !== null) {
        check_viewer_existing(doc._id,function(result){
            if (result) {
                console.log('Existing node');
                if(cb){
                    cb('Existing node');
                }
                return;
            }
            try{
                var viewerInfo={
                    postId:doc.postId,
                    createdAt:doc.createdAt,
                    viewerId:doc.userId,
                    anonymous:doc.anonymous?true:false
                }
            } catch (e) {
                if(cb){
                    cb('Cant Build ViewerInfo');
                }
                return
            }
            dbGraph.save(viewerInfo, function(err, nodeL) {
                if (err) {
                    console.log(err)
                    console.log(nodeL)
                    if(cb){
                        cb('Save Error');
                    }
                    return
                }
                dbGraph.label(nodeL, ['Viewer'], function(err) {
                    // `node` is now labelled with "Car" and "Hatchback"!
                    if(cb){
                        cb(null);
                    }
                });
            });
        })
    }
}
function grab_userInfo_in_hotshare(db){
    var cursor =db.collection('users').find({});//.limit(3000);
    function eachUserInfo(err,doc){
        if(doc ===null){
            return
        }
        if(!err){
            console.dir(doc)
            save_user_node(doc,function(){
                setTimeout(function(){
                    cursor.next(eachUserInfo)
                },0)
            })
        } else{
            console.log('Got error in db find '+err)
            setTimeout(function(){
                cursor.next(eachUserInfo)
            },0)
        }
    }
    cursor.next(eachUserInfo)
}
function grab_viewerInfo_in_hotshare(db){
    var cursor =db.collection('viewers').find({});//.limit(3000).sort({createdAt:-1});

    function eachViewersInfo(err,doc){
        if(doc ===null){
            return
        }
        if(!err){
            console.dir(doc)
            save_viewer_node(doc,function(){
                setTimeout(function(){
                    cursor.next(eachViewersInfo)
                },0)
            })
        } else{
            console.log('Got error in db find '+err)
            setTimeout(function(){
                cursor.next(eachViewersInfo)
            },0)
        }
    }
    cursor.next(eachViewersInfo)
}
function grab_postsInfo_in_hotshare(db){
    var cursor =db.collection('posts').find({},{fields:{
        title:true,
        addontitle:true,
        owner:true,
        _id:true,
        ownerName:true,
        createdAt:true
    }});//.limit(3000).sort({createdAt:-1});
    function eachPostsInfo(err,doc){
        if(doc ===null){
            return
        }
        if(!err){
            console.dir(doc)
            save_post_node(doc,function(){
                setTimeout(function(){
                    cursor.next(eachPostsInfo)
                },0)
            })
        } else{
            console.log('Got error in db find '+err)
            setTimeout(function(){
                cursor.next(eachPostsInfo)
            },0)
        }
    }
    cursor.next(eachPostsInfo)
}
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    grab_userInfo_in_hotshare(db);
    grab_postsInfo_in_hotshare(db);
    grab_viewerInfo_in_hotshare(db)
});