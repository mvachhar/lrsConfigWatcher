// [Use Strict JS]
"use strict";

// [Requires]
// Node.js  Modules
var fs = require('fs')
  , http = require('http')
  , timers = require('timers')
  , events = require('events')
  , util = require('util')
  , mgmtRest = require('lrsManagementRest');

function ConfigWatcher() {
    this.mgmt = new mgmtRest.Client();
}

util.inherits(ConfigWatcher, events.EventEmitter);
ConfigWatcher.prototype.start = function(options) {
    var self = this;
    var mgmt = self.mgmt;

    function watchFileByName(path, cb) {
	fs.watchFile(path, 
		     { persistent: true, interval: 1 },
		     function(event, file) {
			 process.nextTick(cb);
		     });
    }

    function pollForRunningConfigChange(mgmt, cb) {
	var path = '/status/system/config/modified';
	mgmt.getJSON(path, 
		     function(resp) {
			 if(resp.statusCode != 200) {
			     self.emit(new 
				       Error("Could not get config status: " +
					     resp.statusCode));
			 }
			 var jsonObj = "";
			 resp.on('data', 
				 function(data) { 
				     jsonObj += data; 
				 });
			 resp.on('end', function() {
			     process.nextTick(function() {
				 cb(JSON.parse(jsonObj)[path]);
			     });
			 });
		     });
    }
    
    function watchForRunningConfigChange(mgmt, cb) {
	var oldModified = 0;
	function myCb(interval) {
	    pollForRunningConfigChange(mgmt, 
 	        function(modified) { 
		    if(modified.data && !oldModified) {
			process.nextTick(cb);
		    }
		    oldModified = modified.data;
		});
	}
	myCb(undefined);
	timers.setInterval(myCb, 5000.0);
    }

    function startWatch(mgmt) {
	watchFileByName('/home/linerate/data/startup-config',
			function() { 
			    self.emit('startup-config-changed');
			});
	watchForRunningConfigChange(self.mgmt, 
				    function() { 
					self.emit('running-config-modified');
				    });
    }

    var safeOpts = options || {};
    var localOptions = {
        host          : safeOpts.host        || '127.0.0.1',
        port          : safeOpts.port        || 3001,
        path          : safeOpts.path        || '/login',
	username      : safeOpts.username,
        password      : safeOpts.password
    };
    
    mgmt.on('error', function(err) { self.emit('error', err); });
    mgmt.on('loginFailure',
	    function(loginResponse, body) {
		var err = new Error("Could not login: " + 
				    loginResponse.statusCode);
		err.body = body;
		self.emit('error', err);
	    });
    mgmt.on('loginRequestFailure',
	    function(error) {
		self.emit('error', 
			  new Error("Unable to connect to rest server: " + 
				    error));
	    });
    mgmt.on('login', function() { 
	startWatch(mgmt);
    });
    
    mgmt.logIn(localOptions);
}

exports.ConfigWatcher = ConfigWatcher
