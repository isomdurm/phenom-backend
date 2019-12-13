/**
*
* UserController
*
* @module      :: UserController
* @author      :: Isom Durm (isom@phenomapp.com)
*
* Provides common CRUD actions for the User controller
*
**/

var Promise = require('bluebird');
var moment = require('moment');


/**
* Action blueprints:
*    `/user/create`
*/
function _create(req, res) {
    var missingParams = Validation.validateParams(req, [
        "username",
        "firstName",
        "lastName",
        "email"]);

    if (missingParams.length > 0) {
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else {
        UploadServices.getFileFromRequest(req, 'image')
            .then(function (imageData) {

                var facebookId = undefined;
                if (req.param('facebookId')) {
                    facebookId = req.param('facebookId');
                }

                var suppressEmail = false;
                if (req.param('suppressEmail')) {
                    suppressEmail = (req.param('suppressEmail') === true || req.param('suppressEmail') === 'true');
                }

                return UserServices.createUser(
                    req.baseUrl,
                    req.param('username'),
                    req.param('password'),
                    req.param('firstName'),
                    req.param('lastName'),
                    req.param('email'),
                    req.param('gender'),
                    req.param('hometown'),
                    req.param('sports'),
                    req.param('birthDate'),
                    imageData,
                    facebookId,
                    suppressEmail
                )
                    .then(function () {
                        Output.sendJSON(res, Errors.noError);
                    });
            })
            .catch(function (err) {
                Output.sendJSON(res, err);
            });


    }
}

/**
 * Locate a user by email
 */
function _find(req, res){
    if(!(req.user)){
        sails.log.error('Failed to find mongo user with error', {error: 'Request object doesnt have user model instance'});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }

    //public user object
    req.user.toJSON()
        .then(function(user){
            Output.sendJSON(res, Errors.noError, user);
        })
        .catch(function(err){
            sails.log.error("Couldnt get cloudfront signed URL", err);
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
}

/**
 * Remove a User by moving it to a deleted User collection
 */
function _destroy(req, res) {
    if(!(req.user)){
        sails.log.error('Failed to find mongo user for deletion', {error: 'Request object doesnt have user model instance'});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
    }
    else{
        //first destroy the user's private data, we'll nest these to verify that everything gets deleted propertly
        UsersPrivate.findOne({userId:  req.user.id})
            .then(function(userPrivate){
                if(userPrivate){
                    return userPrivate.destroy();
                }
                else{
                    throw new Error("No user data found"); //fall through to the fail block
                }
            })
            .then(function(){
                return req.user.destroy();
            })
            .then(function(){
                req.user = undefined;   //this should no longer be valid
                Output.sendJSON(res, Errors.noError);
            })
            .catch(function(err){
                sails.log.error('Failed to destroy user', err);
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
            });
    }
}


/**
 * Update public attributes
 */
function _update(req, res) {
    if(!(req.user)){
        sails.log.error('Failed to find mongo user for update', {error: 'Request object doesnt have user model instance'});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
    }
    else{

        var updates = {};

        //apply public property updates if necessary
        if(req.param('firstName')){
            updates.firstName = req.param('firstName');
        }

        if(req.param('lastName')){
            updates.lastName = req.param('lastName');
        }

        if(req.param('hometown')){
            updates.hometown = req.param('hometown');
        }

        var newDesc = req.param('description')
        if(newDesc !== undefined){
            updates.description = newDesc;
        }

        var oldEmail = req.user.email;

        if(req.param('username')){
            updates.username = req.param('username');
        }

        if(req.param('gender')){
            updates.gender = req.param('gender');
        }

        if(req.param('birthDate')){
            updates.birthDate = req.param('birthDate');
        }

        if(req.param('sports')){
            updates.sports = req.param('sports');
        }

        if(req.param('email')){
            updates.email = req.param('email');
        }

        if(req.param('password')){
            updates.password = req.param('password');
        }

        if(req.param('facebookId')){
            updates.facebookId = req.param('facebookId');
        }

        if(req.param('twitterId')){
            updates.twitterId = req.param('twitterId');
        }

        var thingsUpdated = _.cloneDeep(updates);

        UploadServices.getFileFromRequest(req, 'image')
            .then(function(imageData){
                if(imageData){
                    updates.imageData = imageData;
                }

                return UserServices.updateUser(updates, req.user);
            })
            .then(function(user){
                Output.sendJSON(res, Errors.noError);

                //This is fire and forget
                if(thingsUpdated.hasOwnProperty('firstName')
                    || thingsUpdated.hasOwnProperty('lastName')
                    || thingsUpdated.hasOwnProperty('email')
                    || thingsUpdated.hasOwnProperty('hometown')
                    || thingsUpdated.hasOwnProperty('username')
                    || thingsUpdated.hasOwnProperty('sport')
                ){
                    EmailServices.updateMailRecipient(user, oldEmail);
                    AnalyticsServices.reportUserUpdate(user);
                }
            })
            .catch(function(err){
                Output.sendJSON(res, err);  //the promise chain selects the right error to go here
            });
    }
}

/**
 * Reset Password action
 */
function _resetPassword(req, res){
    var missingParams = Validation.validateParams(req, [
        "email"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        ChangePassword.sendResetPasswordRequest(req.param('email'), req.baseUrl, false)
            .then(function(result){
                Output.sendJSON(res, Errors.noError, {response: result});
            })
            .catch(function(err){
                if(err.constructor == Errors.PMError){
                    Output.sendJSON(res, err);
                }
                else{
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEND_EMAIL, {error: err});
                }
            });
    }
}

/**
 * Forgot Username/PhenomId action
 */
function _forgotUsername(req, res){
    var missingParams = Validation.validateParams(req, [
        "email"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        ChangePassword.sendForgotPhenomIdRequest(req.param('email'))
            .then(function(result){
                Output.sendJSON(res, Errors.noError, {response: result});
            })
            .catch(function(err){
                if(err.constructor == Errors.PMError){
                    Output.sendJSON(res, err);
                }
                else{
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEND_EMAIL, {error: err});
                }
            });
    }
}

/**
 *    Action which handles requests to invite new users to Phenom
 */
function _createInvite(req, res){
    if(!(req.user)){
        sails.log.error('Request must have user object in order to invite friends', {error: new Error('Request object doesnt have user model instance')});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEND_EMAIL);
        return;
    }

    var missingParams = Validation.validateParams(req, [
        'email', 'firstName', 'lastName']);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.inviteUser(req.param('email'), req.param('firstName'), req.param('lastName'), req.user)
            .then(function(result){
                Output.sendJSON(res, Errors.noError, {response: result});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEND_EMAIL, {error: err});
            });
    }
}

