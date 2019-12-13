/**
 *
 * Error Services
 *
 * @module      :: Errors
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides error definitions in the format:
 *   Error format:
 *	  {
 * 		errorCode:  	403 
 *		errorMessage: 	"You so dumb, like fo' real"
 *		pipeToUser:     true
 *	  }
 *
 **/

//General error properties to be distributed throughout the application
var _clientErrors = {
    'ERROR_CLIENT_UNKNOWN': {
        errorCode: 		401,
            errorMessage: 	"Unknown client error occurred",
            pipeToUser:     false
    },
    'ERROR_CLIENT_INVALID_PARAMS': {
        errorCode:      402,
            errorMessage:   'Missing necessary parameters',
            pipeToUser:     true
    },
    'ERROR_CLIENT_DUPLICATE_EMAIL': {
        errorCode:      403,
            errorMessage:   'A User already exists for this email address',
            pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_PASSWORD': {
        errorCode:      404,
            errorMessage:   'Invalid Phenom ID and/or password, please try again',
            pipeToUser:     true
    },
    "ERROR_CLIENT_USER_NOT_AUTHORIZED": {
        errorCode:      405,
            errorMessage:   'User is not authorized',
            pipeToUser:     true
    },
    'ERROR_CLIENT_DUPLICATE_USERNAME': {
        errorCode: 		406,
            errorMessage:   'A User already exists with this username',
            pipeToUser:     true
    },
    'ERROR_CLIENT_EMAIL_NOT_FOUND': {
        errorCode:      407,
            errorMessage:   'No user was found for this email address',
            pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN': {
        errorCode:      408,
            errorMessage:   'This password reset request is no longer valid.',
            pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_FEED_TYPE':{
        errorCode:      409,
            errorMessage:   'Invalid feed type',
            pipeToUser:     false
    },
    'ERROR_CLIENT_VERSION_NOT_SUPPORTED':{
        errorCode:      410,
            errorMessage:   'This version of the application is no longer supported.  Please download the latest version in the App Store.',
            pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_ACCESS':{
        errorCode:      411,
            errorMessage:   'You do not have privileges to modify this object',
            pipeToUser:     false
    },
    'ERROR_CLIENT_CLIENT_NOT_AUTHORIZED':{
        errorCode:      412,
        errorMessage:   'Client is not authorized',
        pipeToUser:     true
    },
    'ERROR_CLIENT_MISSING_FACEBOOK_LINK':{
        errorCode:      413,
        errorMessage:   'A user was found that matches the provided Facebook credentials, however, they have yet to link their account with Facebook',
        pipeToUser:     false
    },
    'ERROR_CLIENT_NO_USER_FOUND':{
        errorCode:      414,
        errorMessage:   'No user found with these credentials',
        pipeToUser:     false
    },
    'ERROR_CLIENT_DUPLICATE_FACEBOOKACCOUNT':{
        errorCode:      415,
        errorMessage:   'A User already exists for this Facebook account',
        pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_REFRESH_TOKEN':{
        errorCode:      416,
        errorMessage:   'Invalid refresh token',
        pipeToUser:     false
    },
    'ERROR_CLIENT_INVALID_FACEBOOK_TOKEN':{
        errorCode:      417,
        errorMessage:   'Invalid Facebook access token',
        pipeToUser:     false
    },
    'ERROR_CLIENT_DUPLICATE_TWITTERACCOUNT':{
        errorCode:      418,
        errorMessage:   'A User already exists for this Twitter account',
        pipeToUser:     true
    },
    'ERROR_CLIENT_INVALID_TWITTER_TOKEN':{
        errorCode:      419,
        errorMessage:   'Invalid Twitter access token',
        pipeToUser:     false
    },
    'ERROR_CLIENT_MISSING_TWITTER_LINK':{
        errorCode:      420,
        errorMessage:   'A user was found that matches the provided Twitter credentials, however, they have yet to link their account with Twitter',
        pipeToUser:     false
    }
};

var _serverErrors = {
    'ERROR_SERVER_UNKNOWN': {
        errorCode: 		501,
            errorMessage: 	'Unknown server error occured',
            pipeToUser:     false
    },
    'ERROR_SERVER_FAILED_TO_CREATE': {
        errorCode:     502,
            errorMessage:  'Failed to create new item',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_FIND': {
        errorCode:     503,
            errorMessage:  'Failed to find item',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_DELETE': {
        errorCode:     504,
            errorMessage:  'Failed to delete item',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_UPDATE': {
        errorCode:     505,
            errorMessage:  'Failed to update item',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_SEND_EMAIL': {
        errorCode:     506,
            errorMessage:  'Failed to send email',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_UPDATE_NEW_PASSWORD': {
        errorCode:     507,
            errorMessage:  "Failed to locate and update user's password",
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_SEARCH': {
        errorCode:     508,
            errorMessage:  'Search failed',
            pipeToUser:     false
    },
    'ERROR_SERVER_FAILED_TO_FOLLOW_USER': {
        errorCode:     509,
            errorMessage:  'Failed to follow user',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_UNFOLLOW_USER': {
        errorCode:     510,
            errorMessage:  'Failed to un-follow user',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_LIKE_MOMENT': {
        errorCode:     511,
            errorMessage:  'Failed to like moment',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_UNLIKE_MOMENT': {
        errorCode:     512,
            errorMessage:  'Failed to unlike moment',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_GET_LIKES': {
        errorCode:     513,
            errorMessage:  'Failed to fetch likes for moment',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_GET_FOLLOWERS': {
        errorCode:     514,
            errorMessage:  'Failed to fetch followers',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_GET_FOLLOWING': {
        errorCode:     515,
            errorMessage:  'Failed to fetch following users',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_ACKNOWLEDGE': {
        errorCode:     516,
            errorMessage:  'Failed to acknowledge notification',
            pipeToUser:    false
    },
    'ERROR_SERVER_FAILED_TO_SHARE_TO_FACEBOOK': {
        errorCode:     517,
        errorMessage:  'Failed to share with Facebook, please try again later.',
        pipeToUser:    true
    },
    'ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER': {
        errorCode:     518,
        errorMessage:  'Failed to share with Twitter, please try again later.',
        pipeToUser:    true
    }
};

function _PMError(inputError){
    var stockError = inputError;

    if(!stockError.hasOwnProperty('errorMessage')){
        //if this is a built in Error, try to grab it's message, if we can't, default to our stock UNKNOWN error
        if(stockError.hasOwnProperty('message')){
            stockError.errorMessage = stockError.message;
        }
        else{
            stockError.errorMessage = _clientErrors.ERROR_CLIENT_UNKNOWN.errorMessage;
        }
    }
    if(!stockError.hasOwnProperty('errorCode')){
        if(stockError.hasOwnProperty('code')){
            stockError.errorCode = stockError.code;
        }
        else{
            stockError.errorCode = _clientErrors.ERROR_CLIENT_UNKNOWN.errorCode;
        }
    }
    if(!stockError.hasOwnProperty('pipeToUser')){
        stockError.pipeToUser =  _clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.pipeToUser;
    }

    Error.call(this, stockError.errorMessage, stockError.errorCode);

    this.errorCode = stockError.errorCode;
    this.errorMessage = stockError.errorMessage;
    this.pipeToUser = stockError.pipeToUser;
}

_PMError.prototype = Object.create(Error.prototype);
_PMError.prototype.constructor = _PMError;

module.exports = {
	clientErrors: _clientErrors,

	serverErrors: _serverErrors,

	noError: {
		errorCode:     200,
		errorMessage:  '',
		pipeToUser:     false 
	},

    PMError: _PMError
};