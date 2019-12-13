'use strict';

/**
 *
 * AAnalyticsEngine
 *
 * @module      :: AnalyticsServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines an interface for integrating an arbitrary analytics engine
 *
 **/

const _ = require('lodash');
const Promise = require('bluebird');

/*
    globals Config, Errors, sails, Comment, CommentReference, Moment, MomentReference
 */

class AAnalyticsEngine {
    constructor(){
        this.engine = 'Abstract';
    }

    /***
     * Utilizes an engine to send event data, requires implementation
     *
     * @param category {string}
     * @param eventData
     * @private
     * @return {Promise}
     */
    _sendEvent(category, eventData){
        return Promise.reject(Errors.serverErrors.ERROR_SERVER_UNKNOWN);
    }

    /***
     * Hook to apply engine-specific event metadata
     *
     * @param params
     * @private
     * @return {obj}
     */
    _createEventBase(eventBase){
        let metadata = {
            APIVersion: Config.API.minimumSupportedVersion,
            serverInfo: {
                framework: 'sails.js',
                version: sails.version
            },
            environment: sails.config.environment
        };

        return _.merge({}, eventBase, metadata);
    }

    /**
     * @param user
     * @returns {Promise.<{userId: *, sport: (*|string|module.exports.attributes.sport|{type, defaultsTo}), hometown: (*|string|string|module.exports.attributes.hometown|{type, defaultsTo}|module.exports.testUser.hometown), createdWith: string}>}
     * @private
     */
    _newUserEventData(user){
        return Promise.resolve({
            userId:         user.id,
            sport:          user.sport,
            hometown:       user.hometown,
            createdWith:    user.facebookId ? 'facebook' : 'password'
        });
    }

    /**
     * @param user
     * @returns {Promise.<{userId: *, sport: (*|string|module.exports.attributes.sport|{type, defaultsTo}), hometown: (*|string|string|module.exports.attributes.hometown|{type, defaultsTo}|module.exports.testUser.hometown), createdWith: string}>}
     * @private
     */
    _userUpdateEventData(user){
        return this._newUserEventData(user);
    }

    /**
     * Generates new comment event data plus references
     *
     * @param comment
     * @returns {Promise.<object>|}
     * @private
     */
    _newCommentEventData(comment){
        return CommentReference.find({
            sourceComment: comment.id
        }).then(function(commentReferences){
            var targetId = comment.type === Comment.commentTypes.MOMENT ? comment.targetMoment.hasOwnProperty('id') ?
                comment.targetMoment.id : comment.targetMoment : '';

            return {
                id:                     comment.id,
                targetId:               targetId,
                type:                   comment.type,
                author:                 comment.author.hasOwnProperty('id') ? comment.author.id : comment.author,
                referenceCount:         commentReferences.length,
                references:             _.map(commentReferences, function(ref){
                    var targetId = ref.type === CommentReference.commentReferenceTypes.USER ?
                        ref.targetUser.hasOwnProperty('id') ?
                            ref.targetUser.id : ref.targetUser : '';

                    return {
                        type: ref.type,
                        targetId: targetId
                    };
                })
            };
        });
    }

    /**
     * Generates comment delete event data plus references
     *
     * @param comment
     * @param performedBy
     * @param flaggedAsInappropriate
     * @returns {Promise.<object>}
     * @private
     */
    _commentRemovedEventData(comment, performedBy, flaggedAsInappropriate){
        return CommentReference.find({
            sourceComment: comment.id
        }).then(function(commentReferences){
            var targetId = comment.type === Comment.commentTypes.MOMENT ? comment.targetMoment.hasOwnProperty('id') ?
                comment.targetMoment.id : comment.targetMoment : '';

            return {
                id:                     comment.id,
                type:                   comment.type,
                targetId:               targetId,
                author:                 comment.author.hasOwnProperty('id') ? comment.author.id : comment.author,
                flaggedAsInappropriate: flaggedAsInappropriate,
                performedById:          performedBy.id,
                referenceCount:         commentReferences.length,
                references:             _.map(commentReferences, function(ref){
                    var targetId = ref.type === CommentReference.commentReferenceTypes.USER ?
                        ref.targetUser.hasOwnProperty('id') ?
                            ref.targetUser.id : ref.targetUser : '';

                    return {
                        type: ref.type,
                        targetId: targetId
                    };
                })
            };
        });
    }