/**
 *    Action which handles requests to follow another user
 */
function _follow(req, res){
    if(!(req.user)){
        sails.log.error('Request must have user object in order to follow', {error: new Error('Request object doesnt have user model instance')});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FOLLOW_USER);
        return;
    }

    var missingParams = Validation.validateParams(req, [
        "id"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.follow(req.param('id'), req.user, req.baseUrl)
            .then(function(result){
                Output.sendJSON(res, Errors.noError);
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FOLLOW_USER, {error: err});
            });
    }
}

/**
 *    Action which handles requests to un-follow another user
 */
function _unfollow(req, res){
    if(!(req.user)){
        sails.log.error('Request must have user object in order to follow', {error: new Error('Request object doesnt have user model instance')});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FOLLOW_USER);
        return;
    }

    var missingParams = Validation.validateParams(req, [
        "id"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.unfollow(req.param('id'), req.user, req.baseUrl)
            .then(function(result){
                Output.sendJSON(res, Errors.noError);
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UNFOLLOW_USER, {error: err});
            });
    }
}

/**
 *   Handles paginated search for current user's followers
 */
function _findFollowing(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "since", "limit"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.findFollowing(req.param('since'), req.param('limit'), req.user, req.user)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results.following, pageNumber: results.pageNumber, followingCount: results.followingCount});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
            });
    }
}

