/**
 *
 * MomentHeadlineUserReferenceNotification
 *
 * @module      :: Moment Headline Reference Notification
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a notification for the moment 'create' action where a user is referenced in a moment headline
 *
 **/

var momentjs = require('moment');
var NotificationConstants = require('./NotificationConstants.js');
var AbstractNotification = require('./AbstractNotification.js');

function MomentHeadlineUserReferenceNotification(momentAuthor, referencedUser, targetMomentId, headline){
    AbstractNotification.call(this, momentAuthor.id, referencedUser.id, referencedUser.locale);

    //moment
    this.momentId = targetMomentId;
    this.headline = headline;
    this.username = momentAuthor.username;
}

MomentHeadlineUserReferenceNotification.prototype = Object.create(AbstractNotification.prototype);
MomentHeadlineUserReferenceNotification.prototype.constructor = MomentHeadlineUserReferenceNotification;

MomentHeadlineUserReferenceNotification.prototype.getAdditionalData = function(){
    return {
        momentId:  this.momentId,
        commentText: this.commentText
    };
};

MomentHeadlineUserReferenceNotification.prototype.getMessage = function(){
    return sails.__({
        phrase: 'MOMENT_USER_REFERENCE_NOTIFICATION',
        locale: this.locale
    }, this.username);
};

MomentHeadlineUserReferenceNotification.prototype.getType = function(){
    return NotificationConstants.NotificationTypes.MOMENT_USER_REFERENCE;
};

/**
 * Overriden to include moment information in the generic shouldNotify implementation, since we shouldNotify
 * on a per-moment basis, not per-notification type basis.
 *
 * @returns {Promise} resolves to 'true' if a notification should be created, false otherwise
 */
MomentHeadlineUserReferenceNotification.prototype.shouldNotify = function(){
    //Don't notify if the user has already been notified for comments written by source for this moment
    var self = this;

    if(!self.canNotify()){
        return Promise.resolve(false);
    }
    else{
        //Headline editing is not supported, so this resolves to always true
        return Promise.resolve(true);
    }
};

/**
 * Override to prevent inundating the user with comment reference notifications around a specific moment, not just
 * throttling any moment reference notifications
 *
 * @returns {Promise} resolve to 'true' if a push notification should be sent, false otherwise
 */
MomentHeadlineUserReferenceNotification.prototype.shouldSendPushNotification = function(){
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

module.exports = MomentHeadlineUserReferenceNotification;