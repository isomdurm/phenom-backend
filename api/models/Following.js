/**
 *
 * Following Model
 *
 * @module      :: Following
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Following edge
 *
 **/
var Promise = require('bluebird');

/**
 * Stores the targetId type, currently only supporting moments
 *
 * @type enum
 * @private
 */
var _followingTypes = {
    USER : 0
}

/**
 *  Public Interface
 */
module.exports = {
    connection: ['mongo'],

    followingTypes: _followingTypes,

    attributes: {
        sourceUser: {
            model: 'user',
            required: true
        },

        targetType: {
            type: 'integer',
            required: true
        },

        targetUser: {
            model: 'user'
        }
    }
};