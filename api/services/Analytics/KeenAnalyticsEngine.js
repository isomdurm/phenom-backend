'use strict';

/**
 *
 * KeenAnalyticsEngine
 *
 * @module      :: KeenAnalyticsEngine
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines the Keen.io Analytics Engine
 *
 **/

const AnalyticsBase = require('./AAnalyticsEngine');
const Keen = require('keen-js');
const Promise = require('bluebird');

/*
    globals Config
 */

class KeenAnalyticsEngine extends AnalyticsBase{
    constructor(){
        super();
        this.engine = 'Keen';
        this.client = new Keen({
            projectId: Config.Keen.projectId,
            writeKey: Config.Keen.writeKey
        });
    }

    /**
     * Emits an event to Keen.io
     *
     * @param category {string}
     * @param eventData
     * @returns {Promise}
     * @private
     */
    _sendEvent(category, eventData){
        return new Promise((resolve, reject) => {
            this.client.addEvent(category, eventData, (err, res) => {
                if(err){
                    return reject(err);
                }

                resolve(res);
            });
        });
    }

    /**
     * Override to attach Keen specific event metadata
     *
     * @param eventBase
     * @private
     */
    _createEventBase(eventBase){
        let metadata = {
            keen: {
                timestamp: new Date().toISOString()
            }
        };

        return _.merge({}, super._createEventBase(eventBase), metadata);
    }
}

module.exports = KeenAnalyticsEngine;