/**
 *
 * Product Metadata Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Holds data about products, as well as how it relates to other objects in the system
 *
 **/

module.exports = {
    connection: ['mongo'],

    attributes: {
        product: {
            model: 'product',
            unique: true,
            required: true
        },

        stylingMomentCount:{
            type: 'integer',
            defaultsTo: 0
        },

        trainingMomentCount:{
            type: 'integer',
            defaultsTo: 0
        },

        gamingMomentCount:{
            type: 'integer',
            defaultsTo: 0
        },

        lockerCount: {
            type: 'integer',
            defaultsTo: 0
        },

        featured: {
            type: 'boolean',
            defaultsTo: false
        },

        commentCount: {
            type: 'integer',
            defaultsTo: 0
        }
    }
};
