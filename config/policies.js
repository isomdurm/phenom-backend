/**
 * Policy mappings (ACL)
 *
 * @module      :: policies
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Policies are simply Express middleware functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect just one of its actions.
 *
 * Any policy file (e.g. `authenticated.js`) can be dropped into the `/policies` folder,
 * at which point it can be accessed below by its filename, minus the extension, (e.g. `authenticated`)
 *
 * For more information on policies, check out:
 * http://sailsjs.org/#documentation
 */

var defaultPolicies = [
	'VersionSupported', //Request requires 'APIVersion' header
	'RequiresAnyBearerToken',       //Request requires 'Bearer token' in Authorization header
	'DisableSession'    //Explicitly kill session support
];

var defaultFacebookPolicies = [
	'VersionSupported',              //Request requires 'APIVersion' header
	'RequiresFacebookBearerToken',   //Request requires 'Bearer token' in Authorization header of Facebook type
	'DisableSession'                 //Explicitly kill session support
];

var defaultTwitterPolicies = [
	'VersionSupported',              //Request requires 'APIVersion' header
	'RequiresTwitterBearerToken',   //Request requires 'Bearer token' in Authorization header of Facebook type
	'DisableSession'                 //Explicitly kill session support
];

module.exports.policies = {

  	// Default policy for all controllers and actions
  	// (`true` allows public access) 
  	'*': true,
	'AuthController': {
		'credentialExchange': 			['VersionSupported', 'ClientPasswordAuth'],
		'facebookTokenExchange': 		['VersionSupported', 'ClientPasswordAuth', 'RequiresFacebookAccessToken'],
		'twitterTokenExchange':         ['VersionSupported', 'ClientPasswordAuth', 'RequiresTwitterAccessToken'],
		'deauthorize': 					['VersionSupported', 'RequiresAnyBearerToken']
	},
  	'UserController': {
		'*':                  			false,
		'create':  			  			['VersionSupported', 'ClientOnlyAuth', 'DisableSession'],
  		'resetPassword':      			['VersionSupported', 'ClientOnlyAuth', 'DisableSession'],
		'forgotUsername':				['VersionSupported', 'ClientOnlyAuth', 'DisableSession'],
		'find':    			  			defaultPolicies,
		'update':  			  			defaultPolicies,
		'destroy': 			  			defaultPolicies,
		'createInvite':       			defaultPolicies,
		'follow':             			defaultPolicies,
		'unfollow':           			defaultPolicies,
		'findFollowers':      			defaultPolicies,
		'findFollowing':      			defaultPolicies,
		'findUsers':          			defaultPolicies,
		'getUserById':        			defaultPolicies,
		'getLocker':          			defaultPolicies,
		'getMoments':         			defaultPolicies,
		'getFollowers':       			defaultPolicies,
		'getFollowing':       			defaultPolicies,
		'findUsersByEmail':  			defaultPolicies,
		'findFacebookFriends':			defaultFacebookPolicies,
		'findUsersEmails':    			['VersionSupported'],
		'findUsersUsernames':    	    ['VersionSupported'],
		'getUserByIdForWeb':  			true
  	},
  	'ProductController': {
		'*':                  			false,
  		'find':               			defaultPolicies,
		'comment':						defaultPolicies,
		'getComments':					defaultPolicies,
  	},
  	'LockerController': {
      '*':                    			false,
  		'find':               			defaultPolicies,
  		'update':             			defaultPolicies,
  		'destroy':            			defaultPolicies
  	},
  	'MomentController':{
		'*':                  			false,
  		'create':             			defaultPolicies,
		'destroy':            			defaultPolicies,
  		'find':               			defaultPolicies,
		'update':             			defaultPolicies,
  		'getFeed':            			defaultPolicies,
  		'searchForSongs':     			defaultPolicies,
		'like':               			defaultPolicies,
		'unlike':             			defaultPolicies,
		'getLikes':           			defaultPolicies,
		'postToFacebook':				defaultFacebookPolicies,
		'postToTwitter':				defaultTwitterPolicies,
		'getMomentComments':			defaultPolicies,
		'createMomentComment':			defaultPolicies,
		'uploadVideoImage':				defaultPolicies,
		'uploadVideo':				    defaultPolicies,
		'findMomentForWebProfiles':		true,
		'curateMoments':		        true,
		'topTenFeed':		        true
  	},
	'NotificationController':{
		'*':                  			false,
		'updatePreferences':  			defaultPolicies,
		'destroy':            			defaultPolicies,
		'acknowledge':        			defaultPolicies,
		'updateDevice':       			defaultPolicies,
		'removeDevice':       			defaultPolicies,
		'find':               			defaultPolicies
	},
    DiscoverController:{
        '*':                            false,
        'getDefaultDiscoverPeople':     defaultPolicies,
        'getDefaultDiscoverGear':       defaultPolicies,
        'getDefaultDiscoverMusic':      defaultPolicies,
		'getDiscoverFeaturedPeople':    defaultPolicies,
		'getDiscoverFeaturedGear':      defaultPolicies,
		'getDiscoverFeaturedMoments':   defaultPolicies
    },
	CommentController:{
		'*':                            false,
		'find':							defaultPolicies,
		'update':						defaultPolicies,
		'destroy':                      defaultPolicies
	}
};
