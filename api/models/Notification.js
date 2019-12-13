/**
 *
 * Notification Model
 *
 * @module      :: Notification
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a notification in the Phenom API
 *
 **/
var Promise = require('bluebird')

module.exports = {

    connection: ['mongo'],

    attributes: {
        targetId: {
            type: 'string',
            required: true
        },
        sourceId: {
            type: 'string',
            required: true
        },
        notificationType: {
            type: 'integer',
            required: true,
            enum: [0, 1, 2, 3, 4]
        },
        additionalData: {
            type: 'json'
        },
        message: {
            type: 'string'
        },
        acknowledged: {
            type: 'boolean',
            defaultsTo: false
        },

        toJSON: function() {
            var json = {};
            var self = this;

            //hydrate the source and target users
            return User.findOne({id: self.sourceId})
                .then(function (sourceUser) {

                    if(!sourceUser){
                        throw new Error('No user found when trying to fetch source user for notification');
                    }

                    return User.findOne({id: self.targetId})
                        .then(function(targetUser){

                            if(!targetUser){
                                throw new Error('No user found when trying to fetch target user for notification');
                            }

                            return sourceUser.getPublicData(targetUser)
                                .then(function(sourceUserPublicData){
                                    json.source = sourceUserPublicData;

                                    return targetUser.getPublicData();
                                })
                                .then(function(targetUserPublicData){
                                    json.target = targetUserPublicData;

                                    //now add the rest of the data
                                    json.acknowledged = self.acknowledged;
                                    json.message = self.message;
                                    json.additionalData = self.additionalData;
                                    json.notificationType = self.notificationType;
                                    json.createdAt        = self.createdAt;

                                    return json;
                                });
                        });
                });
        }
    }
}