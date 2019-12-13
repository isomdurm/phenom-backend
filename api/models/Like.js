/**
 *
 * Like Model
 *
 * @module      :: Like
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Like edge
 *
 **/
var Promise = require('bluebird');

/**
 * Stores the targetId type, currently only supporting moments
 *
 * @type enum
 * @private
 */
var _targetTypes = {
    MOMENT: 0
};

/**
 *  Public Interface
 */
module.exports = {
    connection: ['mongo'],

    targetTypes: _targetTypes,

    attributes: {
        sourceUser: {
            model: 'user',
            required: true
        },

        targetType: {
            type: 'integer',
            required: true
        },

        targetMoment: {
            model: 'moment'
        }
    }
};