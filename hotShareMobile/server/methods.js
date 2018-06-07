Meteor.methods({
    //修改设备名
    change_device_name:function(deviceId,uuid,groupId,newName){
        //1.修改设备名
        //2.groupuser里的设备用户名字修改
        //3.user里对应名字修改
        Devices.update({_id:deviceId},{
            $set:{
            name:newName
            }
        });
        Meteor.users.update({username:uuid},{$set:{'profile.fullname':newName}});
        var user = Meteor.users.findOne({username:uuid});
        SimpleChat.GroupUsers.update({group_id:groupId,user_id:user._id},{$set:{user_name:newName}});
        return;
    },
    //删除设备
    delete_device:function(deviceId,uuid,groupId){
        //1.从device里删除
        Devices.remove({_id:deviceId});
        //2.从GroupUsers里删除
        var user = Meteor.users.findOne({username:uuid});
        SimpleChat.GroupUsers.remove({group_id:groupId,user_id:user._id});
        //3.从users里移除
        Meteor.users.remove({username:uuid});
    },
    update_install_status:function(group_id,install_status){
        console.log(install_status);
        SimpleChat.Groups.update({_id:group_id},{$set:install_status});
    },
    //自动标记
    autolabel:function(condition,uuid){
        console.log('autolabel',condition);
        console.log('autolabel',uuid);
        var device = Devices.findOne({uuid:uuid});
        var group_id  = device.groupId;
        var name = condition.person_name;
        var selector = {
            group_id:group_id,
            uuid:uuid
        };
        selector['hour'] = condition.start.hour;
        var dt = DeviceTimeLine.findOne(selector);
        var faceList = [];
        console.log('lala',condition.start.hour.getTime());
        if(condition.start.hour.getTime() == condition.end.hour.getTime()){
            for(var i=condition.start.min;i<condition.end.min+1;i++){
                var arr = dt['perMin'][i+''];
                if(arr){
                    console.log('perMin:',i);
                    faceList = _.union(faceList,arr);
                }
            }
        }else{
            console.log('start hour',condition.start.hour);
            for (var i = condition.start.min; i < 60; i++) {
                var arr = dt['perMin'][i + ''];
                if (arr) {
                    console.log('perMin:',i);
                    faceList = _.union(faceList, arr);
                }
            }
            console.log('end hour',condition.end.hour);
            selector['hour'] = condition.end.hour;
            var dt2 = DeviceTimeLine.findOne(selector);
            for (var i = 0; i < condition.end.min + 1; i++) {
                var arr = dt['perMin'][i + ''];
                if (arr) {
                    console.log('perMin:',i);
                    faceList = _.union(faceList, arr);
                }
            }   
        }
        //从中取出所有的正脸
        faceList = _.filter(faceList,function(item){
            return item.style == 'front';
        })
        if(faceList.length == 0){
            return {code:1};
        }
        var setNames = [];
        var res = PERSON.getIdByName(uuid, name, group_id);
        var faceId = null;
        if (res && res.faceId) {
            faceId = res.faceId;
        } else{
            faceId = new Mongo.ObjectID()._str;
        }
        faceList.forEach(function(item){
            setNames.push({
                uuid: uuid, 
                id: faceId,
                url: item.img_url, 
                name: name,
                sqlid:item.style,
                style:item.sqlid
            });
        })
        PERSON.updateLabelTimes(group_id,setNames);
        for(var i=0;i<setNames.length;i++) {
            PERSON.setName(group_id, setNames[i].uuid, setNames[i].id, setNames[i].url, setNames[i].name);
            console.log('LABLE_DADASET_Handle 3')
            LABLE_DADASET_Handle.insert({group_id:group_id,uuid:setNames[i].uuid,id:setNames[i].id,url:setNames[i].url,name:setNames[i].name,sqlid:setNames[i].sqlid,style:setNames[i].style});
        }


        res = PERSON.getIdByName(uuid, name, group_id);
        faceList.forEach(function(item){
            // 发送消息给平板
            var trainsetObj = {
                group_id: group_id,
                type: 'trainset',
                url: item.img_url,
                person_id: res._id,
                device_id: uuid,
                face_id: res.faceId,
                drop: false,
                img_type: 'face',
                style: item.style,
                sqlid: item.sqlid
            };
            console.log("==sr==. timeLine multiSelect: " + JSON.stringify(trainsetObj));
            sendMqttMessage('/device/' + group_id, trainsetObj);
        })
    }
})