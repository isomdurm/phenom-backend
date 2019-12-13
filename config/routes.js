/**
 * Custom Routes
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 *  Normally, traditional HTTP CRUD verbs wire up to their respective waterline.js action, but in some
 *  cases, we need custom routes to match to custom controller actions.
 *
 *  For more information on routes, check out:
 *  http://sailsjs.org/#documentation
 */

module.exports.routes = {
    //root page, just the Phenom logo
    '/': {
      view: 'home/index'
    },

    /**
     *    Authorization Custom Routes
     */
    'post /oauth/token':             'AuthController.credentialExchange',
    'delete /oauth/token':           'AuthController.deauthorize',
    'post /oauth/facebook/token':    'AuthController.facebookTokenExchange',
    'post /oauth/twitter/token':     'AuthController.twitterTokenExchange',

    /**
     *    UserController Custom Routes
     */
    'get /user/resetPassword':  'UserController.resetPassword',
    'get /user/forgotUsername': 'UserController.forgotUsername',
    'post /user/invite':        'UserController.createInvite',
    'put /user':                'UserController.update',        //annoying, but yes, Sails v10 autogen blueprint 
                                                                //requires an :id, which we do not require because
                                                                //we override this function
    'post /user/:id/follow':      'UserController.follow',
    'delete /user/:id/unfollow':  'UserController.unfollow',
    'get /user/following':        'UserController.findFollowing',
    'get /user/followers':        'UserController.findFollowers',
    'get /user/search':           'UserController.findUsers',      // GET /user is reserved for the authenticated user
    'get /user/invite/search':    'UserController.findUsersByEmail',
    'get /user/facebook/friends': 'UserController.findFacebookFriends',
    'get /user/:id':              'UserController.getUserById',
    'get /user/:id/locker':       'UserController.getLocker',
    'get /user/:id/moments':      'UserController.getMoments',
    'get /user/:id/followers':    'UserController.getFollowers',
    'get /user/:id/following':    'UserController.getFollowing',
    'get /emails':                'UserController.findUsersEmails',
    'get /usernames':             'UserController.findUsersUsernames',
    'get /userForWeb':            'UserController.getUserByIdForWeb',

    /** 
     *    ChangePasswordController Custom Routes
     **/
    'get  /support/resetPassword':   'ChangePasswordController.renderChangePasswordForm',
    'post /support/resetPassword':   'ChangePasswordController.handleChangePasswordFormSubmit',

    /**
     *    ProductController Custom Routes
     **/
    'post /product/:id/comment':    'ProductController.comment',
    'get  /product/:id/comments':   'ProductController.getComments',

    /** 
     *    LockerController Custom Routes
     **/
    'put    /locker':     'LockerController.update',
    'delete /locker':     'LockerController.destroy',
    'get    /locker':     'LockerController.find',

     /**
      *    MomentController Custom Routes
      **/
     'get     /moment/feed':                   'MomentController.getFeed',
     'get     /moment/searchForSongs':         'MomentController.searchForSongs',
     'post    /moment/:id/like':               'MomentController.like',
     'delete  /moment/:id/unlike':             'MomentController.unlike',
     'get     /moment/:id/likes':              'MomentController.getLikes',
     'delete  /moment/:id':                    'MomentController.destroy',
     'put     /moment':                        'MomentController.update',
     'post    /moment/:id/share/facebook':     'MomentController.postToFacebook',
     'post    /moment/:id/share/twitter':      'MomentController.postToTwitter',
     'post    /moment/:id/comment':            'MomentController.createMomentComment',
     'get     /moment/:id/comments':           'MomentController.getMomentComments',
     'post    /uploadVideo':                   'MomentController.uploadVideo',
     'post    /uploadVideoImage':              'MomentController.uploadVideoImage',
     'get     /webProfiles':                   'MomentController.findMomentForWebProfiles',
     'get     /webFeed':                       'MomentController.curateMoments',
     'get     /topTenFeed':                    'MomentController.topTenFeed',

    /**
     *     NotificationController Custom Routes
     */
    'post /notification/acknowledge':      'NotificationController.acknowledge',
    'put /notification/updatePreferences': 'NotificationController.updatePreferences',
    'put /notification/device':            'NotificationController.updateDevice',
    'delete /notification/device':         'NotificationController.removeDevice',
    'delete /notification/:id':            'NotificationController.destroy',


    /**
     *      DiscoverController Custom Routes
     */
    'get /discover/people':            'DiscoverController.getDefaultDiscoverPeople',
    'get /discover/people/featured':   'DiscoverController.getDiscoverFeaturedPeople',
    'get /discover/gear':              'DiscoverController.getDefaultDiscoverGear',
    'get /discover/gear/featured':     'DiscoverController.getDiscoverFeaturedGear',
    'get /discover/music':             'DiscoverController.getDefaultDiscoverMusic',
    'get /discover/moment/featured':   'DiscoverController.getDiscoverFeaturedMoments',

    /**
     *      CommentController Custom Routes
     */
    'get /comment/:id':        'CommentController.find',
    'put /comment/:id':        'CommentController.update',
    'delete /comment/:id':     'CommentController.destroy'
};
