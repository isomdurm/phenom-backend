/**
 *
 * NotificationTarget Model
 *
 * @module      :: NotificationTarget
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines and describes active device notifications in the system
 *
 **/

module.exports = {

    connection: ['mongo'],

    attributes: {
        userId: {
            type: 'string',
            required: true
        },
        accessTokenId: {
            type: 'string',
            required: true
        },
        deviceType: {
            type: 'integer',
            required: true,
            enum: [0, 1]
        },
        deviceId: {
            type: 'string',
            required: true
        },
        endpointARN: {
            type: 'string',
            required: true
        }//,
        //desiredNotifications: {
        //   type: 'array',
        //    required: true,
        //    enum: [0, 1]
        //}
    },

    /**
     * We need to un-register a notification target from its associated notification service
     * before we actually remove the NotificationTarget model object.
     *
     * @param criteria - holds the target id
     * @param next
     */
    beforeDestroy: function(criteria, next){
        //this shouldn't happened, but who knows
        if(!(criteria.hasOwnProperty('where'))
            || !(criteria.where)
            || !(criteria.where.hasOwnProperty('id'))
            || !(criteria.where.id)){
            next();
            return;
        }

        NotificationTarget.findOne({id: criteria.where.id})
            .then(function(notif){
                if(notif) {
                    NotificationServices.removeDevice(notif.endpointARN, notif.deviceType)
                    .then(function(){
                        next();
                    })
                    .catch(function(err){
                        throw err;  //pass it along
                    });
                }
                else{
                    next();
                }
            })
            .catch(function(err){
                sails.log.error("Failed to remove device notification registration", err);
                next(err);
            })
    }
}