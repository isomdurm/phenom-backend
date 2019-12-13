/**
 *
 * OAuth 2.0 Client Password Policy (Client ID/Secret)
 *
 * @module      :: ClinetPasswordAuth
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy protects endpoints with client_id/client_secret combination
 *
 **/

 var passport = require('passport');

 module.exports = function(req, res, next){
     passport.authenticate('oauth2-client-password', { session: false }, function(err, client, info){
        if(err || !client){
            //notify client
            return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_CLIENT_NOT_AUTHORIZED);
        }

        //The user in this context is the client
        req.user = client;

        next();
     })(req, res);
 };