if Meteor.isClient
  # Template.introductoryPage.rendered=->
  #   $('.content').css 'min-height',$(window).height()

  Template.introductoryPage.events
    'click #joinGroup':(event)->
      Router.go('/introductoryPage1');
    'click #createGroup':(event)->
      window.localStorage.setItem("isSecondUse",'true');
      Router.go('/group/add');
    'click #skipStep':(event)->
      Session.set('needShowBubble','false');
      window.localStorage.setItem("isSecondUse",'true');
      PUB.page '/'
      Meteor.setTimeout ()->
        PUB.page '/posts/uRyvJDmL88gd4BbBF'
      ,300
  
  # Template.introductoryPage1.rendered=->
  #   $('.content').css 'min-height',$(window).height()

  Template.introductoryPage1.events
    'click #scanBarcode':(event)->
      ScanBarcodeByBarcodeScanner();
      window.localStorage.setItem("isSecondUse",'true');
    'click #loadBarCodeFromAlbum':(event)->
      #PUB.page('/newFriendsList')
      window.localStorage.setItem("isSecondUse",'true');
      DecodeImageFromAlum();
    'click #skipStep':(event)->
      Session.set('needShowBubble','false');
      window.localStorage.setItem("isSecondUse",'true');
      PUB.page '/'
      Meteor.setTimeout ()->
        PUB.page '/posts/uRyvJDmL88gd4BbBF'
      ,300