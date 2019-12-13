/**
 * Created by isom on 12/10/15.
 */
/**
 *
 * Moment Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Moment
 *
 **/
var Promise = require('bluebird');

module.exports = {
    connection: ['mongo'],

    attributes: {
        userId: {
            type: 'String',
            required: true
        },
        referencedUserIds: {
            type: 'array' //of User objects (future release)
        },
        productIds: {
            type: 'array' //of Product objects
        },
        headline: {
            type: 'String',
            required: true
        },
        song: {
            type: 'json'  //trackId, previewUrl, artworkUrl
        },
        image: {
            type: 'String'
        },
        createdAt: {
            type: 'Date'
        },
        flaggedAsInappropriate: {
            type: 'boolean'
        },
        flaggedAsInappropriateBy: {
            type: 'string'
        },
        likes: {
            type: 'array'
        }
    }
};