lrsConfigWatcher
================

Module to watch for configuration changes on a LineRate device.

# Example

    "use strict";

    var cwm = require("lrsConfigWatcher");
    var watcher = new cwm.ConfigWatcher();

    watcher.on('error', function(err) {
        console.log(err);
    });
    watcher.on('startup-config-changed',
               function() { console.log('startup config changed'); });
    watcher.on('running-config-modified',
               function() { console.log('running config changed'); });
    watcher.start({username: "admin", password: "changeme"});
