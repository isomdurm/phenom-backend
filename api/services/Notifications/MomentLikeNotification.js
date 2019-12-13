/**
 *
 * MomentLikeNotification
 *
 * @module      :: Moment Like Notification
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a notification for the moment 'like' action
 *
 **/

var momentjs = require('moment');
var NotificationConstants = require('./NotificationConstants.js');
var AbstractNotification = require('./AbstractNotification.js');

function MomentLikeNotification(userDoingLikeAction, moment){
    AbstractNotification.call(this, userDoingLikeAction.id, moment.userId, userDoingLikeAction.locale);

    this.username = userDoingLikeAction.username;
    this.momentId = moment.id;
    this.imageUrlTiny = moment.image;
}

MomentLikeNotification.prototype = Object.create(AbstractNotification.prototype);
MomentLikeNotification.prototype.constructor = MomentLikeNotification;

MomentLikeNotification.prototype.getAdditionalData = function(){
    return {
        momentId:  this.momentId,
        imageUrlTiny: ("https:\/\/d1m9cftgf9ypai.cloudfront.net\/dev\/momentimages\/" + this.imageUrlTiny + "_tiny")
    };
};

MomentLikeNotification.prototype.getMessage = function(){
    return sails.__({
        phrase: 'MOMENT_LIKE_NOTIFICATION',
        locale: this.locale
    }, this.username);
};

MomentLikeNotification.prototype.getType = function(){
    return NotificationConstants.NotificationTypes.MOMENT_LIKE;
};

/**
 * Override to include moment information, we should notify on a per-moment basis, not per-type basis
 * @returns {*}
 */
MomentLikeNotification.prototype.shouldNotify = function(){
    //Don't notify if the user has already been notified for comments written by source for this moment
    var self = this;

    if(!self.canNotify()){
        return Promise.resolve(false);
    }
    else{
        return Notification.find({
            targetId: self.targetId,
            sourceId: self.sourceId,
            'additionalData.momentId': self.momentId,
            notificationType: self.getType()
        })
            .limit(1)
            .then(function(notifs){
                return (notifs.length <= 0);
            });
    }
};

/**
 * Override to prevent inundating the user with like notifications around a specific moment, not just
 * throttling any moment like notification
 *
 * @returns {Promise} resolve to 'true' if a push notification should be sent, false otherwise
 */
MomentLikeNotification.prototype.shouldSendPushNotification = function(){
    var self = this;
    var thresholdDate = (new momentjs()).subtract(Config.Notification.defaultNotificationLimitBuffer, 'minutes').toDate();

    return Notification.find({
        targetId: self.targetId,
        notificationType: self.getType(),
        acknowledged: false,
        'additionalData.momentId': self.momentId,
        createdAt: {
            '>=': thresholdDate
        }
    })
        .limit(Config.Notification.defaultNotificationLimitBuffer)
        .then(function(notifs){
            //if we've exceeded the maximum allowed notifications per unit time
            return (notifs.length <= Config.Notification.defaultNotificationLimitBuffer);
        });
};

module.exports = MomentLikeNotification;