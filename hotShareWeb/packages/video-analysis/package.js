Package.describe({
  name: 'video-analysis',
  version: "1.0.0"
});

Package.onUse(function (api) {
  // api.export('SimpleChat');
  api.use(['mongo', 'accounts-base', 'iron:router', 'less']);
  api.use(['templating', 'jquery', 'reactive-var', 'blaze-html-templates', 'session'], ['client']);

  // lib
  api.addFiles([
    'lib/collections.js'
  ], ['client','server']);

  // server 
  api.addFiles([
    'server/router.js'
  ], 'server');
  
  api.addAssets([
    'images/homeai.png',
    'images/radar_scan.png',
    'images/loading.gif'
  ], 'client');

  api.addFiles([
    'client/index.html',
    'client/index.js',
    'client/index.less',
    // layout
    'client/layout.html',
    // templates
    'client/template/devices.html',
    'client/template/devices.js',
    'client/template/search.html',
    'client/template/search.js',
    'client/template/history.html',
    'client/template/history.js',
    'client/template/detail.html',
    'client/template/detail.js',
    'client/template/videos.html',
    'client/template/videos.js',
    'client/template/videoImport.html',
    'client/template/videoImport.js',
    // router
    'client/router.js'
  ], 'client');
});
