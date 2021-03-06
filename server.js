// Generated by CoffeeScript 2.4.1
(function() {
  var Bits, StreamServer, config, logger, streamServer, url;

  url = require('url');

  config = require('./config');

  StreamServer = require('./stream_server');

  Bits = require('./bits');

  logger = require('./logger');

  Bits.set_warning_fatal(true);

  logger.setLevel(logger.LEVEL_INFO);

  streamServer = new StreamServer;

  //  callback null, isAuthenticated
  streamServer.setLivePathConsumer(function(uri, callback) {
    var pathname, ref;
    pathname = (ref = url.parse(uri).pathname) != null ? ref.slice(1) : void 0;
    isAuthorized = true;
    if (isAuthorized) {
      return callback(null); // Accept access
    } else {
      return callback(new Error('Unauthorized access')); // Deny access
    }
  });

  if (config.recordedDir != null) {
    streamServer.attachRecordedDir(config.recordedDir);
  }

  process.on('SIGINT', () => {
    console.log('Got SIGINT');
    return streamServer.stop(function() {
      return process.kill(process.pid, 'SIGTERM');
    });
  });

  process.on('uncaughtException', function(err) {
    streamServer.stop();
    throw err;
  });

  streamServer.start();

}).call(this);
