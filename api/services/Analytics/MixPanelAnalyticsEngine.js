'use strict';

/**
 *
 * MixPanelAnalyticsEngine
 *
 * @module      :: MixPanelAnalyticsEngine
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines the Keen.io Analytics Engine
 *
 **/

const AnalyticsBase = require('./AAnalyticsEngine');
const MixPanel = require('mixpanel');
const Promise = require('bluebird');

/*
 globals Config
 */

class MixPanelAnalyticsEngine extends AnalyticsBase{

    constructor(){
        super();
        this.engine = 'MixPanel';
        this.client = MixPanel.init(Config.MixPanel.token);
    }

    /**
     * Emits a generic event to MixPanel, without any customization
     *
     * @param category {string}
     * @param eventData
     * @returns {Promise}
     * @private
     */
    _sendEvent(category, eventData){
        return new Promise((resolve, reject) => {
            //MixPanel uses distinct_id to track events, synonymous with our userId
            if('userId' in eventData){
                eventData.distinct_id = eventData.userId;
            }
            else if('author' in eventData){
                eventData.distinct_id = eventData.author;
            }

            this.client.track(category, eventData, (err) => {
                if(err){
                    return reject(err);
                }

                resolve(eventData);
            });
        });
    }

    /**
     * Override
     *
     * @param user
     * @returns {Promise.<T>}
     * @private
     */
    _newUserEventData(user){
        return super._newUserEventData(user)
            .then((eventData) => {
                eventData.momentsCreated = 0;
                eventData.commentsCreated = 0;

                return eventData;
            });
    }

    /**
     * Override
     *
     * @param user
     * @returns {Promise.<T>}
     */
    reportNewUser(user){
        return this._newUserEventData(user)
            .then((eventData) => {
                return new Promise((resolve, reject) => {
                    this.client.people.set(user.id, eventData, (err) => {
                        if(err){
                            return reject(err);
                        }

                        resolve(eventData);
                    });
                });
            })
    }

    /**
     * Override
     *
     * @param user
     * @returns {Promise.<{userId: *, sport: (*|string|module.exports.attributes.sport|{type, defaultsTo}), hometown: (*|string|string|module.exports.attributes.hometown|{type, defaultsTo}|module.exports.testUser.hometown), createdWith: string}>}
     */
    reportUserUpdate(user){
        return this._userUpdateEventData(user)
            .then((eventData) => {
                return new Promise((resolve, reject) => {
                    this.client.people.set(user.id, eventData, (err) => {
                        if(err){
                            return reject(err);
                        }

                        resolve(eventData);
                    });
                });
            });
    }

    /**
     * Override
     *
     * @param comment
     * @returns {Promise.<Object>}
     */
    reportNewComment(comment){
        return this._newCommentEventData(comment)
            .then((eventData) => {
                return this.createEvent('Comment-Create', eventData);
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.client.people.increment(comment.author.id, 'commentCount', (err) => {
                        if(err){
                            return reject(err);
                        }

                        resolve();
                    });
                });
            });
    }

    /**
     * Override
     *
     * @param moment
     * @returns {Promise.<Object>}
     */
    reportNewMoment(moment){
        return this._newMomentEventData(moment)
            .then((eventData) => {
                return this.createEvent('Moment-Create', eventData);
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.client.people.increment(moment.userId, 'momentCount', (err) => {
                        if(err){
                            return reject(err);
                        }

                        resolve();
                    });
                });
            });
    }
}

module.exports = MixPanelAnalyticsEngine;