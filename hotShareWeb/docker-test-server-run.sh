#!/bin/bash
docker run --restart=always -d -e WECHATAPI_APP_SECRET=f8adc7eb09bc248fcb90487953efb4fb -e WECHATAPI_APP_ID=wx2dbd5095a2666e8f -e SERVER_DOMAIN_NAME=cdcdn.tiegushi.com -e ENABLE_WECHAT_SIGN_SERVER=1 -e VIRTUAL_HOST=cdcdn.tiegushi.com,host2.tiegushi.com -e DISABLE_WEBSOCKETS=1 -e ROOT_URL=http://host2.tiegushi.com -e DDP_DEFAULT_CONNECTION_URL=http://host2.tiegushi.com -e MONGO_URL=mongodb://hotShareAdmin:aei_19056@host1.tiegushi.com:27017/hotShare -e MONGO_OPLOG_URL=mongodb://oplogger:PasswordForOplogger@host1.tiegushi.com:27017/local?authSource=admin -e MAIL_URL=smtp://postmaster%40tiegushi.com:a7e104e236965118d8f1bd3268f36d8c@smtp.mailgun.org:587/  -t manlin/hotshare:1.1.1
