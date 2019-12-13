/**
 *
 * Comment Services
 *
 * @module      :: CommentServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for Comment-bound operations
 *
 **/

/*
    globals AnalyticsServices, Moment, Comment, CommentReference, User, MomentServices, ProductServices
*/

var Promise = require('bluebird');
var _ = require('lodash');
var util = require('util');

function _commentAutoTaggingMapper(user){
    return {
        referenceType: CommentReference.commentReferenceTypes.USER,
        id: user.id
    };
}

/**
 * Automatically parses input text and returns user reference objects.
 */
function _userAutoTag(text, existingReferences, mapperFunction){
    //get the ids
    var phenomIds = _.uniq(text.match(/@([.a-zA-Z0-9~#!$&?*_-]{1,30})/gi));

    //nuke the @
    var userIds = _.map(phenomIds, function(phenomId){
        return phenomId.substring(1);
    });

    //if any username ends in a character ['.', '!', '?'], include the stem as a search candidate
    //ex: 'cory!' -> ['cory', 'cory!']
    var idsWithCharsAtEnd = [];
    userIds.forEach(function(userId){
        if(userId.match(/[.!?]$/)){
            idsWithCharsAtEnd.push(userId.substring(0, userId.length - 1));
        }
    });

    var candidateUsers = _.uniq(userIds.concat((idsWithCharsAtEnd)));

    //first find users by their phenom ids
    return User.find({
        username: candidateUsers
    })
        .then(function(users){
            //map the users into references, and merge them with any existing 'manual' references, removing
            //any duplicates (by the 'id' field).  If we have hits from entries in both userIds and idsWithCharsAtEnd
            //then we prefer the one with the char at the end, Ex: hits -> ['a', 'a.'], prefer 'a.'
            return _.uniqBy(_.map(_.filter(users, function(user){

                return _.findIndex(users, function(i){
                        if(i.username.length > 1 && i.username.match(/[.!?]$/)){
                            return i.username.substring(0, i.username.length - 1) == user.username;
                        }

                        return false;
                    }) < 0;

            }), function(user){
                return mapperFunction(user);
            }).concat(existingReferences), 'id');
        });
}

function _commentTargetKeyFromType(commentType){
    switch (commentType) {
        case Comment.commentTypes.MOMENT:
            return "targetMoment";
        case Comment.commentTypes.PRODUCT:
            return "targetProduct";
        default:
            return "";
    }
}

/**
 * Checks incoming references
 * @param reference
 * @returns {Promise} resolves with reference if valid, rejects otherwise
 * @private
 */
function _referenceValidator(reference) {

    function __checkReferenceId(id, referenceType){
        if(referenceType == CommentReference.commentReferenceTypes.USER){
            return User.findOne({
                id: id
            })
                .then(function (user) {
                    if(user){
                        //add this data
                        reference.username = user.username;
                        return reference;
                    }

                    throw new Error('Invalid user reference');
                });
        }

        return Promise.reject(new Error('Invalid reference type'));
    }

    if (reference.hasOwnProperty('referenceType')
        && reference.referenceType < CommentReference.commentReferenceTypes.REFERENCE_VALID
        && reference.hasOwnProperty('id'))
    {
        return __checkReferenceId(reference.id, reference.referenceType);
    }
    else {
        return Promise.reject(new Error('Invalid reference type'));
    }
}

function _processUpdates(comment, requestingUser, updates){
    if(updates.hasOwnProperty('flaggedAsInappropriate')
        && comment.flaggedAsInappropriate != updates.flaggedAsInappropriate)
    {
        comment.flaggedAsInappropriate =
            updates.flaggedAsInappropriate === "true"
            || updates.flaggedAsInappropriate === "1"
            || updates.flaggedAsInappropriate === true;

        return comment.save()
            .then(function(){
                if(comment.type == Comment.commentTypes.MOMENT){
                    return Moment.findOne({
                        id: comment.targetMoment
                    });
                }

                return Promise.resolve(undefined);
            })
            .then(function(moment){
                if(moment){
                    moment.commentCount = Math.max(0, moment.commentCount - 1);

                    //fire and forget analytics
                    AnalyticsServices.reportCommentRemoved(comment, requestingUser, true);

                    return moment.save();
                }

                return Promise.resolve();
            });
    }

    return Promise.resolve();
}

/**
 * Creates a comment reference (impl)
 *
 * @param reference
 * @param comment
 * @returns {Promise} resolves with the original reference if we successfully created the comment reference, otherwise,
 *                    resolved with undefined, or rejects on error
 * @private
 */
function _createCommentReference(reference, comment){
    //return the comment reference id
    if(reference.referenceType == CommentReference.commentReferenceTypes.USER){
        return CommentReference.create({
            type: CommentReference.commentReferenceTypes.USER,
            sourceComment: comment.id,
            targetUser: reference.id
        }).then(function(){
            return reference;
        }).catch(function(err){
            throw err;
        })
    }

    //we didn't create anything
    return Promise.reject(new Error('Invalid comment reference type'));
}

function _hydrateComments(comments, requestingUser){
    return Promise.map(comments, function(comment){
        return comment.toJSON(requestingUser).catch(function(err){
            sails.log.error("Failed to hydrate comments", {error: err});
            return undefined;
        });
    }).filter(function(comment){
        return comment != undefined;
    });
}

/**
 * Persists a comment in the system along with any references
 */
function _createComment(commentText, commentType, targetId, references, author){
    var targetKey = _commentTargetKeyFromType(commentType);

    if(commentType === "" || commentType > Comment.commentTypes.COMMENT_VALID){
        throw new Error("Invalid comment type", {type: commentType});
    }

    var commentParams = {
        text: commentText,
        author: author.id,
        type: commentType
    };

    commentParams[targetKey] = targetId;

    return Comment.create(commentParams)
        .then(function(commentDoc) {
            return _userAutoTag(commentText, references, _commentAutoTaggingMapper)
                .then(function(autoReferences){
                    return Promise.filter(autoReferences, function(reference){
                        return _referenceValidator(reference)
                            .return(true)
                            .catch(function(){
                                return false;
                            });
                    }).filter(function(validReference) {
                        return _createCommentReference(validReference, commentDoc)
                            .return(true)
                            .catch(function (error) {
                                sails.log.error("Failed to create moment reference", {error: error});
                            });
                    }).each(function(createdReference){
                        //swap comment references for their corresponding id's inside the comment's text
                        // "hey @cory, cool moment" -> "hey @{b33242bdb737382}, cool moment"
                        if(createdReference.referenceType == CommentReference.commentReferenceTypes.USER
                            && createdReference.hasOwnProperty("username"))
                        {
                            commentDoc.text = commentDoc.text.replace(
                                new RegExp("@" + createdReference.username, "g"), util.format("@{%s}", createdReference.id));
                        }
                    }).then(function(){
                        //persist the changes to commentDoc
                        return commentDoc.save();
                    }).then(function(updatedCommentDoc){

                        //fire and forget analytics
                        AnalyticsServices.reportNewComment(commentDoc);

                        return updatedCommentDoc.toJSON(author);
                    });
                });
        });
}

/**
 * Fetches comments by creation date in the system along with any references
 */
function _fetchCommentsByDate(targetId, targetType, since, limit, requestingUser){
    var targetCriteria = {
        type: targetType,
        flaggedAsInappropriate: false,
        createdAt: {
            '<': new Date(since)
        }
    };

    if(targetType == Comment.commentTypes.MOMENT){
        targetCriteria.targetMoment = targetId;
    }
    else if(targetType == Comment.commentTypes.PRODUCT){
        targetCriteria.targetProduct = targetId;
    }

    return Comment.find(targetCriteria)
        .sort({createdAt: 'asc'})
        .limit(limit)
        .populate('author')
        .then(function(comments){
            return _hydrateComments(comments, requestingUser);
        })
        .then(function(comments){
            return {
                cursor: (comments.length > 0 ? _.last(comments).createdAt : new Date(since).getTime()),
                comments: comments
            }
        });
}

/**
 * Updates a comment in the system, currently includes flagging as inappropriate
 */
function _updateComment(commentId, updates, user){

    return Comment.findOne({
        id: commentId
    })
        .then(function(comment){
            if(!comment){
                throw new Error('Could not locate comment with id:  ' + commentId);
            }

            return _processUpdates(comment, user, updates)
                .return(comment.id);
        });
}

/**
 * Fetches a comment by id in the system along with any references
 */
function _findCommentById(id, user){
    return Comment.findOne({
        id: id,
        flaggedAsInappropriate: false,
    })
        .populate('author')
        .then(function(comment){
            if(!comment){
                throw new Error('Could not locate comment with id:  ' + id);
            }

            return comment.toJSON(user);
        });
}

/**
 *  Updates a comment in the system, only if requestingUser has permission to do so
 */
function _deleteComment(commentId, requestingUser){

    return Comment.findOne({
        id: commentId
    })
        .then(function(comment){
            if(!comment){
                throw new Error('Could not locate comment with id:  ' + commentId);
            }

            if(comment.type == Comment.commentTypes.MOMENT){
                return MomentServices.deleteMomentComment(comment, requestingUser);
            }
            else if(comment.type == Comment.commentTypes.PRODUCT){
                return ProductServices.deleteComment(comment, requestingUser);
            }
            else{
                //user is not authorized to delete this moment
                throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS);
            }

        });
}

module.exports = {
    /**
     *   Persists a comment in the system along with any references
     *
     *   @param commentText
     *   @param commentType
     *   @param targetId
     *   @param references  - {type, id}
     *   @param author      - hydrated user object
     *
     *   @return {Promise} resolving on completion with JSON comment
     */
    createComment:          _createComment,

    /**
     *   Fetches comments by creation date in the system along with any references
     *
     *   @param targetId
     *   @param since
     *   @param limit
     *   @param requestingUser
     *   @param targetType
     *
     *   @return {Promise} resolving on completion with JSON comment
     */
    fetchCommentsByDate:    _fetchCommentsByDate,

    /**
     *   Updates a comment in the system, currently includes flagging as inappropriate
     *
     *   @param commentId
     *   @param updates
     *   @param user
     *
     *   @return {Promise} resolving on completion with updated comment id
     */
    updateComment:          _updateComment,

    /**
     *   Fetches a comment by id in the system along with any references
     *
     *   @param id
     *   @param user
     *
     *   @return {Promise} resolving on completion with JSON comment
     */
    findCommentById:        _findCommentById,

    /**
     *   Updates a comment in the system, only if requestingUser has permission to do so
     *
     *   @param commentId
     *   @param requestingUser
     *
     *   @return {Promise} resolving on completion with true on success
     */
    deleteComment:          _deleteComment,

    /**
     * Automatically parses input text and returns user reference objects.
     *
     * Ex:  "hey @cory, awesome product" -> [ { id: 1234, referenceType: ... } ]
     *
     * @param text
     * @param existingReferences - merges with existing references
     * @param mapperFunction - map function to pass each user model through
     * @returns {Promise} Collection of mapped reference objects on success, rejects otherwise
     * @private
     */
    userReferenceAutotag: _userAutoTag
};

/**
 *   Test Hooks
 */
module.testExports = {
    _commentAutoTaggingMapper: _commentAutoTaggingMapper
};

for(var property in module.exports) {
    module.testExports[property] = module.exports[property];
}