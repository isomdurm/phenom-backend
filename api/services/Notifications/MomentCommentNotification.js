/**
 *
 * MomentCommentNotification
 *
 * @module      :: Moment Comment Notification
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a notification for the moment 'comment' action
 *
 **/

var momentjs = require('moment');
var NotificationConstants = require('./NotificationConstants.js');
var AbstractNotification = require('./AbstractNotification.js');

function MomentCommentNotification(commentAuthor, momentAuthor, targetMomentId, commentId){
    AbstractNotification.call(this, commentAuthor.id, momentAuthor.id, momentAuthor.locale);

    //moment
    this.momentId = targetMomentId;
    this.commentId = commentId;
    this.username = commentAuthor.username;
}

MomentCommentNotification.prototype = Object.create(AbstractNotification.prototype);
MomentCommentNotification.prototype.constructor = MomentCommentNotification;

MomentCommentNotification.prototype.getAdditionalData = function(){
    return {
        momentId:  this.momentId,
        commentId: this.commentId
    };
};

MomentCommentNotification.prototype.getMessage = function(){
    return sails.__({
        phrase: 'MOMENT_COMMENT_NOTIFICATION',
        locale: this.locale
    }, this.username);
};

MomentCommentNotification.prototype.getType = function(){
    return NotificationConstants.NotificationTypes.MOMENT_COMMENT;
};

/**
 * Override to include moment information, we should notify on a per-moment basis, not per-type basis
 * @returns {*}
 */
MomentCommentNotification.prototype.shouldNotify = function(){
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
 * Override to prevent inundating the user with comment notifications around a specific moment, not just
 * throttling any moment comment notification
 *
 * @returns {Promise} resolve to 'true' if a push notification should be sent, false otherwise
 */
MomentCommentNotification.prototype.shouldSendPushNotification = function(){
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

module.exports = MomentCommentNotification;