    /**
     * Generates new moment event data
     *
     * @param moment
     * @returns {Promise.<object>}
     * @private
     */
    _newMomentEventData(moment){
        return MomentReference.find({
            sourceMoment: moment.id
        }).then(function(momentReferences){
            return {
                id:             moment.id,
                author:         moment.userId,
                products:       moment.productIds,
                productCount:   moment.productIds.length,
                song:           moment.song,
                mode:           moment.mode,
                imageKey:       moment.image,
                referenceCount: momentReferences.length,
                references:     _.map(momentReferences, function(ref){
                    var targetId = ref.type === MomentReference.momentReferenceTypes.USER ?
                        ref.targetUser.hasOwnProperty('id') ?
                            ref.targetUser.id : ref.targetUser : '';

                    return {
                        type: ref.type,
                        targetId: targetId
                    };
                })
            };
        });
    }

    /**
     * Generates moment delete event data plus references
     *
     * @param moment
     * @param performedBy
     * @param flaggedAsInappropriate
     * @returns {Promise.<T>|*}
     * @private
     */
    _momentRemovedEventData(moment, performedBy, flaggedAsInappropriate){
        return MomentReference.find({
            sourceMoment: moment.id
        }).then(function(momentReferences){
            return {
                id:                     moment.id,
                author:                 moment.userId,
                products:               moment.productIds ? moment.productIds : [],
                productCount:           moment.productIds ? moment.productIds.length : 0,
                song:                   moment.song,
                mode:                   moment.mode,
                imageKey:               moment.image,
                performedById:          performedBy.hasOwnProperty('id') ? performedBy.id : performedBy,
                flaggedAsInappropirate: flaggedAsInappropriate,
                referenceCount:         momentReferences.length,
                references:             _.map(momentReferences, function(ref){
                    var targetId = ref.type === MomentReference.momentReferenceTypes.USER ?
                        ref.targetUser.hasOwnProperty('id') ?
                            ref.targetUser.id : ref.targetUser : '';

                    return {
                        type: ref.type,
                        targetId: targetId
                    };
                })
            };
        });
    }

    /**
     * Used by clients to raises an analytics event
     *
     * @param category {string}
     * @param eventData, will be combined with app-wide analytics metadata including:
     *  -timestamp
     *  -APIVersion
     *  -serverInfo
     *      -framework
     *      -version
     *  -environment
     *
     * @returns {Promise}
     */
    createEvent(category, eventData){
        let event = this._createEventBase(eventData);

        //For test purposes, let us know when this event is firing, otherwise fire to the appropriate analytics store
        if(sails.config.environment === 'test'){
            sails.log.info('Analytics - ' + category + ' Event', event);

            return Promise.resolve();
        }

        return this._sendEvent(category, event).catch((error) => {
            if (error) {
                sails.log.error(`Failed to write analytics event via ${this.engine}`, {
                    event,
                    error
                });
            }
        });
    }

    /**
     * AnalyticsService.reportNewUser
     * @param user
     * @returns {Promise.<obj>}
     */
    reportNewUser(user){
        return this._newUserEventData(user)
            .then((eventData) => {
                return this.createEvent('User-Create', eventData);
            });
    }

    /**
     * AnalyticsService.reportUserUpdate
     *
     * @param user
     * @returns {Promise.<object>}
     */
    reportUserUpdate(user){
        return this._userUpdateEventData(user)
            .then((eventData) => {
                return this.createEvent('User-ProfileUpdate', eventData);
            });
    }

    /**
     * AnalyticsService.reportNewComment
     *
     * @param comment
     * @returns {Promise.<Object>}
     */
    reportNewComment(comment){
        return this._newCommentEventData(comment)
            .then((eventData) => {
                return this.createEvent('Comment-Create', eventData);
            });
    }

    /**
     * AnalyticsService.reportCommentRemoved
     *
     * @param comment
     * @param performedBy
     * @param flaggedAsInappropriate
     * @returns {Promise.<Object>}
     */
    reportCommentRemoved(comment, performedBy, flaggedAsInappropriate){
        return this._commentRemovedEventData(comment, performedBy, flaggedAsInappropriate)
            .then((eventData) => {
                return this.createEvent('Comment-Remove', eventData);
            });
    }

    /**
     * AnalyticsService.reportNewMoment
     *
     * @param moment
     * @returns {Promise.<Object>}
     */
    reportNewMoment(moment){
        return this._newMomentEventData(moment)
            .then((eventData) => {
                return this.createEvent('Moment-Create',  eventData);
            });
    }

    /**
     * AnalyticsService.reportMomentRemoved
     *
     * @param moment
     * @param performedBy
     * @param flaggedAsInappropriate
     * @returns {Promise.<Object>}
     */
    reportMomentRemoved(moment, performedBy, flaggedAsInappropriate){
        return this._momentRemovedEventData(moment, performedBy, flaggedAsInappropriate)
            .then((eventData) => {
                return this.createEvent('Moment-Remove',  eventData);
            });
    }
}

module.exports = AAnalyticsEngine;

