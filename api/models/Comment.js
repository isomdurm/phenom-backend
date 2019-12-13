/**
 *
 * Comment Model
 *
 * @module      :: Comment
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Comment
 *
 **/

/*
     globals CommentReference, Comment, Notification
*/

var Promise = require('bluebird');
var util = require('util');

/**
 * Stores the targetId type, currently only supporting moments
 *
 * @type enum
 * @private
 */
var _commentTypes = {
    MOMENT: 0,
    PRODUCT: 1,
    COMMENT_VALID: 2
};

function _cleanupNotificationsOnCommentDestroy(commentId){
    return Notification.destroy({
        'additionalData.commentId': commentId
    });
}

function _destroyCommentReferences(commentId){
    return CommentReference.destroy({
        sourceComment: commentId
    });
}

function _toJSON(comment, requestingUser){

    function __hydrateReferences(commentData) {
        commentData.references = [];

        return Promise.filter(CommentReference.find({
            sourceComment: comment.id
        }), function(reference){
            return reference.type == CommentReference.commentReferenceTypes.USER;
        }).map(function(reference){
            return reference.targetUser;
        }).then(function(references){
            return User.find({
                id: references
            });
        }).then(function(referencedUsers){
            return Promise.map(referencedUsers, function(referencedUser){
                return referencedUser.getSummary(requestingUser)
                    .catch(function(err){
                        sails.error.log("Failed to hydrate comment reference:  ", {error: err});
                        return undefined;
                    });
            }).filter(function(referencedUser){
                return referencedUser != undefined;
            }).each(function(referencedUser){
                commentData.references.push(referencedUser);

                //replace any @{userId} with @phenomId
                commentData.commentText = commentData.commentText.replace(
                    new RegExp(util.format("@{%s}", referencedUser.id), "g"),
                    util.format("@%s", referencedUser.username));
            });
        });
    };

    function __hydrateAuthor(commentData){
        return User.findOne({
            id: comment.author.hasOwnProperty('id') ? comment.author.id : comment.author
        }).then(function(user){
            return user.getSummary(requestingUser);
        }).then(function(commentAuthor){
            commentData.author = commentAuthor;
        });
    };

    function _attachSource(commentToHydrate){
        switch(comment.type){
            case _commentTypes.MOMENT: {
                commentToHydrate.targetMoment = comment.targetMoment.hasOwnProperty('id') ?
                    comment.targetMoment.id : comment.targetMoment;
                break;
            }
            case _commentTypes.PRODUCT: {
                commentToHydrate.targetProduct = comment.targetProduct.hasOwnProperty('id') ?
                    comment.targetProduct.id : comment.targetProduct;
                break;
            }
            default:
                break;
        }
    }

    var commentData = {
        createdAt: comment.createdAt,
        id: comment.id,
        commentText: comment.text,
        flaggedAsInappropriate: comment.flaggedAsInappropriate
    };

    _attachSource(commentData);

    return __hydrateAuthor(commentData).then(function(){
        return __hydrateReferences(commentData);
    }).then(function(){
        return commentData;
    });
}

/**
 *  Public Interface
 */
module.exports = {
    connection: ['mongo'],

    commentTypes: _commentTypes,

    attributes: {
        author: {
            model: 'user',
            required: true
        },

        type: {
            type: 'integer',
            required: true
        },

        targetMoment: {
            model: 'moment'
        },

        targetProduct: {
            model: 'product'
        },

        //in the form "hey @{comment_reference_id}, this is an awesome moment"
        text: {
            type: 'string'
        },

        flaggedAsInappropriate: {
            type: 'boolean',
            defaultsTo: false
        },

        toJSON: function(requestingUser){
            return _toJSON(this, requestingUser);
        }
    },

    beforeDestroy: function(criteria, cb){
        function __destroyRelatedItems(commentId){
            return _destroyCommentReferences(commentId)
                .then(function(){
                    return _cleanupNotificationsOnCommentDestroy(commentId);
                });
        }

        Comment.find(criteria)
            .then(function(comments){

                var promises = [];

                comments.forEach(function(comment){
                    promises.push(__destroyRelatedItems(comment.id));
                });

                //at this point, continue deleting the actual comment, no need to wait for all the references to cleanup
                //if there are any errors, they'll be logged
                cb();

                return Promise.settle(promises);
            })
            .then(function(results){
                results.forEach(function(result){
                    if(result.isRejected()){
                        sails.log.error('Failed to delete comment reference when deleting comment', {error: result.error()});
                    }
                });
            });
    }
};