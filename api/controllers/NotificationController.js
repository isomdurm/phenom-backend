/**
 *
 * Notification Controller
 *
 * @module      :: NotificationController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines Phenom API endpoints to request/update mobile application notification functionality for specific
 * application behaviors
 *
 **/
var Promise = require('bluebird');

module.exports = {
    updatePreferences: function(req, res){
        if(!(req.user) || !(req.accessToken)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE, err);
            return;
        }

        //make sure that we have all of the attributes
        var missingParams = Validation.validateParams(req, [/*, "desiredNotifications"*/]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            return;
        }

        var attributeUpdates = {
            //desiredNotifications: req.param('desiredNotifications')
        };

        //we don't check for required parameters since they're options
        NotificationServices.updateNotificationPreferences(attributeUpdates, req.accessToken.id)
        .then(function(){
            Output.sendJSON(res, Errors.noError);
        })
        .catch(function(err){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE, {subError: err.message});
        });
    },

    find: function(req, res){
        if(!(req.user)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
            return;
        }

        //make sure that we have all of the attributes
        var missingParams = Validation.validateParams(req, ['since', 'limit']
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            return;
        }

        new Promise(function(resolve, reject){
            var sinceFloat = parseFloat(req.param('since'));

            if(sinceFloat == NaN){
                throw new Error('Since should be UTC milliseconds');
            }

            var limitInt = parseInt(req.param('limit'));

            if(limitInt == NaN || limitInt < 1){
                throw new Error('Limit should be a positive integer');
            }

            resolve({
                since: sinceFloat,
                limit: limitInt
            });
        })
        .then(function(params){
            return NotificationServices.getNotifications(params.since, params.limit, req.user);
        })
        .then(function(notifications){
            Output.sendJSON(res, Errors.noError, {
                results: notifications.results,
                cursor: notifications.cursor,
                alertsCount: notifications.alertsCount});
        })
        .catch(function(err){
            sails.log.error(err);
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
    },

    destroy: function(req, res){
        if(!(req.user)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
            return;
        }

        //make sure that we have all of the attributes
        var missingParams = Validation.validateParams(req, ["id"]);

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            return;
        }

        //we don't check for required parameters since they're options
        NotificationServices.destroyNotification(req.param('id'))
            .then(function(){
                Output.sendJSON(res, Errors.noError);
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE, {error:  err});
            });
    },

    updateDevice: function(req, res){
        if(!(req.user) || !(req.accessToken)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE, {error:  err});
            return;
        }

        //make sure that we have all of the attributes
        var missingParams = Validation.validateParams(req, ["deviceId", "deviceType"]);

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            return;
        }

        //we don't check for required parameters since they're options
        NotificationServices.updateNotificationTarget(
            req.param('deviceId'),
            parseInt(req.param('deviceType')),
            req.user,
            req.accessToken.id
        )
        .then(function(){
            Output.sendJSON(res, Errors.noError);
        })
        .catch(function(err){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE, {error:  err});
        });
    },

    removeDevice: function(req, res){
        if(!(req.user) || !(req.accessToken)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE, {error:  err});
            return;
        }

        //we don't check for required parameters since they're options
        NotificationServices.destroyNotificationTarget(req.accessToken.id)
            .then(function(){
                Output.sendJSON(res, Errors.noError);
            })
            .catch(function(err){
                Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE, {error:  err});
            });
    },

    acknowledge: function(req, res){
        if(!(req.user) || !(req.accessToken)){
            var err = new Error("Request object doesn't have user model instance");
            sails.log.error("Request must have user object in order to request or update notifications", {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE, {error:  err});
            return;
        }

        NotificationServices.acknowledgeNotification(req.user)
        .then(function(result){
            Output.sendJSON(res, Errors.noError);
        })
        .catch(function(err){
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_ACKNOWLEDGE, {error:  err});
        });
    }
};