/**
 *   handles paginated search users which the current user is following
 */
function _findFollowers(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "since", "limit"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.findFollowers(req.param('since'), req.param('limit'), req.user, req.user)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results.followers, pageNumber: results.pageNumber, followersCount: results.followersCount});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
            });
    }
}

/**
 *   Handles paginated user search functionality.  Clients can search on the following free-text criteria:
 *     -username
 *     -firstName
 *     -lastName
 *
 *   For example, a search string 'bob' will return results that match userName OR firstName OR lastName == bob
 */
function _findUsers(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "pageNumber", "query"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.findUsers(req.param('query'), req.param('pageNumber'), req.user)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results, pageNumber: req.param('pageNumber')});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
            });
    }
}

function _getEmails(req, res){

    console.log('got here');

        UserServices.findFollowers(req.param('since'), req.param('limit'), req.user, req.user)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results.followers, pageNumber: results.pageNumber, followersCount: results.followersCount});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
            });
}

/**
 * Responds to GET /user/:id
 * @param req
 * @param res
 */
function _getUserById(req, res){
    var missingParams = Validation.validateParams(req, [
            "id"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!(req.user)){
        sails.log.error(new Error("Failed to find mongo user with error, request object doesn't have user model instance"));
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }
    else{
        UserServices.getUserPublicData(req.param('id'), req.user)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });
    }

}


function _getUserByIdForWeb(req, res){
    var missingParams = Validation.validateParams(req, [
            "userId"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    else{
        UserServices.getUserPublicDataForWeb(req.param('userId'))
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results});
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });
    }

}
/**
 * Responds to GET /user/:id/locker.  This is used to fetch products from some user's locker
 * @param req
 * @param res
 */
function _getLocker(req, res){
    var missingParams = Validation.validateParams(req, [
            "since", "limit", "id"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        new Promise(function(resolve, reject){
            var sinceFloat = parseFloat(req.param('since'));
            var limitInt = parseInt(req.param('limit'));

            if(sinceFloat == NaN){
                reject(new Error('since param must be UTC milliseconds'));
            }

            if(limitInt == NaN || limitInt < 1){
                reject(new Error('limit must be positive integer'));
            }

            resolve({
                since: sinceFloat,
                limit: limitInt
            });
        })
            .then(function(parsedParams){
                return LockerServices.getProducts(req.param('id'), parsedParams.since, parsedParams.limit, req.user)
            })
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                    results:      results.products,
                    productCount: results.productCount,
                    cursor:       results.cursor
                });
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });
    }
}

/**
 * Responds to GET /user/:id/moment, this is used to fetch moments authored by some user, usually a user other than
 * the one that is authenticated and making this request.
 *
 * @param req
 * @param res
 */
function _getMoments(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "since", "limit", "id"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        User.findOne({
            id: req.param('id')
        })
            .then(function(otherUser) {
                if(!otherUser){
                    throw new Error('User not found');
                }
                else{

                    var sinceFloat = parseFloat(req.param('since'));
                    var limitInt = parseInt(req.param('limit'));

                    if(sinceFloat == NaN){
                        throw new Error('since param must be UTC milliseconds');
                    }

                    if(limitInt == NaN || limitInt < 1){
                        throw new Error('limit must be positive integer');
                    }

                    return MomentServices.getUserMoments(otherUser, sinceFloat, limitInt, req.user);
                }
            })
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                    results:     results.results,
                    momentCount: results.momentCount,
                    cursor:      results.cursor
                });
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });

    }
}

/**
 * Responds to GET /user/:id/following, paginated
 * @param req
 * @param res
 */
function _getFollowing(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "since", "limit", "id"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        User.findOne({
            id: req.param('id')
        })
            .then(function(user){
                if(!user){
                    throw new Error('User not found');
                    return;
                }

                var sinceFloat = parseFloat(req.param('since'))

                if(sinceFloat == NaN){
                    throw new Error('since must be UTC milliseconds');
                }

                var limitInt = parseInt(req.param('limit'));

                if(limitInt == NaN || limitInt < 1){
                    throw new Error('Limit param must be a positive integer');
                }

                return UserServices.findFollowing(sinceFloat, limitInt, user, req.user);
            })
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                    results:        results.following,
                    followingCount: results.followingCount,
                    cursor:         results.cursor
                });
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });
    }
}

