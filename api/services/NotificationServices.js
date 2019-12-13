/**
 *
 * NotificationServices
 *
 * @module      :: Notification Services
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Application-wide support for sending and receiving mobile push notifications.  Notifications may be
 * intended to be acknowledged by the user, or may be for mobile application consumption only (such as
 * notifying that app that it should probably go perform and update)
 *
 **/

var Promise = require('bluebird');
var sns = require('sns-mobile');
var apnServices = undefined;
var _ = require('lodash');
var NotificationConstants = require('./Notifications/NotificationConstants.js');

function _init(){
    var isSandboxed = Config.AWS.SNS.getiOSARN().indexOf("APNS_SANDBOX") != -1;

    apnServices = new sns({
        platform:                sns.SUPPORTED_PLATFORMS.IOS,
        region:                  Config.AWS.SNS.defaultRegion,
        apiVersion:              Config.AWS.SNS.apiVersion,
        accessKeyId:             Config.AWS.config.accessKeyId,
        secretAccessKey:         Config.AWS.config.secretAccessKey,
        platformApplicationArn:  Config.AWS.SNS.getiOSARN(),
        sandbox:                 isSandboxed
    });
}

function _addDeviceToAPNS(deviceId){
    return new Promise(function(resolve, reject){
        apnServices.addUser(deviceId, JSON.stringify({/* extra data */}), function(err, endpointArn){
            if(err){
                reject(err);  //bubble up to fail block
            }
            else{
                resolve(endpointArn);
            }
        });
    });
}

function _removeDeviceFromAPNS(endpointARN){
    return new Promise(function(resolve, reject){
        apnServices.deleteUser(endpointARN, function(err){
            if(err){
                reject(err);  //bubble up to fail block
            }
            else{
                resolve();
            }
        });
    });
}

function _addDevice(deviceId, type){
    if(type === NotificationConstants.DeviceTypes.IOS){
        return _addDeviceToAPNS((deviceId))
            .then(function(id){
                return Promise.resolve(id);
            });
    }
    else{
        return Promise.reject(new Error('Unrecognized device type'));
    }
}

function _removeDevice(endpointARN, type){
    if(type === NotificationConstants.DeviceTypes.IOS){
        return _removeDeviceFromAPNS(endpointARN)
            .then(function(){
                return Promise.resolve();
            });
    }
    else{
        return Promise.reject(new Error('Unrecognized device type'));
    }
}

function _updateDesiredNotifications(notif, newValue){
    var _compareArray = function(arr1, arr2){
        if(arr1.length != arr2.length){
            return false;
        }

        arr1.forEach(function(item){
            if(arr2.indexOf(item) < 0){
                return false;
            }
        });

        return true;
    }

    var isSame = true;

    if(notif.desiredNotifications) {
        _compareArray(notif.desiredNotifications, newValue);
    }

    if(!isSame) {
        notif.desiredNotifications = newValue;

        return notif.save();
    }
    else{
        return Promise.resolve();
    }
}

function _removeObsoleteTargets(currentTargets, newDeviceId, accessTokenId){

    //of the existing targets matching the new deviceId, let's nuke them if they don't match
    //the current user/device/app version
    var toNuke = _.remove(currentTargets, function(target){

        //if this target has an old device id, nuke it
        if(target.deviceId != newDeviceId){
            return true;
        }

        //we really only support 1 access token per device, lets clean up old ones
        if(target.accessTokenId != accessTokenId){
            return true;
        }

        //if this target is iOS, and this version of the application is in development mode,
        //and the target is not in 'dev' mode, switch.  This will make sure testers can swap environments
        //gracefully as they switch between live and test versions of the app
        if(target.deviceType === NotificationConstants.DeviceTypes.IOS) {
            var isThisMachineDevEnv = Config.AWS.SNS.getiOSARN().search("SANDBOX") != -1;
            var isTargetDevEnv = target.endpointARN.search("SANDBOX") != -1;

            //if app env and target env don't match, nuke
            return isThisMachineDevEnv != isTargetDevEnv;
        }

        return false;
    });

    var idsToDestroy = _.pluck(toNuke, 'id');

    if(idsToDestroy.length == 0){
        return Promise.resolve(currentTargets[0]);
    }

    return NotificationTarget.destroy({
        id: idsToDestroy
    }).then(function(){
        if(currentTargets.length < 1){
            return _addDevice(deviceId, deviceType)
                .then(function(id){
                    return NotificationTarget.create({
                        userId:                user.id,
                        accessTokenId:         accessTokenId,
                        deviceType:            deviceType,
                        deviceId:              deviceId,
                        endpointARN:           id//,
                        //desiredNotifications:  attributeUpdates.desiredNotifications
                    });
                });
        }

        return Promise.resolve(currentTargets[0]);
    });
}

