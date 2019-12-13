/**
 *
 * User Services
 *
 * @module      :: UserServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for user-related functionalities in the Phenom API.
 *
 **/
var Promise = require('bluebird');
var guid = require('node-uuid');
var _ = require('lodash');
var _phenomIdRegEx = new RegExp('^[a-zA-Z0-9_\\.-]{1,30}');

/**
 * Tokenizes the source string
 * @param source String to be tokenized
 * @param delim Tokenize by this delimiter, a regular expression
 * @returns {*|Array}
 * @private
 */
function _tokenize(source, delimRegEx){
	return source.split(delimRegEx);
}

function _handleUsernameChange(user, newUsername){
	return User.findOne({username: newUsername})
	.then(function (tempUser) {
		if (tempUser && tempUser.username != user.username) {
			//there is a duplicate user with this username already, don't allow change
			throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_USERNAME);
		}
		else {
			//make sure we support this username
			if(!_phenomIdRegEx.test(newUsername)){
				throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD);
			}

			user.username = newUsername;
			return user;
		}
	})
	.catch(function (err) {
		if(err.errorCode == Errors.clientErrors.ERROR_CLIENT_DUPLICATE_USERNAME.errorCode
			|| err.errorCode == Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD.errorCode){
			throw err;
		}
		else {
			sails.log.error('Failed to look for users with duplicate desired new username', err.errorMessage);
			throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
		}
	});
}

function _handleEmailChange(user, newEmail)
{
	//flatten incoming email
	newEmail = newEmail.toLowerCase();

	return User.findOne({email: newEmail})
	.then(function(tempUser){
		if(tempUser && tempUser.email != user.email){
			//there is a duplicate user with this email already, don't allow change
			throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_EMAIL);
		}
		else{
			EmailServices.updateMailRecipient(user, newEmail);
			user.email = newEmail;
			return user;
		}
	})
	.catch(function(err){
		if(err.errorCode == Errors.clientErrors.ERROR_CLIENT_DUPLICATE_EMAIL.errorCode){
			throw err;
		}
		else{
			sails.log.error('Failed to look for users with duplicate desired new username', err.errorMessage);
			throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
		}
	});
}

function _handlePasswordChange(user, newPassword){
	return UserPrivate.findOne({
		userId: user.id
	})
	.then(function(userPrivate) {
		userPrivate.password = Buffer(newPassword, 'base64').toString('utf8')
		return userPrivate.save();
	})
	.catch(function(err){
		sails.log.error('Failed to find and update users private data for update', err);
		throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
	});
}

function _saveUserImage(data, user){
	var newKey = guid.v4();

	// if we already have a user image stored in S3, go ahead and delete it before
	// uploading a new one
	if(user.hasOwnProperty('image') && user.image != ""){
		return S3Services.deleteUserImage(user.image)
			.then(function(){
				return S3Services.uploadProfileImage(newKey, data);
			})
			.then(function(){
				user.image = newKey;
				return user.save();
			});
	}
	else{
		return S3Services.uploadProfileImage(newKey, data)
			.then(function(){
				user.image = newKey;
				return user.save();
			});
	}
}

function _handleProfileImageChanges(imageData, user){

	if(imageData){
		return _saveUserImage(imageData, user);
	}
	else{
		return Promise.resolve(user);
	}

}

function _handleFacebookChanges(newFacebookId, user){
	if(user.facebookId != newFacebookId){
		return User.findOne({
			facebookId: newFacebookId
		})
		.then(function(userAccount){
			if(userAccount){
				throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_FACEBOOKACCOUNT);
			}
			else{
				user.facebookId = newFacebookId;
				return user.save();
			}
		});
	}

	return Promise.resolve(user);
}

function _handleTwitterChanges(newTwitterId, user){
	if(user.twitterId != newTwitterId){
		return User.findOne({
			twitterId: newTwitterId
		})
			.then(function(userAccount){
				if(userAccount){
					throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_TWITTERACCOUNT);
				}
				else{
					user.twitterId = newTwitterId;
					return user.save();
				}
			});
	}

	return Promise.resolve(user);
}

function _inviteUser(targetEmail, targetFirstName, targetLastName, user){
	return EmailServices.sendInviteEmail(user, targetEmail, targetFirstName, targetLastName);
}

function _sendWelcomeEmail(user){
	return EmailServices.sendWelcomeEmail(user);;
}

