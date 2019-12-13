/**
 *
 * Authorization Controller
 *
 * @module      :: AuthorizationController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Marshalls Authorization Requests
 *
 **/

var PromiseImpl = require('bluebird');

/**
 * @param req
 * @returns {Promise} resolves with a token, rejects if improperly formatted Authorization header
 * @private
 */
function _parseToken(req){

    return new PromiseImpl(function(resolve, reject) {

        if (req.headers && req.headers.authorization) {
            var parts = req.headers.authorization.split(' ');
            if (parts.length == 2) {
                var scheme = parts[0]
                    , credentials = parts[1];

                if (/^Bearer$/i.test(scheme)) {
                    resolve(credentials);
                }
            } else {
                reject(new Error('Access token should be available'));
            }
        }
    });

}

function _crendentialExchange(req, res){
    //we're manually invoking a middleware sub-chain
    AuthServices.getOAuthServer().token()(req, res, function(err){

        if(err.code === 'invalid_grant' && err.name === "TokenError")
        {
            if(err.message ==='Invalid resource owner credentials'){
                return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD);
            }
            else if(err.message === "Invalid refresh token"){
                return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_REFRESH_TOKEN);
            }
        }
        else {
            //we standardize on errors, so let's avoid the built-in error handler
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_UNKNOWN, {error: err});
            //AuthServices.getOAuthServer().errorHandler()(err, req, res);
        }

    });
}

function _deauthorize(req, res){

    _parseToken(req)
        .then(function(token){
            return AuthServices.deauthorize(token);
        })
        .then(function(){
            Output.sendJSON(res, Errors.noError);
        })
        .catch(function(err){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED);
        });

}

function _facebookTokenExchange(req, res){

    var missingParams = Validation.validateParams(req, [
            "grant_type"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.hasOwnProperty('user')){
        //we should have a client here
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_CLIENT_NOT_AUTHORIZED);
    }
    else if(!req.hasOwnProperty('facebookAuth'))
    {
        //something horrible happened, we should never expect this
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_UNKNOWN);
    }
    else {
        var refreshToken = req.param('refresh_token') ? req.param('refresh_token') : '';

        AuthServices.facebookTokenExchange(
            req.facebookAuth.accessToken,
            req.param('grant_type'),
            refreshToken,
            req.facebookAuth.profile,
            req.user /* client */
        )
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                   access_token:  results.accessToken,
                   expires_in: results.expires_in,
                   token_type: 'Bearer'
                });
            })
            .catch(function(err){
                Output.sendJSON(res, err, {});
            });
    }
}

function _twitterTokenExchange(req, res){

    var missingParams = Validation.validateParams(req, [
            "grant_type"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.hasOwnProperty('user')){
        //we should have a client here
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_CLIENT_NOT_AUTHORIZED);
    }
    else if(!req.hasOwnProperty('twitterAuth'))
    {
        //something horrible happened, we should never expect this
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_UNKNOWN);
    }
    else {
        var refreshToken = req.param('refresh_token') ? req.param('refresh_token') : '';

        AuthServices.twitterTokenExchange(
            req.twitterAuth.accessToken,
            req.twitterAuth.accessTokenSecret,
            req.param('grant_type'),
            refreshToken,
            req.twitterAuth.profile,
            req.user /* client */
        )
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                    access_token:  results.accessToken,
                    expires_in: results.expires_in,
                    token_type: 'Bearer'
                });
            })
            .catch(function(err){
                Output.sendJSON(res, err, {});
            });
    }
}

module.exports = {
    credentialExchange: _crendentialExchange,
    facebookTokenExchange: _facebookTokenExchange,
    twitterTokenExchange: _twitterTokenExchange,
    deauthorize: _deauthorize
};