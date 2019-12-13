/**
 *
 * Moment Controller
 *
 * @module      :: MomentController
 * @author      :: Isom Durm (isom@phenomapp.com)
 * @dateCreated :: 5/7/2014
 *
 * Defines Phenom API endpoints to access user Moment functionality
 *
 **/

/*
    globals Output, FacebookServices, TwitterServices, MomentServices, Validation, UploadServices, SpotifyServices
*/

var util = require('util');
var Promise = require('bluebird');

/**
 * Repost moment on FB
 * @private
 */
function _postToFacebook(req, res){
    var missingParams = Validation.validateParams(req, [
        "id"]);  //implied in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to share moment to Facebook', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_FACEBOOK);
    }
    else if(!req.accessToken.facebookAccessToken){
        sails.log.error('Failed to share moment to Facebook', {error: "Request object should have Facebook access token"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_FACEBOOK);
    }
    else{
        FacebookServices.postMoment(req.accessToken.facebookAccessToken, req.param('id'), req.user)
            .then(function(){
                Output.sendJSON(res, Errors.noError, {});
            })
            .catch(function(err){
                sails.log.error('Failed to share moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_FACEBOOK);
            });
    }
}

/**
 * Re-post moment on twitter
 * @private
 */
function _postToTwitter(req, res){
    var missingParams = Validation.validateParams(req, [
        "id"]);  //implied in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to share moment to Twitter', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }
    else if(!req.accessToken.twitterAccessToken || !req.accessToken.twitterTokenSecret){
        sails.log.error('Failed to share moment to Twitter', {error: "Request object should have Twitter access token"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }
    else{
        TwitterServices.postMoment(req.accessToken.twitterAccessToken, req.accessToken.twitterTokenSecret, req.param('id'), req.user)
            .then(function(){
                Output.sendJSON(res, Errors.noError, {});
            })
            .catch(function(err){
                sails.log.error('Failed to share moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
            });
    }
}

/**
 * Creates a comment for a moment action implementation
 * @private
 */
function _createMomentComment(req, res){
    var missingParams = Validation.validateParams(req, [
        "commentText", "id"
    ]); //implied id in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to comment on moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }
    else{
        //If the user supplied references, lets parse them out
        var commentReferences = req.param('references') ? req.param('references') : [];

        MomentServices.createMomentComment(req.param('id'), req.param('commentText'), commentReferences, req.user)
            .then(function(hydratedNewComment){
                Output.sendJSON(res, Errors.noError, {comment: hydratedNewComment});
            })
            .catch(function(err){
                sails.log.error('Failed to create comment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
            });
    }
}

/**
 * Gets existing comments for a moment by date
 * @private
 */
function _getMomentComments(req, res){
    var missingParams = Validation.validateParams(req, [
        "since",
        "id",
        "limit"
    ]); //implied id in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to share moment to Twitter', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }
    else{
        new Promise(function(resolve, reject){
            var sinceFloat = parseFloat(req.param('since'))

            if(isNaN(sinceFloat)){
                return reject(new Error('since must be UTC milliseconds'));
            }

            resolve(sinceFloat);
        })
            .then(function(sinceFloat) {
                return MomentServices.getMomentComments(req.param('id'), sinceFloat, req.param('limit'), req.user);
            })
            .then(function(comments){
                Output.sendJSON(res, Errors.noError, {results: comments});
            })
            .catch(function(err){
                sails.log.error('Failed to get comments for moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
            });
    }
}

/**
 * Creates moments under the authorized user
 * @private
 */

 function _uploadVideoImage(req, res){

    var missingParams = Validation.validateParams(req, [
        "momentId"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    else{
        //Lets make sure that we have a user for this Bearer
        if(!(req.user)){
            sails.log.error('Failed to find mongo user for adding moment', {error: 'Request object doesnt have user model instance'});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        }
        else{

            return UploadServices.getFileFromRequest(req, 'image')
                .then(function(imageData){
                    if(!imageData){
                        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: 'image'});
                    }
                    else{
                        return MomentServices.uploadMomentVideoImage(req.param("momentId"), imageData);
                    }
                })
        }

    }


 }
function _createMoment(req, res){

    var missingParams = Validation.validateParams(req, [
        "headline", "createdAt", "mode"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    else{
        //Lets make sure that we have a user for this Bearer
        if(!(req.user)){
            sails.log.error('Failed to find mongo user for adding moment', {error: 'Request object doesnt have user model instance'});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        }
        else{
            //some clients wrap the array of productIds inside another array, we need to check if that's the case and
            //adjust appropriately, ex: [ [ {productA}, {productB} ] ] -> [ {productA}, {productB} ]
            var productIds = [];

            if(util.isArray(req.param('productIds')) && req.param('productIds').length > 0){
                if(util.isArray(req.param('productIds')[0])){
                    req.param('productIds')[0].forEach(function(productId){
                        productIds.push(productId);
                    });
                }
                else{
                    req.param('productIds').forEach(function(productId){
                        productIds.push(productId);
                    });
                }
            }
            else{
                //some clients also choose to send a singular product as a string (not inside an array),
                //we will "array-ify"
                productIds.push(req.param('productIds'));
            }

            //if a song wasn't supplied, lets make sure we don't inject anything weird and that we can safely
            //parse what the user gave us (since they're giving us raw JSON as a string, gross.)
            var song = undefined;
            var croppedRect = undefined;

            try{
                if(req.param('song')){
                    song = JSON.parse(req.param('song'));
                }
            }
            catch(err) {
                song = undefined;  //let's let it persist this way
            }

            try{
                if(req.param('croppedRect')){
                    croppedRect = JSON.parse(req.param('croppedRect'));
                }
            }
            catch(err){
                croppedRect = undefined;
            }

            var references = req.param('references') ? req.param('references') : [];

            return UploadServices.getFileFromRequest(req, 'image')
                .then(function(imageData){
                    if(!imageData){
                        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: 'image'});
                    }
                    else{
                        return MomentServices.createMoment(
                            req.param('mode'),
                            productIds,
                            req.param("headline"),
                            imageData,
                            croppedRect,
                            song,
                            new Date(parseInt(req.param('createdAt'))),
                            references,
                            req.user
                        )
                            .then(function(momentBundle){
                                Output.sendJSON(res, Errors.noError, {momentId: momentBundle.moment.id, momentMode: momentBundle.moment.mode, momentHeadline: momentBundle.moment.headline, momentDate: momentBundle.moment.createdAt, momentProductIds: momentBundle.moment.productIds});
                            })
                    }
                })
                .catch(function(err){
                    sails.log.error('Failed to create moment', {error: err});
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
                });
        }
    }
}

function _createMomentVideo(req, res){

    var missingParams = Validation.validateParams(req, [
        "headline", "createdAt", "mode"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    else{
        //Lets make sure that we have a user for this Bearer
        if(!(req.user)){
            sails.log.error('Failed to find mongo user for adding moment', {error: 'Request object doesnt have user model instance'});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        }
        else{
            //some clients wrap the array of productIds inside another array, we need to check if that's the case and
            //adjust appropriately, ex: [ [ {productA}, {productB} ] ] -> [ {productA}, {productB} ]
            var productIds = [];

            if(util.isArray(req.param('productIds')) && req.param('productIds').length > 0){
                if(util.isArray(req.param('productIds')[0])){
                    req.param('productIds')[0].forEach(function(productId){
                        productIds.push(productId);
                    });
                }
                else{
                    req.param('productIds').forEach(function(productId){
                        productIds.push(productId);
                    });
                }
            }
            else{
                //some clients also choose to send a singular product as a string (not inside an array),
                //we will "array-ify"
                productIds.push(req.param('productIds'));
            }

            sails.log.error(productIds);
            //if a song wasn't supplied, lets make sure we don't inject anything weird and that we can safely
            //parse what the user gave us (since they're giving us raw JSON as a string, gross.)
            var song = undefined;
            var croppedRect = undefined;

            try{
                if(req.param('song')){
                    song = JSON.parse(req.param('song'));
                }
            }
            catch(err) {
                song = undefined;  //let's let it persist this way
            }

            try{
                if(req.param('croppedRect')){
                    croppedRect = JSON.parse(req.param('croppedRect'));
                }
            }
            catch(err){
                croppedRect = undefined;
            }

            var references = req.param('references') ? req.param('references') : [];

            return UploadServices.getFileFromRequest(req, 'image')
                .then(function(imageData){
                    if(!imageData){
                        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: 'image'});
                    }
                    else{
                        return MomentServices.createMomentVideo(
                            req.param('mode'),
                            productIds,
                            req.param("headline"),
                            imageData,
                            croppedRect,
                            song,
                            new Date(parseInt(req.param('createdAt'))),
                            references,
                            req.user
                        )
                            .then(function(momentBundle){
                                Output.sendJSON(res, Errors.noError, {momentId: momentBundle.moment.id, momentMode: momentBundle.moment.mode, momentHeadline: momentBundle.moment.headline, momentCrop: momentBundle.moment.croppedRect, momentDate: momentBundle.moment.createdAt, momentProductIds: momentBundle.moment.productIds});
                            })
                    }
                })
                .catch(function(err){
                    sails.log.error('Failed to create moment', {error: err});
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
                });
        }
    }
}

/**
 * Fetches moments directly by id, this route can be used to fetch the latest and greatest information about
 *  the moment defined by momentId
 * @private
 */

function _findForWebProfiles(req, res){
    var missingParams = Validation.validateParams(req, [
        "momentId"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{

    MomentServices.findMomentForWebProfiles(req.param('momentId'))
        .then(function(moment){
            Output.sendJSON(res, Errors.noError, {results: moment});
        })
        .catch(function(err){
            sails.log.error('Failed to find moment', {error:  err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
    }
}

function _curateMoments(req, res){

    MomentServices.findMomentsForWeb()
        .then(function(moments){
            Output.sendJSON(res, Errors.noError, {results: moments});
        })
        .catch(function(err){
            sails.log.error('Failed to find moment', {error:  err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
     
}

function _topTenFeed(req, res){
    MomentServices.getTopTenFeed(req.param('momentIds'))
        .then(function(moments){
            Output.sendJSON(res, Errors.noError, {results: moments});
        })
        .catch(function(err){
            sails.log.error('Failed to find moment', {error:  err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });   
}

function _find(req, res){
    var missingParams = Validation.validateParams(req, [
        "momentId"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else{
        //Lets make sure that we have a user for this Bearer
        if(!(req.user)){
            sails.log.error('Failed to find mongo user for getting moments', {error: 'Request object doesnt have user model instance'});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        }
        else{

            var summaryOnly = req.param('summary') ? req.param('summary') : false;

            MomentServices.findMoment(req.param('momentId'), summaryOnly, req.user)
                .then(function(moment){
                    Output.sendJSON(res, Errors.noError, {results: moment});
                })
                .catch(function(err){
                    sails.log.error('Failed to find moment', {error:  err});
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
                });
        }
    }
}

function _getFeed(req, res){
    var missingParams = Validation.validateParams(req, [
        "date", "amount"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to fetch public feed', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }
    else{

        //Feed Type depricated.

        MomentServices.getFeed(new Date().setTime(req.param('date')), req.param("amount"), req.user)
            .then(function(moments){
                Output.sendJSON(res, Errors.noError, {results: moments});
            })
            .catch(function(err){
                sails.log.error('Failed to find moment', {error:  err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
            });
    }
}

/**
 * Search endpoint for moment music
 * @private
 */
function _searchForSongs(req, res){
    var missingParams = Validation.validateParams(req, [
        "searchString"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to search for songs', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }
    else{
        var pageNumber = 1;

        //if the user gave us a pageNumber (offset), use it, otherwise, the service defaults to offset = 0
        if(req.param('pageNumber')){
            pageNumber = req.param('pageNumber');
        }

        SpotifyServices.searchForSongs(req.param('searchString'), pageNumber)
            .then(function(results){
                Output.sendJSON(res, Errors.noError, {results: results, pageNumber: pageNumber});
            })
            .catch(function(err){
                var msg = err.hasOwnProperty('message') ? err.message : "";
                sails.log.error('Failed to search Spotify for: ', {error:  msg});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
            });
    }
}

/**
 * Responds to moment updates.  Currently, this action only supports updates to the following attributes:
 *    -flaggedAsInappropriate - boolean
 *
 * @private
 */
function _update(req, res){
    var missingParams = Validation.validateParams(req, [
        "momentId"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to update moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
    }
    else{
        var attributesToUpdate = {};

        if(req.param("flaggedAsInappropriate")){
            attributesToUpdate.flaggedAsInappropriate  = req.param('flaggedAsInappropriate') === "true" || req.param('flaggedAsInappropriate') === "1";    //"true" string -> true boolean
        }

        MomentServices.updateMoment(req.param("momentId"), attributesToUpdate, req.user)
            .then(function(momentId){
                Output.sendJSON(res, Errors.noError, {results: momentId});
            })
            .catch(function(err){
                sails.log.error('Failed to update moment', {error:  err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
            });
    }
}

/**
 * Action which likes a particular moment by the authorized user
 * @private
 */
function _like(req, res){

    var missingParams = Validation.validateParams(req, ["id"]);  //implied in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to like moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_LIKE_MOMENT);
    }
    else{
        MomentServices.like(req.param('id'), req.user)
            .then(function(){
                Output.sendJSON(res, Errors.noError, {});
            })
            .catch(function(err){
                sails.log.error('Failed to like moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_LIKE_MOMENT);
            });
    }
}

/**
 * Action which unlikes a particular moment by the authorized user
 * @private
 */
function _unlike(req, res){
    var missingParams = Validation.validateParams(req, ["id"]);  //implied in the URL

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to unlike moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UNLIKE_MOMENT);
    }
    else{
        MomentServices.unlike(req.param('id'), req.user)
            .then(function(){
                Output.sendJSON(res, Errors.noError, {});
            })
            .catch(function(err){
                sails.log.error('Failed to unlike moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UNLIKE_MOMENT);
            });
    }
}

/**
 * Action which returns a paginated set of "likes" associated with a particular moment
 * @private
 */
function _getLikes(req, res){
    var missingParams = Validation.validateParams(req, [
        'id',    //implied in the URL
        'limit',
        'since']);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to update moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_GET_LIKES);
    }
    else{

        new Promise(function(resolve, reject){
            var sinceFloat = parseFloat(req.param('since'))

            if(isNaN(sinceFloat)){
                return reject(new Error('since must be UTC milliseconds'));
            }

            resolve(sinceFloat);
        })
            .then(function(sinceFloat){
                return MomentServices.getLikes(req.param('id'), sinceFloat, req.param('limit'), req.user);
            })
            .then(function(likes){
                Output.sendJSON(res, Errors.noError, {
                    results:    likes.likes,
                    likesCount: likes.likesCount,
                    cursor:     likes.cursor
                });
            })
            .catch(function(err){
                sails.log.error('Failed to get likes for moment', {error: err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_GET_LIKES);
            });
    }
}

/**
 * Soft delete action implementation
 * @private
 */

function _destroy(req, res){
    var missingParams = Validation.validateParams(req, ['id']);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to update moment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
    }
    else{
        MomentServices.destroyMoment(req.param('id'), req.user)
            .then(function(){
                Output.sendJSON(res, Errors.noError, {});
            })
            .catch(function(err){
                sails.log.error('Failed to delete moment', {error: err});

                if(err.message == Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS.errorMessage){
                    Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS);
                }
                else{
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
                }
            });
    }
}

/**
 *   Module Interface
 */
 module.exports = {
     /**
      *  Creates moments under the authorized user
      *
      *  @param req
      *  @param res
      */
	create: _createMoment,

    uploadVideo: _createMomentVideo,

     /**
      * Fetches moments directly by id, this route can be used to fetch the latest and greatest information about
      *  the moment defined by momentId
      *
      *  @param req
      *  @param res
      */
    find: _find,

    findMomentForWebProfiles: _findForWebProfiles,

     /**
      *  Fetches moments made by any user, sorted by date, facilitates the 'feed'.  Feed types are selected
      *  via the 'feedType' parameter.  Possible types include:
      *  'default' - this is the public feed, sorted by date, most recent first
      *  'following - 1; moments only consisting of those the authenticated user follows
      *
      *  @param req
      *  @param res
      */
    getFeed: _getFeed,

     /**
      * Search endpoint for moment music
      * @param req
      * @param res
      */
    searchForSongs: _searchForSongs,

     /**
      * Responds to moment updates.  Currently, this action only supports updates to the following attributes:
      *    -flaggedAsInappropriate - boolean
      *
      * @param req
      * @param res
      */
     update: _update,

     /**
      * Action which likes a particular moment by the authorized user
      *
      * @param req
      * @param res
      */
     like: _like,

     /**
      * Action which unlikes a particular moment by the authorized user
      *
      *  @param req
      *  @param res
      */
     unlike: _unlike,

     /**
      * Action which returns a paginated set of "likes" associated with a particular moment
      *
      *  @param req
      *  @param res
      */
     getLikes: _getLikes,

     /**
      * Soft-delete a moment
      *
      *  @param req
      *  @param res
      */
     destroy: _destroy,

     /**
      * Re-post a moment on FB
      *
      *  @param req
      *  @param res
      */
     postToFacebook: _postToFacebook,

     /**
      * Re-post a moment on Twitter
      *
      *  @param req
      *  @param res
      */
     postToTwitter: _postToTwitter,

     /**
      * Comments on a moment
      *
      *  @param req
      *  @param res
      */
     createMomentComment: _createMomentComment,

     curateMoments: _curateMoments,

     topTenFeed: _topTenFeed,

     /**
      * Gets existing comments for a moment by date
      *
      *  @param req
      *  @param res
      */
     getMomentComments: _getMomentComments,

     uploadVideoImage: _uploadVideoImage
};