/**
 *
 * Facebook Access Token Helper Policy
 *
 * @module      :: AttachFacebookAccessToken
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy helps protect actions which require FB authentication, enforcing any Bearer Tokens
 * to be of 'FACEBOOK' type, and originate directly from Facebook.  Furthermore, the tokens will be
 * verified with Facebook
 *
 **/

function _clientNotAuthorized(res){
	Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_FACEBOOK_TOKEN);
}

module.exports = function(req, res, next){

	sails.middleware.policies.requiresanybearertoken(req, res, function(request, response){

		if(req.accessToken
			&& req.accessToken.type == AccessToken.TokenTypes.FACEBOOK
			&& req.accessToken.facebookAccessToken
		) {
			//at this point, Phenom approves this token, our next step is to ask Facebook if the
			//token is still valid.  to do this, we'll need to prep the req object with the necessary
			//keys
			if(!req.body){
				req.body = {
					access_token: req.accessToken.facebookAccessToken
				}
			}
			else{
				req.body.access_token = req.accessToken.facebookAccessToken;
			}

			sails.middleware.policies.requiresfacebookaccesstoken(req, res, function(request, response){

				//facebook says that this token is good-to-go
				return next();

			});
		}
		else{
			_clientNotAuthorized(res);
		}
	});

};