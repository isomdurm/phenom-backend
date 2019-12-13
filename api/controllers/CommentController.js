/**
 *
 * Comment Controller
 *
 * @module      :: CommentControler
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines Phenom API endpoints to access user Comment functionality
 *
 * Copyright © Phenom LLC 2015
 *
 **/

var Promise = require('bluebird');

function _findComment(req, res){
    var missingParams = Validation.validateParams(req, [
        "id"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to get single comment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }
    else{
        CommentServices.findCommentById(req.param("id"), req.user)
            .then(function(comment){
                Output.sendJSON(res, Errors.noError, {results: comment});
            })
            .catch(function(err){
                sails.log.error('Failed to find single comment', {error:  err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
            });
    }
}

function _updateComment(req, res){
    var missingParams = Validation.validateParams(req, [
        "id",
        "updates"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to update comment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
    }
    else{
        CommentServices.updateComment(req.param("id"), req.param('updates'), req.user)
            .then(function(commentId){
                Output.sendJSON(res, Errors.noError, {results: commentId});
            })
            .catch(function(err){
                sails.log.error('Failed to update moment', {error:  err});
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
            });
    }
}

function _deleteComment(req, res){
    var missingParams = Validation.validateParams(req, [
        "id"]);

    if(missingParams.length > 0){
        Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }
    else if(!req.user){
        sails.log.error('Failed to delete comment', {error: "Request object doesn't have user model instance"});
        Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
    }
    else{
        CommentServices.deleteComment(req.param("id"), req.user)
            .then(function(result){
                Output.sendJSON(res, Errors.noError, {result: result});
            })
            .catch(function(err){
                sails.log.error('Failed to update moment', {error:  err});

                if(err.constructor == Errors.PMError){
                    Output.sendJSON(res, err);
                }
                else {
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
                }
            });
    }
}

module.exports = {
    find: _findComment,
    update: _updateComment,
    destroy: _deleteComment
};