function _followUser(userId, user){

	//we cannot follow ourselves, return error and stop chain
	if(userId === user.id){
		return Promise.reject(new Error("User cannot follow self."));
	}
	else{

		// We need to create a following edge from user to userId
		// but first we will verify that the userId is actually valid, and that user is not already following userId
        var capturedTargetUser = undefined;

		return User.findOne({id: userId})
				.then(function(targetUser){

                    capturedTargetUser = targetUser;
					if(!targetUser){
						throw new Error("No user with id:  " + userId);
					}

                    return Following.findOne({
                        sourceUser: user.id,
                        targetType: Following.followingTypes.USER,
                        targetUser: userId
                    });
				})
                .then(function(followEdge) {

                    // If we are already following this user, then NOP
                    if (followEdge) {
                        return Promise.resolve(userId);
                    }

                    // At this point the logged in user is not following userId, go ahead and
                    // create the Following Edge
                    return Following.create({
                        sourceUser: user.id,
                        targetType: Following.followingTypes.USER,
                        targetUser: userId
                    })
                    .then(function (follow) {

                        // send any new following notifications
                        var followingNotif = new NotificationServices.UserFollowingNotification(user, userId);
                        return followingNotif.sendNotification();
                    })
                    .then(function () {

                        // Increment the following count on TargetUser
                        capturedTargetUser.followersCount = capturedTargetUser.followersCount + 1;
                        console.log("WORKED");
                        return capturedTargetUser.save();
                    });

                });
	}
}

function _unfollowUser(userId, user){

	// we cannot unfollow ourselves, return error and stop chain
	if(userId === user.id){
		return Promise.reject(new Error("User cannot unfollow self."));
	}
	else {

        // We need to delete the following edge from user to userId, if it exists
        return Following.findOne({
            sourceUser: user.id,
            targetType: Following.followingTypes.USER,
            targetUser: userId
        })
        .then(function(followingEdge){
            // If an edge is not found connecting these two users, then they're not currently following each other,
            // bubble up an error stating that we cannot honor the unfollow request
            if(!followingEdge) {
                return Promise.reject(new Error("User not currently following any user with id:  " + userId));
            }

            // If there is an edge, destroy it
            return followingEdge.destroy()
            .then(function(){

                // Update the 'followers' (fans) count on the user who is being unfollowed
                return User.findOne({
                    id: userId
                });
            })
            .then(function(targetUser){

                if(!targetUser) {
                    sails.log.error('Could not find user ' + userId + ' to update its fans count during an unfollow operation.');
                    return Promise.resolve(userId);
                }
                else {

                    // decrement the targetUser's followersCount and save
                    targetUser.followersCount = targetUser.followersCount - 1;
                    return targetUser.save()
                    .then(function(savedTargetUser){
                        return Promise.resolve(savedTargetUser.id);
                    });
                }
            });
        });
	}
}

function _findEmails(user, relativeToUser){

    var cursorDate = new Date(since);

    return new Promise(function(resolve, reject){

        if(limit <= 0){
            return resolve([]);
        }

        Following.find({
			targetUser: user.id,
			targetType: Following.followingTypes.USER
        })
		.sort('createdAt DESC')
        .populate('sourceUser')
        .then(function(followingEdges){
            resolve(followingEdges);
        })
        .catch(function(err){
            reject(err)
        });
    })
    .then(function(followers){

        if(followers.length > 0){
            cursorDate = _.last(followers).createdAt;
        }

        var promises = [];

        followers.forEach(function(follower){
            promises.push(follower.sourceUser.getPublicData(relativeToUser));
        });

        return Promise.settle(promises);
    })
    .then(function(results){
        var usersPublicData = [];

        results.forEach(function(result){
            if(result.isFulfilled()){
                usersPublicData.push(result.value());
            }
            else{
                throw new Error(result.reason());
            }
        });

        return {
			followers:      usersPublicData,
			followersCount: user.followersCount,
			cursor:         cursorDate.getTime()
		}
    });
}

