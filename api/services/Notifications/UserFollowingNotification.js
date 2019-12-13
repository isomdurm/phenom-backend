/**
 *
 * UserFollowingNotification
 *
 * @module      :: User Following Notificaiton
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines notifications related to the 'follow' action for User objects
 *
 **/

var NotificationConstants = require('./NotificationConstants.js');
var AbstractNotification = require('./AbstractNotification.js');

function UserFollowingNotification(userDoingFollowing, userBeingFollowedId){
    AbstractNotification.call(this, userDoingFollowing.id, userBeingFollowedId, userDoingFollowing.locale);

    this.username = userDoingFollowing.username;
}

UserFollowingNotification.prototype = Object.create(AbstractNotification.prototype);
UserFollowingNotification.prototype.constructor = UserFollowingNotification;

UserFollowingNotification.prototype.getMessage = function(){
    return sails.__({
        phrase: 'USER_FOLLOWING_NOTIFICATION',
        locale: this.locale
    }, this.username);
};

UserFollowingNotification.prototype.getType = function(){
    return NotificationConstants.NotificationTypes.USER_FOLLOWING;
};

module.exports = UserFollowingNotification;