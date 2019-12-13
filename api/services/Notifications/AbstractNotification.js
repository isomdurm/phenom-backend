/**
 *
 * AbstractNotification
 *
 * @module      :: Notification Base Class Implementation
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines an abstract Notification Services object in the system, note these
 * objects should not be confused with the 'Notification' model object
 *
 **/

var NotificationConstants = require('./NotificationConstants.js');

var momentjs = require('moment');

function AbstractNotification(sourceId, targetId, locale){
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.locale = locale;
}

AbstractNotification.prototype.canNotify = function(){
    //Conditions where we're allowed to notify the user of this action.
    //   1.  We shouldn't notify ourselves of things that we're doing
    return (this.targetId != this.sourceId);
};

AbstractNotification.prototype._filterTargets = function(notificationTargets){
    var seen = {};  //hash table for quick lookup, used to filter out duplicate notification targets
    var targets = [];

    //Conditions for a valid notification target:
    //  1. No duplicates, 1 notification per deviceId
    //  2. Has the user enabled this type of notification
    notificationTargets.forEach(function(target){
        if(!(seen.hasOwnProperty(target.deviceId))
        /*target.desiredNotifications.indexOf(notification.getType()) > -1*/)
        {
            //we've now seen this item, so track it
            seen[target.deviceId] = true;

            targets.push(target);
        }
    });

    return targets;
};

AbstractNotification.prototype.getType = function(){
    return 'unknown';
};

AbstractNotification.prototype.getMessage = function(){
    return "";
};

AbstractNotification.prototype.getAdditionalData = function(){
    return {};
};

AbstractNotification.prototype.shouldNotify = function(){
    //The default implementation is not notify if the user can been notified by
    //source user for this notification type before
    var self = this;

    if(!self.canNotify()){
        return Promise.resolve(false);
    }
    else{
        return Notification.find({
            targetId: self.targetId,
            sourceId: self.sourceId,
            notificationType: self.getType()
        })
            .limit(1)
            .then(function(notifs){
                return (notifs.length <= 0);
            });
    }
};

AbstractNotification.prototype.shouldSendPushNotification = function(){
    //The default implementation is to only notify if we don't exceed a threshold of notifications per some unit
    //of time
    var self = this;
    var thresholdDate = (new momentjs()).subtract(Config.Notification.defaultNotificationLimitBuffer, 'minutes').toDate();
    var self = this;

    return Notification.find({
        targetId: self.targetId,
        notificationType: self.getType(),
        acknowledged: false,
        createdAt: {
            '>=': thresholdDate
        }
    })
        .limit(Config.Notification.defaultNotificationLimitBuffer)
        .then(function(notifs){
            //if we've exceeded the maximum allowed notifications per unit time
            return (notifs.length >= Config.Notification.defaultNotificationLimitBuffer);
        });
};

/* global NotificationTarget */
AbstractNotification.prototype.getNotificationTargets = function(){
    var self = this;

    //build up a list of notification targets
    return NotificationTarget.find({userId: this.targetId})
        .then(function(targets){
            //perform any necessary filtering
            return Promise.resolve(self._filterTargets(targets));
        });
};

/* global NotificationServices */
AbstractNotification.prototype.sendNotification = function(){
    var self = this;

    return self.shouldNotify()
        .then(function(shouldNotify){
            if(shouldNotify === false){
                return Promise.resolve(0);
            }
            else{
                //record a notification for the alerts page
                return Notification.create({
                    targetId: self.targetId,
                    sourceId: self.sourceId,
                    notificationType: self.getType(),
                    additionalData: self.getAdditionalData(),
                    message: self.getMessage()
                })
                    .then(function(){
                        return self.shouldSendPushNotification();
                    })
                    .then(function(shouldSendPushNotification){
                        if(shouldSendPushNotification === false){
                            return Promise.resolve(0);
                        }
                        else{
                            return self.getNotificationTargets()
                                .then(function(targets){
                                    //send push notifications to targets if we have some
                                    if(targets.length > 0){
                                        return NotificationServices.sendNotification(
                                            targets,
                                            self.sourceId,
                                            self.getMessage(),
                                            self.getAdditionalData()
                                        );
                                    }
                                });
                        }
                    });
            }
        });
};

module.exports = AbstractNotification;