var api = require('../api.js');

var Api = api.ApiV1;

function insertFace(params) {
  var doc = {
    uuid:       params.uuid,
    name:       params.name,
    group_id:   params.groupId,
    img_url:    params.imgUrl,
    position:   params.position,
    type:       params.type == 'human_shape' ? params.type : 'face',
    current_ts: new Date().getTime(),
    accuracy:   params.accuracy,
    fuzziness:  params.fuzziness,
    sqlid:      params.sqlid,
    style:      params.style || 'front',
    tid:        params.tid,
    img_ts:     params.img_ts,
    p_ids:      params.p_ids,
    createdAt:  new Date()
  };

  if (!params.name && params.faceId) {
    doc.id = params.faceId;
    var person = Person.findOne({faceId: params.faceId});
    if (!person) {
      throw new Meteor.Error('error-persons-not-found', 'faceId(' + params.faceId + ') person Not Found');
    } else {
      doc.name = person.name;
    }
  } else {
    doc.id = doc.current_ts + doc.uuid;
  }

  var device = Devices.findOne({
    uuid: doc.uuid
  });
  if (device && device.name) {
    doc.device_name = device.name;
  }

  var faceId = Faces.insert(doc);

  return Faces.findOne(faceId);
}

// TODO: person.js 有相应method ”set-person-names“，但是不通用，后期可优化
function label(groupId, items, action = '用户API上传标记') {
  if (!_.isArray(items)) return;

  PERSON.updateLabelTimes(groupId, items);

  _.each(items, function (item) {
    var isHumanShape = item.type == 'human_shape'; // 其他类型默认识别为face
    var person = PERSON.setName(groupId, item.uuid, item.faceId, item.imgUrl, item.name, false, isHumanShape);
    var labelInfo = {
      group_id: groupId,
      uuid:     item.uuid,
      id:       item.faceId,
      url:      item.imgUrl,
      name:     item.name,
      sqlid:    item.sqlid,
      style:    item.style,
      type:     item.type,
      action:   action
    };

    LABLE_DADASET_Handle.insert(labelInfo);

    var trainsetObj = _.defaults({
      type:     'trainset',
      person_id: person._id,
      device_id: person.deviceId,
      face_id:   person.faceId,
      drop:      false,
      img_type:  item.type,
    }, labelInfo);

    sendMqttMessage('/device/' + groupId, trainsetObj);
  });
}

function checkFaceData(face) {
  var imgUrl = face.imgUrl && face.imgUrl.trim();
  var uuid   = face.uuid && face.uuid.trim();
  var name   = face.name && face.name.trim();
  var faceId = face.faceId && face.faceId.trim();
  var type   = face.type && face.type.trim();

  if (!imgUrl || !uuid || !type || (!name && !faceId)) {
    throw new Meteor.Error('error-faces-param-not-provided', 'The parameter "imgUrl" or "type" or "uuid" or "name" or "faceId" is required');
  }

  if (!Devices.findOne({uuid: uuid})) {
    return api.failure('Device(' + uuid + ')  not found', 'error-device-not-found', 404);
  }
}

