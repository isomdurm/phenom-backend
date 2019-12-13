/**
 *
 * Twitter Access Token Helper Policy
 *
 * @module      :: RequiresTwitterBearerToken
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * This policy helps protect actions which require Twitter authentication, enforcing any Bearer Tokens
 * to be of 'TWITTER' type, and originate directly from Twitter.  Furthermore, all the Twitter token is
 * verified with Twitter before proceeding.
 *
 **/

function _clientNotAuthorized(res){
	Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_TWITTER_TOKEN);
}

module.exports = function(req, res, next){

	sails.middleware.policies.requiresanybearertoken(req, res, function(request, response){

		if(req.accessToken
			&& req.accessToken.type == AccessToken.TokenTypes.TWITTER
		    && req.accessToken.twitterAccessToken
			&& req.accessToken.twitterTokenSecret
			&& req.user
		    && req.user.twitterId
		) {

			//at this point, Phenom approves this token, our next step is to ask Twitter if the
			//token is still valid.  to do this, we'll need to prep the req object with the necessary
			//keys
			if(!req.body){
				req.body = {
					oauth_token: req.accessToken.twitterAccessToken,
					oauth_token_secret: req.accessToken.twitterTokenSecret,
					user_id: req.user.twitterId
				}
			}
			else {
				req.body.oauth_token = req.accessToken.twitterAccessToken;
				req.body.oauth_token_secret = req.accessToken.twitterTokenSecret;
				req.body.user_id = req.user.twitterId;
			}

			sails.middleware.policies.requirestwitteraccesstoken(req, res, function(request, response){

				//twitter says that this token is good-to-go
				return next();

			});

		}
		else{
			_clientNotAuthorized(res);
		}

	});

};