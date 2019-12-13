/**
 *
 * OAuth 2.0 Bearer Token Policy
 *
 * @module      :: BearerAuth
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy protects actions by requiring a valid access token (bearer)
 *
 **/

 var passport = require('passport');

 module.exports = function(req, res, next){
     passport.authenticate('bearer', { session: false }, function(err, user, info){
     	if(err || (!user)){
     		//notify client
     		Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED);
     		return;
     	}

     	//attach the user to the request object to identify the caller to the Controllers
        //we do this here because there is no sense in running the same mongo query inside
        //of a passport deseriaze function since we already have the information here
     	req.user = user;

		//attach the access token id for requests to use
		req.accessToken = info.token;

     	next();
     })(req, res);
 };