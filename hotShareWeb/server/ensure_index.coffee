if Meteor.isServer
  Meteor.startup ()->
    Moments._ensureIndex({currentPostId:1})
    Moments._ensureIndex({currentPostId:1, readPostId:1})
    Moments._ensureIndex({currentPostId:1, createdAt: -1})
    Moments._ensureIndex({currentPostId:1, userId: 1})
    Moments._ensureIndex({currentPostId:1, userId:1, createdAt: -1})
    Moments._ensureIndex({readPostId:1})
    Viewers._ensureIndex({userId: 1, createdAt: -1})
    Viewers._ensureIndex({userId: 1})
    # {postId: 1, userId: 1, createdAt: -1} will create 3 indexs,
    # {postId: 1},{postId: 1,userId: 1},{postId: 1, userId: 1, createdAt: -1}
    #Viewers._ensureIndex({postId: 1})
    Viewers._ensureIndex({postId: 1,userId: 1})
    Viewers._ensureIndex({postId: 1, userId: 1, createdAt: -1})
    Viewers._ensureIndex({postId: 1, createdAt: -1})
    Follower._ensureIndex({userId: 1, followerId: 1, createAt:-1})
    Follower._ensureIndex({followerId: 1, createAt:-1})
    Follower._ensureIndex({userId: 1, createAt:-1})
    Follower._ensureIndex({userId: 1})
    Follower._ensureIndex({followerId: 1},{userEmail:1})
    Follows._ensureIndex({index: 1})
    TopicPosts._ensureIndex({postId: 1})
    TopicPosts._ensureIndex({postId: 1, owner: 1})
    ReComment._ensureIndex({postId: 1, commentUserId: 1})
    ReComment._ensureIndex({postId: 1})
    Meets._ensureIndex({me: 1, count: -1})
    Meets._ensureIndex({me: 1, createdAt: -1})
    #This one need to be deleted in mongodb.
    #Meets._ensureIndex({me: 1, ta: 1, meetOnPostId: 1, count: -1, createdAt: -1})
    Meets._ensureIndex({me: 1, ta: 1})
    Meets._ensureIndex({me: 1, meetOnPostId: 1, createdAt: -1})
    Posts._ensureIndex({owner: 1, createdAt: -1})
    Posts._ensureIndex({owner: 1, publish: 1})
    Series._ensureIndex({owner: 1})
    #Posts._ensureIndex({title: 1, publish: 1})
    Posts._ensureIndex({owner: 1, publish: 1, createdAt: -1})
    Posts._ensureIndex({owner: 1, publish: 1, browse: -1})
    Posts._ensureIndex({createdAt: -1})
    Posts._ensureIndex({isReview:1,createdAt: -1})
    Posts._ensureIndex({hasPush: 1})
    RePosts._ensureIndex({createdAt: 1})
    FollowPosts._ensureIndex({followby: 1, createdAt: -1})
    FollowPosts._ensureIndex({followby: 1, postId: 1})
    FollowPosts._ensureIndex({postId: 1})
    FollowPosts._ensureIndex({owner: 1})
    FollowPosts._ensureIndex({owner: 1, followby: 1})
    SavedDrafts._ensureIndex({owner: 1, createdAt: -1})
    Feeds._ensureIndex({followby: 1, createdAt: -1})
    Feeds._ensureIndex({followby: 1, postId: 1, eventType: 1, recommanderId: 1, createdAt: -1})
    Comment._ensureIndex({postId: 1})
    Reports._ensureIndex({postId: 1})
    Feeds._ensureIndex({recommanderId: 1, recommander: 1, postId: 1, followby: 1})
    Feeds._ensureIndex({requesteeId: 1, requesterId: 1, followby: 1})
    Feeds._ensureIndex({owner:1,followby: 1, checked: 1, postId: 1, pindex: 1})
    Feeds._ensureIndex({postId:1,eventType: 1})
    Feeds._ensureIndex({followby:1,checked: 1})
    Feeds._ensureIndex({followby:1})
    Feeds._ensureIndex({followby:1,isRead:1})
    Feeds._ensureIndex({eventType:1})
    AssociatedUsers._ensureIndex({userIdA:1})
    AssociatedUsers._ensureIndex({userIdB:1})
    ReaderPopularPosts._ensureIndex({userId:1})
    FavouritePosts._ensureIndex({userId:1, createdAt:-1})
    # this one do not need index
    # Topics.find({})
    # Topics._ensureIndex({text: 1, createdAt: -1})
    #RefComments._ensureIndex({text: 1})
    PushSendLogs._ensureIndex({createAt:-1})
    UserRelation._ensureIndex({userId:1})
    UserRelation._ensureIndex({toUserId:1})
    UserRelation._ensureIndex({userId:1, toUserId: 1})
    Recommends._ensureIndex({relatedUserId: 1})
    Recommends._ensureIndex({relatedPostId: 1})
    SeriesFollow._ensureIndex({owner: 1, seriesId: 1})
    WorkAIUserRelations._ensureIndex({app_user_id: 1})
    WorkAIUserRelations._ensureIndex({group_id: 1})
    WorkAIUserRelations._ensureIndex({'ai_persons.id': 1})
    DeviceTimeLine._ensureIndex({uuid: 1})
    DeviceTimeLine._ensureIndex({uuid: 1, group_id: 1})
    DeviceTimeLine._ensureIndex({hour: 1})
    DeviceTimeLine._ensureIndex({uuid: 1, group_id: 1,hour:-1})
    ModelParam._ensureIndex({groupid: 1, uuid: 1})
    WorkStatus._ensureIndex({in_image:1,out_image:1})
    WorkStatus._ensureIndex({date: 1,group_id:1})
    WorkStatus._ensureIndex({date: 1,group_id:1,status:1})
    WorkStatus._ensureIndex({group_id: 1, app_user_id: 1, date: 1})
    WorkStatus._ensureIndex({group_id: 1, person_name: 1, date: 1})
    WorkStatus._ensureIndex({app_user_id: 1})

    ClusterWorkStatus._ensureIndex({date: 1,group_id:1})
    Person._ensureIndex({group_id: 1,'faces.id':1,createAt:1})
    Person._ensureIndex({group_id: 1, name: 1,createAt: 1})
    Person._ensureIndex({group_id: 1, createAt: 1})
    Person._ensureIndex({group_id: 1, faceId: 1})
    ClusterPerson._ensureIndex({group_id: 1,createAt: -1});
    Devices._ensureIndex({uuid:1})
    Devices._ensureIndex({groupId:1})
    LableDadaSet._ensureIndex({group_id: 1,name:1,createAt: -1})
    LableDadaSet._ensureIndex({createAt: -1})
    ClusterLableDadaSet._ensureIndex({group_id: 1,name:1,createAt: -1})
    Strangers._ensureIndex({group_id: 1,createTime: -1})
    Strangers._ensureIndex({createTime: -1})
    People._ensureIndex({updateTime: -1})