function _findFollowing(since, limit, user, relativeToUser){

    var cursorDate = new Date(since);

    return new Promise(function(resolve, reject){
        if(limit <= 0){
            resolve([])
        }
        else{
            Following.find({
				sourceUser: user.id,
				targetType: Following.followingTypes.USER,
				createdAt: {
					'<': new Date(since)
				}
            })
			.sort('createdAt DESC')
			.limit(limit)
            .populate('targetUser')
            .then(function(following){
                resolve(following);
            })
            .catch(function(err){
                reject(err);
            });
        }
    })
	.then(function(following){

        if(following.length > 0){
            cursorDate = _.last(following).createdAt;
        }

		var promises = [];

		following.forEach(function(followingEdge){
			promises.push(followingEdge.targetUser.getPublicData(relativeToUser));
		});

		return Promise.settle(promises);
	})
	.then(function(results){
		var usersPublicData = [];

		results.forEach(function(result){
			if(result.isFulfilled()){
				usersPublicData.push(result.value());
			}
			else{
				throw new Error(result.reason());
			}
		});

        return user.getFollowingCount()
        .then(function(count){
            return Promise.resolve({
                following:      usersPublicData,
                followingCount: count,
                cursor:         cursorDate.getTime()
            });
        });
    });
}

function _findFollowers(since, limit, user, relativeToUser){

    var cursorDate = new Date(since);

    return new Promise(function(resolve, reject){

        if(limit <= 0){
            return resolve([]);
        }

        Following.find({
			targetUser: user.id,
			targetType: Following.followingTypes.USER,
			createdAt: {
				'<': new Date(since)
			}
        })
		.sort('createdAt DESC')
		.limit(limit)
        .populate('sourceUser')
        .then(function(followingEdges){
            resolve(followingEdges);
        })
        .catch(function(err){
            reject(err)
        });
    })
    .then(function(followers){

        if(followers.length > 0){
            cursorDate = _.last(followers).createdAt;
        }

        var promises = [];

        followers.forEach(function(follower){
            promises.push(follower.sourceUser.getPublicData(relativeToUser));
        });

        return Promise.settle(promises);
    })
    .then(function(results){
        var usersPublicData = [];

        results.forEach(function(result){
            if(result.isFulfilled()){
                usersPublicData.push(result.value());
            }
            else{
                throw new Error(result.reason());
            }
        });

        return {
			followers:      usersPublicData,
			followersCount: user.followersCount,
			cursor:         cursorDate.getTime()
		}
    });
}

/**
 * Builds the waterline search query to locate users, this is a free-text search where
 * the search string is tokenized by spaces. A hit is found when any token is contained
 * within the following fields:
 *   -username
 *   -firstName
 *   -lastName
 *
 * @param criteria
 * @returns {{or: *[], sort: string}}
 * @private
 */
function _buildUserSearchQuery(criteria){
	var tokens = _tokenize(criteria, /\s+/).filter(function(token){
		return token != '';
	});

	var query = {
		or: []
	};

    if (tokens.length > 1) {

    	query.or.push({firstName: {'contains': tokens[0]}, lastName: {'contains': tokens[1]}});

   	} else {

		query.or.push({firstName: {'contains': tokens[0]}});
		query.or.push({lastName:  {'contains': tokens[0]}});
		query.or.push({username:  {'contains': tokens[0]}});

    }

	return query;
}

function _buildEmailSearchQuery(criteria){
	var tokens = _tokenize(criteria, /\s+/).filter(function(token){
		return token != '';
	});

	var query = {
		or: []
	};

	//free text search on firstName, lastName, username
	tokens.forEach(function(token){
		query.or.push({email: token});
	});

	return query;
}


function _buildUsernameSearchQuery(criteria){
	var tokens = _tokenize(criteria, /\s+/).filter(function(token){
		return token != '';
	});

	var query = {
		or: []
	};

	tokens.forEach(function(token){
		query.or.push({username: token});
	});

	return query;
}


function _findUserEmails(searchString, thisUser){

		return User.find(_buildEmailSearchQuery(searchString))
		.then(function(users){
		var promises = [];

		users.forEach(function(user){
			promises.push(user.getPublicData(thisUser));
		});

		return Promise.settle(promises);
	})
	.then(function(results){
		var userPublicData = [];

		results.forEach(function(result){
			if(result.isFulfilled()){
				userPublicData.push(result.value());
			}
			else{
				throw new Error(result.error());
			}
		});

		return Promise.resolve(userPublicData);
	});
}

