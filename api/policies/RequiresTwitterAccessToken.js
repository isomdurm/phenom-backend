/**
 *
 * OAuth 1.0 Twitter Token Authorization
 *
 * @module      :: RequiresTwitterBearerTOken
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy protects /auth/twitter/token, and uses Twitter to issue trusted tokens
 *
 **/

 var passport = require('passport');

 module.exports = function(req, res, next){
     passport.authenticate(['twitter-token'], { session: false }, function(err, results){

         if(err || !results){
             //notify client
             Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_TWITTER_TOKEN);
             return;
         }

        req.twitterAuth = results;

        next();
     })(req, res);
 };