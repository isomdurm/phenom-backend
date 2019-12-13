/**
 *  Local environment settings
 *
 *  While you're developing your app, this config file should include
 *  any settings specifically for your development computer (db passwords, etc.)
 *  When you're ready to deploy your app in production, you can use this file
 *  for configuration options on the server where it will be deployed.
 *
 *
 *  PLEASE NOTE:
 *     This file is included in your .gitignore, so if you're using git
 *     as a version control solution for your Sails app, keep in mind that
 *     this file won't be committed to your repository!
 *
 *     Good news is, that means you can specify configuration for your local
 *     machine in this file without inadvertently committing personal information
 *     (like database passwords) to the repo.  Plus, this prevents other members
 *     of your team from commiting their local configuration changes on top of yours.
 *
 *
 *  For more information, check out:
 *  http://sailsjs.org/#documentation
**/

var fs = require('fs');

/**
 * Development machines shall not use the NODE_ENV environment variable,
 * only the production machine shall set this.  We'll use this understand
 * to route persistence appropriately
 *
 * The runtime "environment" of your Sails app is either 'development' or 'production'.
 *
 * In development, your Sails app will go out of its way to help you
 * (for instance you will receive more descriptive error and debugging output)
 * In production, Sails configures itself (and its dependencies) to optimize performance.
 * You should always put your app in production mode before you deploy it to a server-
 * This helps ensure that your Sails app remains stable, performant, and scalable.
 * By default, Sails sets its environment using the `NODE_ENV` environment variable.
 * If NODE_ENV is not set, Sails will run in the 'development' environment.
 *
 * @returns {process.env.NODE_ENV|*|string|string}
 * @private
 */
var _getEnvironment = function(){
     return process.env.NODE_ENV || 'development';
}

var _getSSLConfig = function(){

    //if we're running in AWS, we've usually set the NODE_ENV variable, so go ahead and use the real
    //certificates, otherwise, we're just running on some dev box somewhere, use the self-signed cert
    if(process.env.NODE_ENV){
        return {
            cert: fs.readFileSync('./keys/*.phenomapp.com.crt'),
            key: fs.readFileSync('./keys/*.phenomapp.com.key'),

            //  pass the CA chain
            ca: [
                fs.readFileSync('./keys/RapidSSL_SHA256_CA.crt'),
                fs.readFileSync('./keys/GeoTrustGlobal.crt')
            ]
        };
    }
    else{
        return {
            cert: fs.readFileSync('./config/ssl/server.crt'),
            key: fs.readFileSync('./config/ssl/server.key')
        };
    }
}

module.exports = {
     // The `port` setting determines which TCP port your app will be deployed on
     // Ports are a transport-layer concept designed to allow many different
     // networking applications run at the same time on a single computer.
     // More about ports: http://en.wikipedia.org/wiki/Port_(computer_networking)
     //
     // By default, if it's set, Sails uses the `PORT` environment variable.
     // Otherwise it falls back to port 1337.
     //
     // In production, you'll probably want to change this setting
     // to 80 (http://) or 443 (https://) if you have an SSL certificate

     port:           process.env.PORT || 8081,
     environment:    _getEnvironment(),
     /* ssl:            _getSSLConfig(), SSL Handled at the Load Balancer Boundary, raw HTTP inside VPC */
     getEnvironment: _getEnvironment
};

var ssl_enableSSLIfNoELB = function(){
    //If the app is decrypting HTTPS traffic itself (not behind ELB)
    if(process.env.APP_HANDLES_HTTPS && process.env.APP_HANDLES_HTTPS === 'true'){
        module.exports.ssl = _getSSLConfig();
    }
}();