function _findUsernames(searchString, thisUser){
		return User.find(_buildUsernameSearchQuery(searchString))
	.then(function(users){
		var promises = [];

		users.forEach(function(user){
			promises.push(user.getPublicData(thisUser));
		});

		return Promise.settle(promises);
	})
	.then(function(results){
		var userPublicData = [];

		results.forEach(function(result){
			if(result.isFulfilled()){
				userPublicData.push(result.value());
			}
			else{
				throw new Error(result.error());
			}
		});

		return Promise.resolve(userPublicData);
	});
}

function _findUsers(criteria, page, thisUser){

	//Use waterline to paginate the result set for us, array params are supported in criteria
	return thisUser.consistencyCheck()
	.then(function(){
		return User.find(_buildUserSearchQuery(criteria))
		.paginate({page: page, limit: Config.User.userPageSize});
	})
	.then(function(users){
		var promises = [];

		users.forEach(function(user){
			if (thisUser.sport == user.sport) {
				promises.unshift(user.getPublicData(thisUser));
			} else if (thisUser.hometown == user.hometown) {
				promises.unshift(user.getPublicData(thisUser))
			} else {
				promises.push(user.getPublicData(thisUser));
			}		
		});

		return Promise.settle(promises);
	})
	.then(function(results){
		var userPublicData = [];

		results.forEach(function(result){
			if(result.isFulfilled()){
				userPublicData.push(result.value());
			}
			else{
				throw new Error(result.error());
			}
		});

		return Promise.resolve(userPublicData);
	});
}

/**
 * Gets a user's public data by user id
 * @param userId
 * @returns {*}
 * @private
 */
function _getUserPublicData(userId, relativeToUser){
	return User.findOne({id: userId})
		.then(function(user) {
			if (!user) {
				throw new Error('Unknown user id');
			}
			else {
				return user.getPublicData(relativeToUser);
			}
		})
		.then(function(data){
			return Promise.resolve(data);
		});
}

function _getUserPublicDataForWeb(userId){
	return User.findOne({
		id: userId
	})
	.then(function(user){
		if (!user) {
			throw new Error('Found no user.');
		}
		else {
			return user.getPublicDataForWeb(user);
		}
	});
}

/**
 *
 * @param accessTokenId
 * @returns {Promise}
 * @private
 */
function _logout(accessTokenId) {
	//remove the access/refresh tokens appropriately
	return AccessToken.findOne({
		token: accessTokenId
	})
		.then(function(accessToken){
			if(accessToken){
				return RefreshToken.findOne({accessTokenId:  accessToken.id})
					.then(function(refreshToken){
						if(refreshToken){
							return refreshToken.destroy();
						}
						else{
							return Promise.resolve();
						}
					})
					.then(function(){
						//access tokens cleanup their dependencies automatically (device tokens)
						return accessToken.destroy();
					})
					.catch(function(err){
						throw new Error(err);
					});
			}
			else{
				//not currently logged in
				return Promise.resolve();
			}
		})
		.catch(function(err){
			return Promise.reject(err);
		});
}

function _createAccount(baseUrl, username, password, firstName, lastName, email, gender, hometown, sports, birthDate, imageData, facebookId, suppressEmail){

	var query = {
		or: [{
			email: email
		}, {
			username: username
		}]
	}

	if(facebookId){
		query.or.push({
			facebookId: facebookId
		});
	}

	//first lets make sure this account is available (no duplicate email nor username)
	return User.findOne(query)
		.then(function(user){
			if(user){
				if(user.username === username){
					throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_USERNAME);
				}
				else if(user.email === email){
					throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_EMAIL);
				}
				else if (user.facebookId && user.facebookId === facebookId){
					throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_DUPLICATE_FACEBOOKACCOUNT);
				}
				else{
					//we shouldn't be creating another account if we have a some sort of match.
					throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
				}
			}

			//make sure we support this phenomId
			if(!_phenomIdRegEx.test(username)){
				throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD);
			}

			//flatten in the incoming email address, we're case insensitive, but want to benefit from mongo string indecies
			email = email.toLowerCase();

			return User.create({
				username:   username,
				firstName:  firstName,
				lastName:   lastName,
				email:      email,
				gender: 	gender,
				hometown:   hometown,
				sports:     sports,
				birthDate:  birthDate,
				facebookId: facebookId
			})
				.catch(function(err){
					sails.log.error('Failed to create new user', err);

					var internalError = new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);

					if(err.ValidationError){
						internalError.ValidationError = err.ValidationError;
					}

					throw internalError;
				});
		})
		.then(function(user){

			_followUser("53f245f28e59ba3e566c62e2", user);

			if(!password && facebookId){
				//the case were this account was made with facebook
				password = '';
			}

			return UserPrivate.create({
				password: Buffer(password, 'base64').toString('utf8'),
				userId:   user.id
			})
				.then(function(){
					return _handleProfileImageChanges(imageData, user)
					.then(function(){
						//Fire and forget the next call
						//Disabled until list fixed
						EmailServices.addNewMailRecipient(user);

						//Fire and forget the next call
						AnalyticsServices.reportNewUser(user);

						if(suppressEmail){
							return Promise.resolve();
						}
						else{
							return UserServices.sendWelcomeEmail(user, baseUrl);
						}
					});
				})
				.catch(function(err){
					sails.log.error('Failed to create new user (private data)', err);

					var internalError = new Errors.PMError(Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);

					if(err.ValidationError){
						internalError.ValidationError = err.ValidationError;
					}

					throw internalError;
				});
		})
		.catch(function(err){
			sails.log.error('Failed to create a new user', err);

			//any errors at this point are generic failed to create errors from the client's point of view
			//we don't want any node errors to escape to the user

			throw new Errors.PMError(err || Errors.serverErrors.ERROR_SERVER_FAILED_TO_CREATE);
		});
}