function _updateNotificationTarget(deviceId, deviceType, user, accessTokenId){
    //fetch the existing targets that match this access token or the new device id
    return NotificationTarget.find({
        or: [
            {deviceId:  deviceId},
            {accessTokenId: accessTokenId}
        ]
    }).then(function(notifTargets){
        if(notifTargets.length > 0){
            return _removeObsoleteTargets(notifTargets, deviceId, accessTokenId);
        }
        else{
            return _addDevice(deviceId, deviceType).then(function(id){
                return NotificationTarget.create({
                    userId:                user.id,
                    accessTokenId:         accessTokenId,
                    deviceType:            deviceType,
                    deviceId:              deviceId,
                    endpointARN:           id//,
                    //desiredNotifications:  attributeUpdates.desiredNotifications
                });
            });
        }
    });
}

function _updateNotificationPreferences(attributeUpdates, accessTokenId){
    return NotificationTarget.findOne({accessTokenId: accessTokenId})
    .then(function(notif){
        if(notif){
            _updateDesiredNotifications(notif, attributeUpdates.desiredNotifications)
            .then(function(){
                return Promise.resolve();
            });
        }
        else{
            return Promise.reject(new Error('No devices to update'));
        }
    });
}

function _destroyNotificationTarget(accessTokenId){
    //get the Notification associated with this access token
    return NotificationTarget.findOne({accessTokenId: accessTokenId})
    .then(function(notif) {
        if (notif) {
            return notif.destroy();
        }
        else {
            return Promise.resolve();
        }
    });
}

function _renableAPNSEndpointAndRetry(notificationTarget, snsPayload)
{
    return new Promise(function(resolve, reject){
        apnServices.setAttributes(notificationTarget.endpointARN, {
            Enabled: 'true'
        }, function(err, result) {
            if (err) {
                return reject(err);
            }

            apnServices.sendMessage(notificationTarget.endpointARN, snsPayload, function (err, messageId) {
                if(err){
                    return reject(err);
                }

                resolve(messageId);
            });
        });
    });
}

function _sendNotificationUsingAPNS(notificationTarget, sourceId, message, additionalData){
    var iOSMessage = { default: message };

    iOSMessage = {
        aps: {
            alert: message,
            sourceId: sourceId,
            additionalData: additionalData
        }
    };

    //get the user target
    return User.findOne({
        id: notificationTarget.userId
    }).then(function(user){
        if(user){
            //get the badge count
            return user.getNotificationCount();
        }
        else{
            return Promise.resolve(1);
        }
    })
    .then(function(count){
        iOSMessage.aps.badge = count;

        return new Promise(function(resolve, reject){
            apnServices.sendMessage(notificationTarget.endpointARN, iOSMessage, function(err, messageId){
                if(err && err.code === "EndpointDisabled") {
                    _renableAPNSEndpointAndRetry(notificationTarget, iOSMessage).then(function(messageId){
                        resolve(messageId);
                    }).catch(function(err){
                        reject(new Error('Error sending notification', {error: err}));
                    });
                }
                else if(err){
                    reject(new Error('Error sending notification', {error: err}));
                }
                else{
                    resolve(messageId);
                }
            });
        });
    });
}

function _sendNotificationHelper(notificationTarget, sourceId, message, additionalData){
    if(notificationTarget.deviceType === NotificationConstants.DeviceTypes.IOS){
        return _sendNotificationUsingAPNS(notificationTarget, sourceId, message, additionalData)
        .then(function(){
            return Promise.resolve();
        });
    }
    else{
        return Promise.reject(new Error('Unrecognized device type'));
    }
}

/**
 * Sends notifications to all notificationTargets
 *
 * @param notificationTargets
 * @param sourceId
 * @param message
 * @param additionalData
 * @returns Promise resolving in the number of messages sent, rejects otherwise
 * @private
 */
