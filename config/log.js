/**
 * Logger configuration
 *
 * Configure the log level for your app, as well as the transport
 * (Underneath the covers, Sails uses Winston for logging, which 
 * allows for some pretty neat custom transports/adapters for log messages)
 *
 * For more information on the Sails logger, check out:
 * http://sailsjs.org/#documentation
 */

/**
 * In development environments, we want as much logging as possible.  In production, we only
 * want helpful logging, postmortem
 *
 * Note:    Ideally we'd like to get this from sails.config.getEnvironment, but at 'lift' time,
 *          that function may not have been exported by the 'local' module yet, so we're forced
 *          to replicate the logic here.
 *
 * @returns {string}
 * @private
 */
function _getLogLevel(){
     if(process.env.NODE_ENV && process.env.NODE_ENV === 'production'){
          return 'info'
     }
     else{
          return 'verbose';
     }
}

module.exports = {
    // Valid `level` configs:
    // i.e. the minimum log level to capture with sails.log.*()
    //
    // 'error'	: Display calls to `.error()`
    // 'warn'	: Display calls from `.error()` to `.warn()`
    // 'debug'	: Display calls from `.error()`, `.warn()` to `.debug()`
    // 'info'	: Display calls from `.error()`, `.warn()`, `.debug()` to `.info()`
    // 'verbose': Display calls from `.error()`, `.warn()`, `.debug()`, `.info()` to `.verbose()`
    //
    log: {
        level: _getLogLevel(),
        filePath: 'application.log'
    }
};