function _updateUser(updates, user){

	console.log(updates);

	return new Promise(function(resolve, reject){
		if(updates.hasOwnProperty('username')){
			_handleUsernameChange(user, updates.username)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					reject(err);
				});
		}
		else{
			resolve();
		}
	})
	.then(function(){
		if(updates.hasOwnProperty('email')){
			var email = updates.email;
			delete updates.email;
			return _handleEmailChange(user, email);
		}

		return Promise.resolve();
	})
	.then(function(){
		if(updates.hasOwnProperty('password')){
			var password = updates.password;
			delete updates.password;
			return _handlePasswordChange(user, password);
		}

		return Promise.resolve();
	})
	.then(function(){
		if(updates.hasOwnProperty('facebookId')){
			var newFacebookId = updates.facebookId;
			delete updates.facebookId;
			return _handleFacebookChanges(newFacebookId, user);
		}

		return Promise.resolve();
	}).then(function(){
		if(updates.hasOwnProperty('twitterId')){
			var newTwitterId = updates.twitterId;
			delete updates.twitterId;
			return _handleTwitterChanges(newTwitterId, user);
		}

		return Promise.resolve();
	})
	.then(function(){
		if(updates.hasOwnProperty('imageData')){
			var imageData = updates.imageData;
			delete updates.imageData;
			return _handleProfileImageChanges(imageData, user);
		}

		return Promise.resolve();
	})
	.then(function(){
		//apply the simply attribute updates
		for(var attr in updates){
			
			if (!user[attr]) {
				user[attr] = updates[attr];
			} else {
				user[attr] = updates[attr];
			}
		}

		return user.save()

	})
	.catch(function(err){
		sails.log.error('Failed to update user', err);
		//any errors at this point are generic failed to create errors from the client's point of view
		//we don't want any node errors to escape to the user

		throw new Errors.PMError(err || Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
	});
}

function _findUsersByEmail(user, emails){
	//chunkify the incoming emails list as to not stress the $in operator and then fan out
	return Promise.settle(_.map(_.chunk(emails, 250), function(chunk){
		return User.find({
			email: _.filter(_.map(chunk, function(email){
				return email.toLowerCase();
			}), function(email){
				return email != user.email;
			})
		});
	})).filter(function(result){
		if(result.isRejected()){
			sails.log.error('Failed to search for a users by email', {error: result.error()});
			return false;
		}

		return true;
	}).map(function(result){return result.value();})
	.then(function(userGroups){
		return Promise.settle(_.map(_.flatten(userGroups), function(userHit){
			return userHit.getSummary(user);
		})).filter(function(result){
			if(result.isRejected()){
				sails.log.error('Failed to hydrate user while searching for a users by email', {error: result.error()});
				return false;
			}

			return true;
		}).map(function(result){
			return result.value();
		});
	});
}

