/**
 *
 * MomentCommentUserReferenceNotification
 *
 * @module      :: Moment Comment Reference Notification
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a notification for the moment 'comment' action where a user is referenced in a comment
 *
 **/

var momentjs = require('moment');
var NotificationConstants = require('./NotificationConstants.js');
var AbstractNotification = require('./AbstractNotification.js');

function MomentCommentUserReferenceNotification(commentAuthor, referencedUser, targetMomentId, commentId){
    AbstractNotification.call(this, commentAuthor.id, referencedUser.id, referencedUser.locale);

    //moment
    this.momentId = targetMomentId;
    this.commentId = commentId;
    this.username = commentAuthor.username;
}

MomentCommentUserReferenceNotification.prototype = Object.create(AbstractNotification.prototype);
MomentCommentUserReferenceNotification.prototype.constructor = MomentCommentUserReferenceNotification;

MomentCommentUserReferenceNotification.prototype.getAdditionalData = function(){
    return {
        momentId:  this.momentId,
        commentText: this.commentText,
        commentId:  this.commentId
    };
};

MomentCommentUserReferenceNotification.prototype.getMessage = function(){
    return sails.__({
        phrase: 'MOMENT_COMMENT_USER_REFERENCE_NOTIFICATION',
        locale: this.locale
    }, this.username);
};

MomentCommentUserReferenceNotification.prototype.getType = function(){
    return NotificationConstants.NotificationTypes.MOMENT_COMMENT_USER_REFERENCE;
};

/**
 * Override to include moment information, we should notify on a per-moment basis, not per-type basis
 * @returns {*}
 */
MomentCommentUserReferenceNotification.prototype.shouldNotify = function(){
    //Don't notify if the user has already been notified for being referenced in some comment for this moment,
    //otherwise, we could bother the user with an alert for each comment reply if they're tagged again
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
 * Override to prevent inundating the user with comment reference notifications around a specific moment, not just
 * throttling any moment comment reference notification
 *
 * @returns {Promise} resolve to 'true' if a push notification should be sent, false otherwise
 */
MomentCommentUserReferenceNotification.prototype.shouldSendPushNotification = function(){
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

module.exports = MomentCommentUserReferenceNotification;