function _sendNotification(notificationTargets, sourceId, message, additionalData){
    var promises = [];

    notificationTargets.forEach(function(notificationTarget){
        promises.push(_sendNotificationHelper(notificationTarget, sourceId, message, additionalData));
    });

    return Promise.settle(promises)
        .then(function(results){
            //get the total number of notifications sent
            var sent = 0;

            results.forEach(function(result){
                if(result.isFulfilled()){
                    sent = sent + 1;
                }
            });

            return Promise.resolve(sent);
        });
}

/**
 * Acknowledges all 'un-acknowledged' notifications for a user
 *
 * @param user
 * @returns promise resolving on success, rejecting with error otherwise
 * @private
 */
function _acknowledgeNotifications(user){
    //find the appropriate notification object
    return Notification.find({
        targetId: user.id,
        acknowledged: false
    })
    .then(function(notifs){
        var pendingUpdates = [];

        notifs.forEach(function(notif){
            notif.acknowledged = true;
            pendingUpdates.push(notif.save());
        });

        return Promise.settle(pendingUpdates);
    })
    .then(function(results){
        results.forEach(function(result){
            if(result.isRejected()){
                throw new Error('Unable to acknowledge notification:  ' + result.reason().message);
            }
        });

        return Promise.resolve();
    });
}

function _destroyNotification(id){
    return Notification.findOne({id: id})
    .then(function(notif){
        if(!notif){
            throw new Error('Notification not found');
        }
        else{
            return notif.destroy();
        }
    });
}

/**
 * Fetches notifications for a user
 *
 * @param user
 * @param pageNumber
 * @returns {Promise} resolving with:
 *                      -results:     paged array of notifications
 *                      -pageNumber:  page
 *                      -alertsCount: total number of notifications for user
 * @private
 */
function _getNotificationsForUser(since, limit, user) {

    var cursorDate = new Date(since);

    return new Promise(function (resolve, reject) {
        if (limit < 1) {
            return resolve([]);
        }

        Notification.find({
            where: {
                targetId: user.id,
                createdAt: {
                    '<': new Date(since)
                }
            }, sort: 'createdAt DESC'
        })
        .limit(limit)
        .then(function (notifs) {
            resolve(notifs)
        })
        .catch(function (error) {
            reject(error);
        })
    })
    .then(function (notifications) {

        if (notifications.length > 0) {
            cursorDate = _.last(notifications).createdAt;
        }

        var promises = [];

        notifications.forEach(function (notification) {
            promises.push(notification.toJSON());
        });

        return Promise.settle(promises);
    })
    .then(function (notifications) {
        var results = [];

        notifications.forEach(function (notification) {
            if (notification.isRejected()) {
                sails.log.error('Promise failed in allSettled', notification.reason());
            }
            else {
                results.push(notification.value());
            }
        });

        return Notification.count({
            targetId: user.id
        })
        .then(function (count) {
            return {
                results: results,
                cursor: cursorDate.getTime(),
                alertsCount: count
            };
        });
    });
}


/**
 * Module Interface
 * @type {{getFileFromRequest: Function}}
 */
module.exports = {
    //Groups the various notifications under the NotificationServices namespace
    UserFollowingNotification: require('./Notifications/UserFollowingNotification.js'),
    MomentLikeNotification: require('./Notifications/MomentLikeNotification.js'),
    MomentCommentNotification: require('./Notifications/MomentCommentNotification.js'),
    MomentCommentUserReferenceNotification: require('./Notifications/MomentCommentUserReferenceNotification.js'),

    init: function(){
        _init();
    },

    updateNotificationTarget: function(deviceId, deviceType, user, accessTokenId){
        return _updateNotificationTarget(deviceId, deviceType, user, accessTokenId);
    },

    destroyNotificationTarget: function(accessTokenId){
        return _destroyNotificationTarget(accessTokenId);
    },

    updateNotificationPreferences: function(updatedAttributes, accessTokenId){
        return _updateNotificationPreferences(updatedAttributes, accessTokenId)
    },

    sendNotification: function(notificationTargets, sourceId, message, additionalData){
        return _sendNotification(notificationTargets, sourceId, message, additionalData);
    },

    destroyNotification: function(id){
        return _destroyNotification(id);
    },

    acknowledgeNotification: function(user){
        return _acknowledgeNotifications(user);
    },

    getNotifications: function(since, limit, user){
        return _getNotificationsForUser(since, limit, user);
    },

    removeDevice: function(endpointARN, deviceType){
        return _removeDevice(endpointARN, deviceType);
    }
};