function _findFacebookFriends(user, accessToken, pageNumber) {
	return FacebookServices.findPhenomUsers(accessToken, pageNumber)
		.then(function(fbUsers){
			if(fbUsers.hasOwnProperty('data')){
				return User.find({
					facebookId: _.map(fbUsers.data, function (item) {
						return item.id;
					})
				});
			}
			else{
				return Promise.resolve([]);
			}
		})
		.then(function(users){
			var promises = [];

			users.forEach(function(thisUser){
				promises.push(thisUser.toJSON(user));
			});

			return Promise.settle(promises);
		})
		.then(function(results){
			var users = [];

			results.forEach(function(result){
				if(result.isRejected()){
					sails.log.error("Failed to hydrate user object when searching for associated Phenom user for FB user", {err: result.error()});
				}
				else{
					users.push(result.value());
				}
			});

			return users;
		});
}

module.exports = {

	/**
	 * Creates a new user
	 *
	 * @param username
	 * @param password
	 * @param firstName
	 * @param lastName
	 * @param email
	 * @param hometown
	 * @param sport
	 * @param birthDate
	 * @param imageData
	 * @returns {*} resolving with the new user model upon completion
	 */
	createUser: _createAccount,

	/**
	 * Updates an existing user
	 * @param updates
	 * @param user
	 * @returns {Promise} resolving on completion
	 */
	updateUser: _updateUser,

	/**
	 * Sends invite e-mail
	 * @param targetEmail
	 * @param user
	 * @param targetFirstName
	 * @param targetLastName
	 * @returns {Promise} resolving on completion
	 */
	inviteUser: _inviteUser,

	/**
	 * Sends welcome e-mail for new users
	 * @param user
	 * @param urlRoot
	 * @returns {Promise} resolving on completion
	 */
	sendWelcomeEmail: _sendWelcomeEmail,

	/**
	 * Follows another user, if the user is already following, there is no change
	 * @param userId
	 * @param user
	 * @returns {Promise} resolving on success
	 */
	follow: _followUser,




	getEmails: _findUserEmails,

	getUsernames: _findUsernames,

	/**
	 * Unfollows another user, if the user is not currently following, there is no change
	 * @param userId
	 * @param user
	 * @returns {Promise} resolving on success
	 */
	unfollow: _unfollowUser,

	/**
	 * Searches a user's following, paginated
	 * @param since - date placeholder to base the query
	 * @param limit - number of results to fetch
	 * @param user - target user's following
	 * @param relativeToUser - tailors the results in the context of this user (things like userFollows)
	 * @returns {Promise} resolving with subset of user's following
	 */
	findFollowing: _findFollowing,

	/**
	 * Searches a user's followers, paginated
	 * @param page
	 * @param user - target user's followers
	 * @param relativeToUser - tailors the results to the context of this user (things like userFollows)
	 * @returns {Promise} resolving with a subset collection of user's followers (public data)
	 */
	findFollowers: _findFollowers,

	/**
	 * Searches for other users, paginated
	 * @param criteria
	 * @param page
	 * @param user
	 * @returns {Promise} resolving with a collection of located public user objects
	 */
	findUsers: _findUsers,

	/**
	 *
	 * @param userId
	 * @returns {Promise} resolving with target user's public data
	 */
	getUserPublicData: _getUserPublicData,

	getUserPublicDataForWeb: _getUserPublicDataForWeb,

	/**
	 * Logout - Removes Access/Refresh/Notification tokens for the logged in user
	 * @param accessTokenId
	 * @returns {Promise} resolves on success
	 */
	logout: _logout,

	/**
	 * Finds existing users in the system by email, helps power the 'Invite Friends - By Contacts' page
	 * @param user Logged in user
	 * @param emails Collection of email address to search
	 * @returns {Promise} resolves with fully hydrated users matching by email address
	 *
	 * Note:  This method powers the 'Already in Phenom' portion of 'Invite Friends'.  It's designed to
	 * 		  hydrate all existing users by email, all at once. This function can potentially take significant
	 * 		  time to resolve.  It will internally fan out larger requests to waterline by 'chunkifying' the input
	 * 		  emails parameter.
	 */
	findUsersByEmail: _findUsersByEmail,

	/**
	 * Finds FB friends by page number, we use raw page number since the request is ultimately offloaded to FB
	 * and it's easy for clients to use
	 * @param pageNumber
	 * @returns {Promise} resolves with fully populated user objects
	 */
	findFacebookFriends: _findFacebookFriends
};