/**
 * Responds to GET /user/:id/followers, paginated
 * @param req
 * @param res
 */
function _getFollowers(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        return;
    }

    var missingParams = Validation.validateParams(req, [
            "since", "limit", "id"]
    );

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        User.findOne({
            id: req.param('id')
        })
            .then(function(user){
                if(!user){
                    throw new Error('User not found');
                    return;
                }

                var sinceFloat = parseFloat(req.param('since'))

                if(sinceFloat == NaN){
                    throw new Error('since must be UTC milliseconds');
                }

                var limitInt = parseInt(req.param('limit'));

                if(limitInt == NaN || limitInt < 1){
                    throw new Error('Limit param must be a positive integer');
                }

                return UserServices.findFollowers(sinceFloat, limitInt, user, req.user);
            })
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {
                    results: results.followers,
                    followersCount: results.followersCount,
                    cursor:         results.cursor
                });
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: err});
            });
    }
}

function _findUsersEmails(req, res){

    console.log('got here');

    var missingParams = Validation.validateParams(req, ["searchString"]);

    console.log(req.param('searchString'));

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    
    } else {
        UserServices.getEmails(req.param('searchString'))
        .then(function(users){
            console.log(users);

            var results = [];

            users.forEach(function(user){
                results.push(user.email);
            })

            Output.sendJSON(res, {
                results: results
            });
        })
        .catch(function(error){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: error});
        });

    }
}

function _findUsersUsernames(req, res){

    var missingParams = Validation.validateParams(req, ["searchString"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    
    } else {
        UserServices.getUsernames(req.param('searchString'))
        .then(function(users){
            console.log(users);

            var results = [];

            users.forEach(function(user){
                results.push(user.username.toLowerCase());
            })

            Output.sendJSON(res, {
                results: results
            });
        })
        .catch(function(error){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: error});
        });

    }
}

function _findUsersByEmail(req, res){
    if(!(req.user)){
        sails.log.error("Request must have user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        return;
    }

    var missingParams = Validation.validateParams(req, ["emails"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.findUsersByEmail(req.user, req.param('emails'))
        .then(function(users){
            Output.sendJSON(res, {
                results: users
            });
        })
        .catch(function(error){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: error});
        });
    }
}

function _findFacebookFriends(req, res){
    if(!(req.user) || !req.accessToken.facebookAccessToken){
        sails.log.error("Request must have FB-linked user object in order to get following list", {error: new Error("Request object doesn't have user model instance")});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        return;
    }

    var missingParams = Validation.validateParams(req, ["pageNumber"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        UserServices.findFacebookFriends(req.user, req.accessToken.facebookAccessToken, req.param('pageNumber'))
            .then(function(users){
                Output.sendJSON(res, Errors.noError, {
                    results: users
                });
            })
            .catch(function(error){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND, {error: error});
            });
    }
}

module.exports = {
    create:                     _create,
    find:                       _find,
    destroy:                    _destroy,
    update:                     _update,
    resetPassword:              _resetPassword,
    forgotUsername:             _forgotUsername,
    createInvite:               _createInvite,
    follow:                     _follow,
    unfollow:                   _unfollow,
    findFollowing:              _findFollowing,
    findFollowers:              _findFollowers,
    findUsers:                  _findUsers,
    getUserById:                _getUserById,
    getLocker:                  _getLocker,
    getMoments:                 _getMoments,
    getFollowing:               _getFollowing,
    getFollowers:               _getFollowers,
    findUsersByEmail:           _findUsersByEmail,
    findFacebookFriends:        _findFacebookFriends,
    findUsersEmails:            _findUsersEmails,
    findUsersUsernames:         _findUsersUsernames,
    getUserByIdForWeb:          _getUserByIdForWeb
};
