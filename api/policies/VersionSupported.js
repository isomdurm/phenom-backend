/**
 *
 * Version Supported Policy
 *
 * @module      :: BearerAuth
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy ensures that this version of the application is capable of handing the incomming
 * request 'req'
 *
 **/

var Promise = require('bluebird');

/**
 * Performs a logout operation given a valid access token.  This includes removing the access token, and dependent
 * refresh and notification device tokens.
 * @param req
 * @returns {Promise} resolving on success
 * @private
 */
function _logout(req){
    //get the token, if there is one
    var token;

    if (req.headers && req.headers.authorization) {
        var parts = req.headers.authorization.split(' ');
        if (parts.length == 2) {
            var scheme = parts[0]
                , credentials = parts[1];

            if (/^Bearer$/i.test(scheme)) {
                token = credentials;

                return UserServices.logout(token);
            }
        }
    }

    return Promise.reject(new Error('Invalid Access Token'));
}

/**
 * Compares two versions given a compare operator
 * @param v1
 * @param comparator
 * @param v2
 * @returns {boolean}
 * @private
 */
function _compareVersions(v1, comparator, v2) {
    comparator = comparator == '=' ? '==' : comparator;
    var v1parts = v1.split('.'), v2parts = v2.split('.');
    var maxLen = Math.max(v1parts.length, v2parts.length);
    var part1, part2;
    var cmp = 0;
    for(var i = 0; i < maxLen && !cmp; i++) {
        part1 = parseInt(v1parts[i], 10) || 0;
        part2 = parseInt(v2parts[i], 10) || 0;
        if(part1 < part2)
            cmp = 1;
        if(part1 > part2)
            cmp = -1;
    }
    return eval('0' + comparator + cmp);
}

/**
 * Checks if the given request 'req' is supported by this verison of the application
 * @param req
 * @returns {Promise} resolving with true if supported, false otherwise.  Rejects on error.
 * @private
 */
function _isVersionSupported(req){
    return new Promise(function(resolve, reject){
        //get the api version specified in 'req'
        if (req.headers && req.headers.apiversion) {
            var version = '';

            if (/([0-9]|\.)+/.test(req.headers.apiversion)) {
                if(!_compareVersions(req.headers.apiversion, '===', Config.API.minimumSupportedVersion)){
                    //logout if we can
                    _logout(req)
                        .then(function(){
                            resolve(false);
                        })
                        .catch(function(err){
                            reject(err);
                        });
                }
                else{
                    resolve(true);
                }

            }
        }
        else{
            resolve(false);
        }
    });
}


module.exports = function(req, res, next){
    _isVersionSupported(req)
        .then(function(bSupported){
            if(!bSupported){
                //divert middleware chain
                Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_VERSION_NOT_SUPPORTED);
            }
            else{
                //all is right with the world
                next();
            }
        })
        .catch(function(err){
            //not much we can do about this...
            sails.log.error(err);
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_VERSION_NOT_SUPPORTED);
        });
};