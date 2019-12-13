/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * @module      :: HTTP (Express)
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Configuration for the underlying HTTP server in Sails.
 * Only applies to HTTP requests (not WebSockets)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.http.html
**/

var passport = require('passport');

module.exports.http = {

    /****************************************************************************
    *                                                                           *
    * Express middleware to use for every Sails request. To add custom          *
    * middleware to the mix, add a function to the middleware config object and *
    * add its key to the "order" array. The $custom key is reserved for         *
    * backwards-compatibility with Sails v0.9.x apps that use the               *
    * `customMiddleware` config option.                                         *
    *                                                                           *
    ****************************************************************************/

    middleware: {
        order: [
            'startRequestTimer',
            //'cookieParser',
            '$custom',
            'myRequestLogger',
            'bodyParser',
            'handleBodyParserError',
            'compress',
            'methodOverride',
            'poweredBy',
            'router',
            'www',
            'favicon',
            '404',
            '500'
        ]
    },

    customMiddleware: function(app) {

        //Tell Sails/Express that we're using Passport to handle authentication/authorization
        app.use(passport.initialize());

    },

  /***************************************************************************
  *                                                                          *
  * The body parser that will handle incoming multipart HTTP requests. By    *
  * default as of v0.10, Sails uses                                          *
  * [skipper](http://github.com/balderdashy/skipper). See                    *
  * http://www.senchalabs.org/connect/multipart.html for other options.      *
  *                                                                          *
  ***************************************************************************/

  bodyParser: function(){
      return require('skipper')({
        maxTimeToBuffer: 1000000
    }); }
};