Api.addRoute('groups/:groupId/strangers/:strangerId/label', {
  authRequired: false,
}, {
  post: function() {
    try {
      var groupId = this.urlParams.groupId && this.urlParams.groupId.trim();
      var strangerId = this.urlParams.strangerId && this.urlParams.strangerId.trim();

      var name = this.bodyParams.name && this.bodyParams.name.trim();
      if (!name) {
        throw new Meteor.Error('error-groups-strangers-param-not-provided', 'The parameter "name" is required');
      }

      var stranger = Strangers.findOne(strangerId);

      Meteor.call('get-id-by-name1', stranger.uuid, name, stranger.group_id, function(err, result) {
        var faceId = (result && result.faceId) || stranger.imgs[0].faceid;
        var setNames = [];

        _.each(stranger.imgs, function(img) {
          if (!_.contains(['front', 'human_shape'], img.style) && img.fuzziness >= 100) return;

          var transetObj = {
            group_id: stranger.group_id,
            type: 'trainset',
            url: img.url,
            person_id: img.faceid,
            device_id: stranger.uuid,
            face_id: faceId,
            drop: false,
            img_type: 'face',
            style: img.style,
            sqlid: img.sqlid
          };
          sendMqttMessage('/device/' + stranger.group_id, transetObj);

          setNames.push({
            uuid: stranger.uuid,
            id: faceId,
            url: img.url,
            name: name,
            sqlid: img.sqlid,
            style: img.style
          });

          var person_info = {
            'uuid': stranger.uuid,
            'person_id': img.faceid,
            'name': name,
            'group_id': stranger.group_id,
            'img_url': img.url,
            'type': 'face',
            'ts': new Date().getTime(),
            'accuracy': img.accuracy,
            'fuzziness': img.fuzziness,
            'sqlid': img.sqlid,
            'style': img.style
          }

          var data = {
            face_id: faceId,
            person_info: person_info,
            formLabel: true
          }

          Meteor.call('ai-checkin-out', data, function(err, result) {});
        });

        Meteor.call('set-person-names', stranger.group_id, setNames, function(err, result) {
          Strangers.remove({_id: strangerId});
        });
      })

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
})

/**
 *
 * 标注单张
 * @urlParam groupId {string}
 * @bodyParam
 * {
 *    "imgurl":     图片地址, (必填)
 *    "uuid":       设备Id (必填)
 *    "faceId":     face Id (和name 至少存在一个)
 *    "name":       标注名称 (和faceId 至少存在一个)
 *    "position":   位置 (选填)
 *    "type":       类型.默认:face (选填)
 *    "current_ts": 当前时间 毫秒 (选填)
 *    "accuracy":   图片精准度 (选填)
 *    "fuzziness":  图片模糊度 (选填)
 *    "sqlid":      本地sqlid (选填)
 *    "style":      人脸类型(前脸 front,左脸 left_side,右脸right_side)。默认:front (选填)
 *    "tid":        连续图片id (选填)
 *    "img_ts":     图片拍摄时间 毫秒 (选填)
 *    "p_ids":      同一时间拍摄的多张图片 (选填)
 * }
 */
Api.addRoute('groups/:groupId/faces', {
  authRequired: true
}, {
  post: function () {
    try {
      var groupId = this.urlParams.groupId && this.urlParams.groupId.trim();
      if (!groupId) {
        throw new Meteor.Error('error-group-faces-param-not-provided', 'The parameter "groupId" is required');
      }

      if (!SimpleChat.Groups.findOne(groupId)) {
        return api.failure('Group(' + groupId + ') not found', 'error-group-not-found', 404);
      }

      var params = this.bodyParams;
      checkFaceData(params);

      var face = insertFace(params);
      var item = {
        uuid: face.uuid,
        faceId: face.id,
        imgUrl: face.img_url,
        name: face.name,
        sqlid: face.sqlid,
        style: face.style,
        type: face.type
      };

      // 标注训练
      label(groupId, [item]);

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
});

/**
 *
 * batch
 * @urlParam  groupId {string}
 * @bodyParam
 * {
 *   "create": [
 *      {obj1(格式同标注单张 bodyParam)},
 *      {obj2(格式同标注单张 bodyParam)},
 *      ...
 *   ]
 * }
 */
Api.addRoute('groups/:groupId/faces/batch', {
  authRequired: true
}, {
  post: function () {
    try {
      var groupId = this.urlParams.groupId && this.urlParams.groupId.trim();
      if (!groupId) {
        throw new Meteor.Error('error-group-faces-param-not-provided', 'The parameter "groupId" is required');
      }

      if (!SimpleChat.Groups.findOne(groupId)) {
        return api.failure('Group(' + groupId + ') not found', 'error-group-not-found', 404);
      }

      var params = this.bodyParams;
      if (_.isEmpty(params) || _.isEmpty(params.create)) {
        throw new Meteor.Error('error-faces-param-not-provided', 'The parameter " " is required');
      }

      var items = [];
      _.each(params.create, function (param) {
        checkFaceData(param);

        var face = insertFace(param);
        var item = {
          uuid: face.uuid,
          faceId: face.id,
          imgUrl: face.img_url,
          name: face.name,
          sqlid: face.sqlid,
          style: face.style
        };

        items.push(item);
      });

      Meteor.setTimeout(function() {
        label(groupId, items);
      }, 200);

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
});

Api.addRoute('groups', {
  authRequired: true
}, {
  get: {
    authRequired: false,
    action: function () {
      try {
        var params    = this.queryParams;
        var groupName = params.groupName && params.groupName.trim();
        var creator   = params.creator&& params.creator.trim();

        if (!groupName || !creator) {
          throw new Meteor.Error('error-groups-param-not-provided', 'The parameter "groupName" or "creator" is required');
        }

        var group = SimpleChat.Groups.findOne({name: groupName, 'creator.name': creator});
        return group || api.success({ result: '未找到对应结果' });
      } catch (e) {
        return api.failure(e.message, e.error);
      }
    }
  },
  post: function () {
    try {
      var params = this.bodyParams;

      var name = params.name && params.name.trim();
      if (!name) {
        throw new Meteor.Error('error-groups-param-not-provided', 'The parameter "name" is required');
      }

      if (SimpleChat.Groups.findOne({name: name, 'creator.id': this.userId})) {
        throw new Meteor.Error('error-groups-already-existed', 'Group has already existed!');
      }

      var id = new Mongo.ObjectID()._str;
      var user = this.user;
      SimpleChat.Groups.insert({
        _id: id,
        name: name,
        icon: '',
        describe: '',
        create_time: new Date(),
        template: null,
        offsetTimeZone: (new Date().getTimezoneOffset())/-60,
        last_text: '',
        last_time: new Date(),
        barcode: rest_api_url + '/restapi/workai-group-qrcode?group_id=' + id,
        //建群的人
        creator:{
          id: user._id,
          name: user.profile && user.profile.fullname ? user.profile.fullname : user.username
        }
      }, function (err, result) {
        if(err) {
          throw new Meteor.Error('error-groups-created-error', 'created failed!');
        }

        SimpleChat.GroupUsers.insert({
          group_id: id,
          group_name: name,
          group_icon: '',
          user_id: user._id,
          user_name: user.profile && user.profile.fullname ? user.profile.fullname : user.username,
          user_icon: user.profile && user.profile.icon ? user.profile.icon : '/userPicture.png',
          create_time: new Date()
        });
      });

      return {groupId: id};
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
});

Api.addRoute('groups/:id', {
  authRequired: true
}, {
  patch: function () {
    try {
      var name = this.bodyParams.name && this.bodyParams.name.trim();
      var groupId = this.urlParams.id && this.urlParams.id.trim();
      var group = SimpleChat.Groups.findOne(groupId);

      if (!name) {
        throw new Meteor.Error('error-group-param-not-provided', 'The parameter "name" is required');
      }

      if (!group) {
        return api.failure('Group(' + groupId + ') not found', 'error-group-not-found', 404);
      }

      if (group.creator && group.creator.id !== this.userId) {
        return api.failure('Group(' + groupId + ') failed to update', 'Permission Denied', 403);
      }

      Meteor.call('updateGroupName', groupId, name);

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  },
  delete: function() {
    try {
      var groupId = this.urlParams.id && this.urlParams.id.trim();
      var group = SimpleChat.Groups.findOne(groupId);

      if (!group) {
        return api.failure('Group(' + groupId + ') not found', 'error-group-not-found', 404);
      }

      if (group.creator && group.creator.id !== this.userId) {
        return api.failure('Group(' + groupId + ') failed to delete', 'Permission Denied', 403);
      }

      Meteor.call('creator-delete-group', groupId, this.userId);
      Meteor.call('remove-group-user', groupId, this.userId);

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
})

// 组加新成员
Api.addRoute('groups/:groupId/users', {
  authRequired: true
}, {
  post: function() {
    try {
      var userId = this.bodyParams.userId && this.bodyParams.userId.trim();

      if (!userId) {
        throw new Meteor.Error('error-groups-users-param-not-provided', 'The parameter "userId" is required');
      }

      var group = SimpleChat.Groups.findOne(this.urlParams.groupId);
      if (!group) {
        return api.failure('Group(' + this.urlParams.groupId + ') not found', 'error-group-not-found', 404);
      }

      var user = Meteor.users.findOne(userId);
      if (!user) {
        return api.failure('User(' + userId + ') not found', 'error-user-not-found', 404);
      }

      var groupUser = SimpleChat.GroupUsers.findOne({group_id: group._id, user_id: user._id});
      if (groupUser) {
        throw new Meteor.Error('error-group-user-already-existed', 'GroupUsers has already existed!');
      }

      SimpleChat.GroupUsers.insert({
        group_id: group._id,
        group_name: group.name,
        group_icon: '',
        user_id: user._id,
        user_name: user.profile && user.profile.fullname ? user.profile.fullname : user.username,
        user_icon: user.profile && user.profile.icon ? user.profile.icon : '/userPicture.png',
        create_time: new Date()
      });

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
});

Api.addRoute('groups/:groupId/person', {
  authRequired: false
}, {
  get: function() {
    try {
      var groupId = this.urlParams.groupId && this.urlParams.groupId.trim();

      var group = SimpleChat.Groups.findOne(groupId);
      if (!group) {
        return api.failure('Group(' + groupId + ') not found', 'error-group-not-found', 404);
      }

      return Person.find({group_id: groupId}, {fields: {group_id: 1, name: 1, url: 1, faceId: 1, faces: 1}}).fetch();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
});

Api.addRoute('groups/:groupId/devices', {
  authRequired: true
}, {
  post: function() {
    try {
      var groupId = this.urlParams.groupId && this.urlParams.groupId.trim();
      var bodyParams = this.bodyParams;

      var uuid = bodyParams.uuid && bodyParams.uuid.trim();
      var deviceName = bodyParams.deviceName && bodyParams.deviceName.trim();
      var type = bodyParams.type && bodyParams.type.trim();

      if (!uuid || !deviceName || !type) {
        throw new Meteor.Error('error-groups-devices-param-not-provided', 'The parameter "uuid" and "deviceName" and "type" is required');
      }

      Meteor.call('join-group', uuid, groupId, deviceName, type);

      return api.success();
    } catch (e) {
      return api.failure(e.message, e.error);
    }
  }
})
