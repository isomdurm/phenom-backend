/**
 *
 * OAuth 2.0 Facebook Token Authorization
 *
 * @module      :: FacebookTokenAuth
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy protects /auth/facebook/token, and uses Facebook to issue trusted tokens
 *
 **/

 var passport = require('passport');

 module.exports = function(req, res, next){
     passport.authenticate(['facebook-token'], { session: false }, function(err, results){

         if(err || !results){
             //notify client
             Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_FACEBOOK_TOKEN);
             return;
         }

        req.facebookAuth = results;

        next();
     })(req, res);
 };