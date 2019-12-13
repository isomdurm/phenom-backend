/**
 *
 * Product Controller
 *
 * @module      :: ProductController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines Phenom API endpoints to access Product Search functionality
 *
 **/

/*
    globals ProductServices, Validation, Output
*/

/**
 * GET /product  -> Product Search
 * @private
 */
function _searchForProducts(req, res){
    var missingParams = Validation.validateParams(req, [
        "query"]);

    if(missingParams.length > 0){
        //we need something more helpful than invalid params, something like, hey, we didn't recognize this password
        //reset request
        return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to search for products', {error: "Request object doesn't have user model instance"});
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
    }

    var scrollId = undefined;

    if(req.param('scrollId')){
        scrollId = req.param('scrollId');
    }

    ProductServices.search(req.param('query'), scrollId, req.user)
        .then(function(results){
            Output.sendJSON(res, Errors.noError, {results: results});
        })
        .catch(function(err){
            sails.log.error("Failed to search for products", {err: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, err);
        });
}

/**
 * POST /product/:id/comment
 * @private
 */
function _createComment(req, res){
    var missingParams = Validation.validateParams(req, [
        "commentText", "id"
    ]); //implied id in the URL

    if(missingParams.length > 0){
        return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to comment on moment', {error: "Request object doesn't have user model instance"});
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }

    //If the user supplied references, lets parse them out
    var commentReferences = req.param('references') ? req.param('references') : [];

    ProductServices.createComment(req.param('id'), req.param('commentText'), commentReferences, req.user)
        .then(function(hydratedNewComment){
            Output.sendJSON(res, Errors.noError, {comment: hydratedNewComment});
        })
        .catch(function(err){
            sails.log.error('Failed to create comment', {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
        });
}

/**
 * Gets existing comments for a product by date
 * @private
 */
function _getComments(req, res){
    var missingParams = Validation.validateParams(req, [
        "since",
        "id",
        "limit"
    ]); //implied id in the URL

    if(missingParams.length > 0){
        return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to share moment to Twitter', {error: "Request object doesn't have user model instance"});
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SHARE_TO_TWITTER);
    }

    new Promise(function(resolve, reject){
        var sinceFloat = parseFloat(req.param('since'));

        if(isNaN(sinceFloat)){
            return reject(new Error('since parameter must be UTC milliseconds'));
        }

        resolve(sinceFloat);
    })
        .then(function(sinceFloat) {
            return ProductServices.getComments(req.param('id'), sinceFloat, req.param('limit'), req.user);
        })
        .then(function(comments){
            Output.sendJSON(res, Errors.noError, {results: comments});
        })
        .catch(function(err){
            sails.log.error('Failed to get comments for product', {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
}

module.exports = {
    /**
     * GET /product  -> Product Search
     * @param req
     * @param res
     */
	find: _searchForProducts,

    /**
     * POST /product/:id/comment
     *
     * @param req
     * @param res
     */
    comment: _createComment,

    /**
     * Gets existing comments for a product by date
     *
     * @param req
     * @param res
     */
    getComments: _getComments
};