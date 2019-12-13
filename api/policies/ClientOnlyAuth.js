/**
 *
 * OAuth 2.0 Basic Policy (Client ID/Secret)
 *
 * @module      :: ClientOnlyAuth
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy protects actions by requiring a valid access token (bearer)
 *
 **/

 var passport = require('passport');

 module.exports = function(req, res, next){
     passport.authenticate('local', { session: false }, function(err, user, info){
        if(err || (!user)){
            //notify client
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_CLIENT_NOT_AUTHORIZED);
            return;
        }

        next();
     })(req, res);
 };