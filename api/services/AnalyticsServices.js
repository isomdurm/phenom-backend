'use strict';

/**
 *
 * Analytics Services
 *
 * @module      :: AnalyticsServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for raising analytics-based events
 *
 **/

/*
     globals Comment, CommentReference, Moment, MomentReference
*/

const _ = require('lodash');
const KeenAnalyticsEngine = require('./Analytics/KeenAnalyticsEngine');
const MixPanelAnalyticsEngine = require('./Analytics/MixPanelAnalyticsEngine');


function _reportNewUser(user){
    let keenEngine = new KeenAnalyticsEngine();
    return keenEngine.reportNewUser(user)
        .then(() => {
            let mpEngine = new MixPanelAnalyticsEngine();
            return mpEngine.reportNewUser(user);
        })
        .catch((err) => {
            //trap
        });
}

function _reportUserUpdate(user){
    let mpEngine = new MixPanelAnalyticsEngine();
    return mpEngine.reportUserUpdate(user)
        .catch((err) => {
            //trap
        });
}

function _reportNewComment(comment){
    let keenEngine = new KeenAnalyticsEngine();
    return keenEngine.reportNewComment(comment)
        .then(() => {
            let mpEngine = new MixPanelAnalyticsEngine();
            return mpEngine.reportNewComment(comment);
        })
        .catch((err) => {
            //trap
        });
}

function _reportCommentRemoved(comment, performedBy, flaggedAsInappropriate){
    let keenEngine = new KeenAnalyticsEngine();
    return keenEngine.reportCommentRemoved(comment, performedBy, flaggedAsInappropriate)
        .then(() => {
            let mpEngine = new MixPanelAnalyticsEngine();
            return mpEngine.reportCommentRemoved(comment, performedBy, flaggedAsInappropriate);
        })
        .catch((err) => {
            
        });
}

function _reportNewMoment(moment){
    let keenEngine = new KeenAnalyticsEngine();
    return keenEngine.reportNewMoment(moment)
        .then(() => {
            let mpEngine = new MixPanelAnalyticsEngine();
            return mpEngine.reportNewMoment(moment);
        })
        .catch((err) => {
            //trap
        });
}

function _reportMomentRemoved(moment, performedBy, flaggedAsInappropriate){
    let keenEngine = new KeenAnalyticsEngine();
    return keenEngine.reportMomentRemoved(moment, performedBy, flaggedAsInappropriate)
        .then(() => {
            let mpEngine = new MixPanelAnalyticsEngine();
            return mpEngine.reportMomentRemoved(moment, performedBy, flaggedAsInappropriate);
        })
        .catch((err) => {
            //trap
        });
}

/**
 * Public Interface
 */
module.exports = {
    /**
     * Reports a new user in the system to analytics, includes data like:
     *   -User id
     *   -sport
     *   -hometown
     *   -createdWith {facebook, password}
     *
     * @param user
     * @returns {Promise} resolving when completed, logs errors internally in the event
     *                    that this write request fails (fire and forget)
     */
    reportNewUser: _reportNewUser,

    /**
     * Reports user profile update activity in the system to analytics, includes data like:
     *   -User id
     *   -sport
     *   -hometown
     *   -createdWith {facebook, password}
     *
     * @param user
     * @returns {Promise} resolving when completed, logs errors internally in the event
     *                    that this write request fails (fire and forget)
     */
    reportUserUpdate: _reportUserUpdate,

    /**
     *  Reports a new comment in the system to analytics, includes data like:
     *    - id
     *    - authorId
     *    - targetId
     *    - type
     *    - referenceCount
     *    - references:  {type, targetId}
     *
     *    @param comment hydrated comment object
     *    @returns {Promise} resolving when completed, logs errors internally in the event
     *                       that this write request fails (fire and forget)
     */
    reportNewComment: _reportNewComment,

    /**
     *  Reports a comment is removed in the system to analytics, includes data like:
     *    - id
     *    - authorId
     *    - targetId
     *    - type
     *    - flaggedAsInappropriate
     *    - performedById
     *    - referenceCount
     *    - references:  {type, targetId}
     *
     *    @param comment hydrated comment object
     *    @param performedBy hydrated user object
     *    @param flaggedAsInappropriate true - when flagged, false when deleted
     *    @returns {Promise} resolving when completed, logs errors internally in the event
     *                       that this write request fails (fire and forget)
     */
    reportCommentRemoved: _reportCommentRemoved,

    /**
     *  Reports a comment is created in the system to analytics, includes data like:
     *    - id
     *    - author
     *    - products
     *    - productCount
     *    - song
     *    - mode
     *    - imageKey
     *    - referenceCount
     *    - references:  {type, targetId}
     *
     *    @param moment hydrated moment object
     *    @param performedBy hydrated user object
     *    @param flaggedAsInappropriate true - when flagged, false when deleted
     *    @returns {Promise} resolving when completed, logs errors internally in the event
     *                       that this write request fails (fire and forget)
     */
    reportNewMoment: _reportNewMoment,

    /**
     *  Reports a comment is removed in the system to analytics, includes data like:
     *    - id
     *    - author
     *    - products
     *    - productCount
     *    - song
     *    - mode
     *    - imageKey
     *    - flaggedAsInappropriate
     *    - performedById
     *    - referenceCount
     *    - references:  {type, targetId}
     *
     *    @param moment hydrated moment object
     *    @param performedBy hydrated user object
     *    @param flaggedAsInappropriate true - when flagged, false when deleted
     *    @returns {Promise} resolving when completed, logs errors internally in the event
     *                       that this write request fails (fire and forget)
     */
    reportMomentRemoved: _reportMomentRemoved
};