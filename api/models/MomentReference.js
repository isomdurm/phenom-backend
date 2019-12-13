/**
 *
 * Moment Reference Model
 *
 * @module      :: MomentReference
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Reference contained in a moment
 *
 **/

/*
    globals MomentReference
*/

var _ = require('lodash');
var Promise = require('bluebird');

var _referenceTypes = {
    USER: 0,
    REFERENCE_VALID: 1
};

module.exports = {
    connection: ['mongo'],

    momentReferenceTypes: _referenceTypes,

    attributes: {
        sourceMoment: {
            model: 'moment',
            required: true
        },

        type: {
            type: 'integer',
            required: true
        },

        targetUser: {
            model: 'user'
        },

        toJSON: function(loggedInUser){
            var self = this;

            if(this.type == _referenceTypes.USER){
                return User.findOne({
                    id: self.targetUser
                })
                    .then(function(user){
                        if(!user){
                            throw new Error('Failed to lookup user for user type moment reference:  ' + self.targetUser);
                        }

                        return user.getSummary(loggedInUser);
                    })
            }
        }
    }
};