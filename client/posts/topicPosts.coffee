if Meteor.isClient
  Template.topicPosts.rendered=->
    $('.content').css 'min-height',$(window).height()
#    $('.addontitle').css('top',$(window).height()*0.25)
  Template.topicPosts.helpers
    TopicTitle:()->
      Session.get('topicTitle')
    Posts:()->
      TopicPosts.find({topicId:Session.get('topicId')}, {sort: {createdAt: -1}})
  Template.topicPosts.events
    'click .back' :->
      history.back()
    'click .mainImage': (event)->
      Router.go '/posts/'+this.postId
