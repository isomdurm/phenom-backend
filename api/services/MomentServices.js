 /**
 *
 * Moment Services
 *
 * @module      :: MomentServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for Moment-bound operations
 *
 **/

var Promise = require('bluebird');
var guid = require('node-uuid');
var _ = require('lodash');
var util = require('util');
var MomentHeadlineUserReferenceNotification = require('./Notifications/MomentHeadlineUserReferenceNotification.js');

/**
 * Feed types:
 *   -default:  public feed, youngest first
 *   -following:  friends feed, youngest first
 *
 * @type {{DEFAULT: string, FOLLOWING: string}}
 * @private
 */
// var _feedTypes = {
// 	DEFAULT:   '0',
// 	FOLLOWING: '1'
// };

// Feed type has been depricated, as users are no longer seeing more than one feed.

//Feed Type deprication needs to be instatiated.



 /**
  *  Updates product metadata for a new moment with products 'productIds'
  *
  **/

 function _updateProductMetadataForCreateMoment(userId, moment){
	 function __incrementUserProductMomentCount(userId, productId){
		 return UserProductData.findOne({
			 userId: userId,
			 product: productId
		 })
			 .then(function(data){
				 if(!data){
					 sails.log.error(new Error('No link found between this user and product: ' + userId + ", " + productId));
					 return Promise.resolve();
				 }
				 else{
					 data.momentCount = data.momentCount + 1;

					 return data.save();
				 }
			 });
	 }

	 function __updateProductMetadata(productId, moment){
		 return ProductMetadata.findOne({
			 product: productId
		 })
			 .then(function(productMetadata){
				 if(!productMetadata){
					 sails.log.error(new Error('No ProductMetadata object for productId:  ' + productId));
					 return Promise.resolve();
				 }

				 switch(moment.mode)
				 {
					 case Moment.momentModeTypes.GAMING:
						 productMetadata.gamingMomentCount = productMetadata.gamingMomentCount + 1;
						 break;
					 case Moment.momentModeTypes.STYLING:
						 productMetadata.stylingMomentCount = productMetadata.stylingMomentCount + 1;
						 break;
					 case Moment.momentModeTypes.TRAINING:
						 productMetadata.trainingMomentCount = productMetadata.trainingMomentCount + 1;
						 break;
					 default:
						 break;
				 }

				 return productMetadata.save();
			 });
	 }

	 var promises = [];

	 moment.productIds.forEach(function(productId){
		 promises.push(__updateProductMetadata(productId, moment));
		 promises.push(__incrementUserProductMomentCount(userId, productId));
	 });

	 return Promise.settle(promises)
		 .then(function(results){
			 //we're not going to raise the red flag if we didn't get all the promises
			 //to resolve, but we'll at least log an error
			 results.forEach(function(result){
				 if(result.isRejected()){
					 sails.log.error('Promise failed in allSettled', result.reason());
				 }
			 });

			 return Promise.resolve(moment.productIds);
		 });
 }

/**
 *  Decrements the global and user-only moment count for all products in productIds
 **/
function _updateProductMetadataForMomentDelete(userId, moment){

	function __decrementUserProductMomentCount(userId, productId){
		return UserProductData.findOne({
			userId: userId,
			product: productId
		})
			.then(function(data) {
				if (!data) {
					sails.log.error(new Error('No link found between this user and product: ' + userId + ", " + productId));
					return Promise.resolve();
				}

				data.momentCount = data.momentCount - 1;
				return data.save();
			});
	}

	function __updateProductMetadata(productId, moment){
		return ProductMetadata.findOne({
			product: productId
		})
			.then(function(productMetadata){
				if(!productMetadata){
					sails.log.error(new Error('No ProductMetadata object for productId:  ' + productId));
					return Promise.resolve();
				}

				switch(moment.mode)
				{
					case Moment.momentModeTypes.GAMING:
						productMetadata.gamingMomentCount = Math.max(0, productMetadata.gamingMomentCount - 1);
						break;
					case Moment.momentModeTypes.STYLING:
						productMetadata.stylingMomentCount = Math.max(0, productMetadata.stylingMomentCount - 1);
						break;
					case Moment.momentModeTypes.TRAINING:
						productMetadata.trainingMomentCount = Math.max(0, productMetadata.trainingMomentCount - 1);
						break;
					default:
						break;
				}

				return productMetadata.save();
			});
	}

	var promises = [];
	moment.productIds.forEach(function(productId){
		promises.push(__decrementUserProductMomentCount(userId, productId));
		promises.push(__updateProductMetadata(productId, moment));
	 });

	return Promise.settle(promises)
		.then(function(results){
			//we're not going to raise the red flag if we didn't get all the promises
			// to resolve, but we'll at least log an error
			results.forEach(function(result){
				if(result.isRejected()){
					sails.log.error('Promise failed in allSettled', result.reason());
				}
			});

			return Promise.resolve(moment.productIds);
		});
}

 /**
  * Deletes any notification associated with a moment
  *
  * @param moment whose notifications are to be removed
  * @returns {Promise} resolving when complete
  * @private
  */
function _deleteNotificationsForMomentDelete(moment){
	return Notification.destroy({
		'additionalData.momentId': moment.id
	});
}

/**
 * Performs a soft delete for a moment, and recycles all associated content (moves to deleted folder in S3)
 * @param id
 * @param user
 */
function _deleteMoment(id, user) {
	//look for a moment that hasn't already been deleted
	return Moment.find({
		id: id,
		deleted: [false, undefined]
	})
		.limit(1)
		.then(function (moments) {
			if (moments.length < 1) {
				throw new Error('No moment found for this id:  ' + id);
			}
			else if (moments[0].userId != user.id) {
				throw new Error(Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS.errorMessage);
			}
			else {
				// Move the moment's image to the /deleted folder in S3
				return moments[0].deleteAWSImage()
					.then(function () {
						//take care of the moment count stuff
						return _updateProductMetadataForMomentDelete(user.id, moments[0]);
					})
					.then(function () {
						// Nuke all of the notifications associated with this moment
						return _deleteNotificationsForMomentDelete(moments[0]);
					})
					.then(function () {
						//mark as soft deleted
						moments[0].deleted = true;

						//fire and forget analytics
						AnalyticsServices.reportMomentRemoved(moments[0], user, false);

						return moments[0].save();
					});
			}
		});
}

function _createMomentReferences(references, moment, author){
	function __checkReferences(){
		var filteredRefs = _.filter(references, function(reference){
			return (reference.hasOwnProperty('id')
			&& reference.hasOwnProperty('referenceType')
			&& reference.referenceType < MomentReference.momentReferenceTypes.REFERENCE_VALID) === true;
		});

		return Promise.each(filteredRefs, function(reference){
			//if this is a USER reference, make sure the user id is valid, and attach the username if so
			if(reference.referenceType == MomentReference.momentReferenceTypes.USER){
				return User.findOne({
					id: reference.id
				}).then(function(user){
					if(user){
						reference.username = user.username;
					}
				});
			}

			return Promise.resolve();
		}).then(function(){
			return filteredRefs;
		});
	}

	function __sendReferenceNotifications(referenceObjects){
		return Promise.map(_.filter(referenceObjects, function(reference){
			return reference.referenceType == MomentReference.momentReferenceTypes.USER;
		}), function(reference){
			return User.findOne({
				id: reference.id
			}).then(function(user){
				if(!user){
					//log error, this notification is fire/forget, so log an error,
					var error = new Error('Unknown user found when sending moment reference notification');
					sails.log.error(error);
					return Promise.resolve();
				}

				var notification = new MomentHeadlineUserReferenceNotification(author, user, moment.id, moment.headline);
				return notification.sendNotification();
			});
		});
	}

	function __updateHeadlineReferences(references){
		var headline = moment.headline;

		_.forEach(references, function(reference){
			if(reference.hasOwnProperty('username')){
				headline = headline.replace(
					new RegExp(util.format("@%s", reference.username), "g"),
					util.format("@{%s}", reference.id)
				);
			}
		});

		if(headline != moment.headline){
			moment.headline = headline;
			return moment.save();
		}
		else{
			return Promise.resolve();
		}
	}

	return __checkReferences().then(function(validReferences) {
		return Promise.map(validReferences, function (reference) {
			return MomentReference.create({
				sourceMoment: moment.id,
				type: reference.referenceType,
				targetUser: reference.id
			}).then(function () {
				return reference;
			}).catch(function (error) {
				sails.log.error(new Error('Failed to create moment reference', {error: error}));
				return undefined;
			});
		}).filter(function (newMomentReference) {
			return newMomentReference != undefined;
		}).then(function (newMomentReferences) {
			return __updateHeadlineReferences(newMomentReferences).then(function () {
				__sendReferenceNotifications(newMomentReferences);

				return newMomentReferences;
			});
		})
	});
}

/**
 *  Creates a new moment for the authorized user
 **/

 //Cropped Rect needs to be depricated as soon as the new iOS launch.

function _createMoment(mode, productIds, headline, imagePath, croppedRect, song, createdAt, references, user){
	return _createMomentModel(mode, productIds, headline, imagePath, croppedRect, song, createdAt, user.id)
	.then(function(moment){
		return _updateProductMetadataForCreateMoment(user.id, moment)
			.then(function(){
				return CommentServices.userReferenceAutotag(headline, references, _momentAutoTaggingMapper)
					.then(function(referencesWithAutoTagging){
						return _createMomentReferences(referencesWithAutoTagging, moment, user);
					});
			})
			.then(function(createdReferences){

				//fire and forget analytics
				AnalyticsServices.reportNewMoment(moment);

				return {
					moment: moment,
					references: createdReferences
				};
			});
	});
}

function _createMomentVideo(mode, productIds, headline, videoPath, croppedRect, song, createdAt, references, user){
	return _createMomentVideoModel(mode, productIds, headline, videoPath, croppedRect, song, createdAt, user.id)
	.then(function(moment){
		return _updateProductMetadataForCreateMoment(user.id, moment)
			.then(function(){
				return CommentServices.userReferenceAutotag(headline, references, _momentAutoTaggingMapper)
					.then(function(referencesWithAutoTagging){
						return _createMomentReferences(referencesWithAutoTagging, moment, user);
					});
			})
			.then(function(createdReferences){

				AnalyticsServices.reportNewMoment(moment);

				return {
					moment: moment,
					references: createdReferences
				};
			});
	});
}

function _findMoment(momentId, summaryOnly, user){

     return Moment.findOne({
		id: momentId,
		deleted: [false, undefined]
	})
		.then(function(moment) {
			if(!moment){
				throw new Error('No moment found with momentId:  ' + momentId);
			}

			return moment.toJSON(summaryOnly, user, user);
		});
}

function _findMomentForWebProfiles(momentId){

     return Moment.findOne({
		id: momentId,
		deleted: [false, undefined]
	})
		.then(function(moment) {
			if(!moment){
				throw new Error('No moment found with momentId:  ' + momentId);
			}

			return moment.toJSONForWeb();
		});
}

function _getTopTenFeed(momentIds){

	momentsArr = [];

	var array = momentIds.split(',');

	return Moment.find({
		id: array,
		deleted: [false, undefined]
	})
		.then(function(moments) {
			if(!moments){
				throw new Error('No moment found with momentId:  ' + momentId);
			}

			else {
				moments.forEach(function(moment) {
					momentsArr.push(moment.toJSONForFeed());
				})

				return momentsArr;
			}
		})
}

function _findMomentsForWeb(){

	var query = {
		createdAt: {'<': new Date()}
	};

	return Moment.find(query)
		.sort({createdAt: 'desc'})
		.limit(500)
	.then(function(moments){

		feedArr = [];

		if(moments.length < 0){
			return Promise.resolve([]);
		}
		else{
			moments.forEach(function(moment) {
				feedArr.push(moment.toJSONForFeed());
			});

			return feedArr;
		}
	})
}

function _saveMomentImageKey(key, moment){
	moment.image = key;

    return moment.save()
		.then(function(){
			return Promise.resolve(key);
		});
}

function _saveMomentVideoKey(key, moment){
	moment.video = key;

	return moment.save()
		.then(function(){
			return Promise.resolve(key);
		});
}

function _saveMomentVideoImageKey(key, moment){
	moment.image = key;

	return moment.save()
		.then(function(moment){
			return Promise.resolve(key);
		});
}

function _saveMomentImage(imageData, croppedRect, moment){
	var key = guid.v4();

	return S3Services.uploadMomentImage(key, croppedRect, moment, imageData)
	.then(function(resp){
		return _saveMomentImageKey(key, moment);
	})
	.then(function(thisKey){
		return Promise.resolve(thisKey);
	});
}

function _saveMomentVideo(imageData, croppedRect, moment) {
	var key = guid.v4();

	return S3Services.uploadMomentVideo(key, croppedRect, moment, imageData)
	.then(function(resp){
		return _saveMomentVideoKey(key, moment)
	})
	.then(function(thisKey){
		return Promise.resolve(thisKey);
	})
}

function _saveMomentVideoImage(imageData, moment){
	var key = guid.v4();

	return S3Services.uploadMomentVideoImage(key, moment.croppedRect, moment, imageData)
	.then(function(resp){
		return _saveMomentVideoImageKey(key, moment);
	})
	.then(function(thisKey){
		return Promise.resolve(thisKey);
	})
}

function _uploadMomentVideoImage(momentId, imageData){

	return new Promise(function(resolve, reject){

		return Moment.findOne({
			id: momentId
		})
		.then(function(moment) {
			return _saveMomentVideoImage(imageData, moment);
		})
	});
}

/**
 *  Creates a new moment model for the authorized user
 **/

function _createMomentModel(mode, productIds, headline, imageData, croppedRect, song, createdAt, userId){
	return new Promise(function(resolve, reject){

		//we need to store the product list as an array of ints, make sure the client didn't send us an array
		//or strings
		var products = _.map(productIds, function(productId){
			return parseInt(productId);
		});

		products = _.filter(products, function(productId){
			return !!productId;
		});

		Moment.create({
			userId: userId,
			productIds: products,
			song: song,
			createdAt:  createdAt,
			headline: headline,
            mode: mode,
            croppedRect: croppedRect
		})
			.then(function(newMoment) {
				_saveMomentImage(imageData, croppedRect,  newMoment)
					.then(function(){
						resolve(newMoment);
					})
					.catch(function(err){
						reject(err);
					});
			})
			.catch(function(err){
				reject(err);
			});
	});
}

function _createMomentVideoModel(mode, productIds, headline, videoData, croppedRect, song, createdAt, userId){
	return new Promise(function(resolve, reject){

		//we need to store the product list as an array of ints, make sure the client didn't send us an array
		//or strings
		var products = _.map(productIds, function(productId){
			return parseInt(productId);
		});

		products = _.filter(products, function(productId){
			return !!productId;
		});

		Moment.create({
			userId: userId,
			productIds: products,
			song: song,
			createdAt:  createdAt,
			headline: headline,
            mode: mode,
            croppedRect: croppedRect
		})
			.then(function(newMoment) {
				_saveMomentVideo(videoData, croppedRect, newMoment)
					.then(function(){
						resolve(newMoment);
					})
					.catch(function(err){
						reject(err);
					});
			})
			.catch(function(err){
				reject(err);
			});
	});
}

 /**
  * Given a collection of moment models, hydrate the product and
  *    image data appropriately.
  *
  * @param moments
  * @param relativeToUser
  * @param loggedInUser
  * @returns {Promise} promise resolving with fully hydrated moments referred to by 'moment'
  * @private
  * @note IMPORTANT:  Do not save the moment objects in this function, disregard
  *                   any changes that were made while hydrating the attributes.
  *                   We don't want to replace referenced model ids with the actual
  *                   object.
  */
function _hydrateMoments(moments, summaryOnly, relativeToUser, loggedInUser){

	//for each of the moment objects, hydrate the productIds attributes
	var promises = [];
	moments.forEach(function(moment){
		promises.push(moment.toJSON(summaryOnly, relativeToUser, loggedInUser));
	});

	return Promise.settle(promises)
	.then(function(results){
		var momentsToReturn = [];

		//we're not going to raise the red flag if we didn't get all the promises
		//to resolve, but we'll at least log an error
		results.forEach(function(result){
			if(result.isRejected()){
				sails.log.error('Failed to hydrate moments', result.reason());
			}
			else{
				momentsToReturn.push(result.value());
			}
		});

		return Promise.resolve(momentsToReturn);
	});
}

 /**
  * Finds moments made by the authenticated user by pageNumber
  *
  * @param since - fetch moments since this date
  * @param limit - number of moments to fetch
  * @param user - moment author
  * @returns {Promise} promise resolving with a collection of fully hydrated found moment objects as well as a
  *                    date cursor for additional requests (paging) and a total count
  * @private
  */
function _getUserMoments(user, since, limit, loggedInUser){

	var cursorDate = new Date(since);

	return Moment.find({
		userId: user.id,
		flaggedAsInappropriate: [false, undefined],
		deleted: [false, undefined],
		createdAt: {
			'<': new Date(since)
		}
	})
	.sort('createdAt DESC')
	.limit(limit)
	.then(function(moments){

		if(moments.length > 0){
			cursorDate = _.last(moments).createdAt;
		}

		return _hydrateMoments(moments, user, loggedInUser);
	})
	.then(function(moments){
		return Moment.count({
			userId: user.id,
			flaggedAsInappropriate: false,
			deleted: [false, undefined]
		})
		.then(function(count){
			return {
				results: moments,
				momentCount: count,
				cursor: cursorDate.getTime()
			};
		});
	});
}

var followingCount;
var nonFollowingIds = [];
var followingIds = [];
var nonFollowingSports = [];
var nonFollowingHometown = [];
var userIdSearchArray = [];







 /**
  * Finds N moments, sorts by Date date (newest to oldest).  This function facilitates the feed
  *    functionality.  Clients will pass in "now" to begin getting data from the feed, and working
  *    back as "older" moments are required.
  *
  * @param date
  * @param amount
  * @param user
  * @returns {Promise} promise resolving with a collection of fully hydrated found moment objects
  * @private
  */
function _findNMoments(date, amount, user){
	
	return new Promise(function(resolve, reject){
		Following.find({
			sourceUser: user.id
		})
		.then(function(following) {

			resolve(
				_.map(following, function (followingDoc) {
					return followingDoc.targetUser;
				})
			);
		})
		.catch(function(err) {
			reject(err);
		});
	})
	.then(function(authorIds){

		followingIds = authorIds;

		if (followingIds.length < 100) {

			var query = {
				createdAt: {'<': new Date(date)},
				deleted: [false, undefined],
				flaggedAsInappropriate: [false, undefined]
			};

			Moment.find(query)
				.limit(amount)
			.then(function(moments) {
				
				moments.forEach(function(moment) {
					nonFollowingIds.push(moment.userId);
				})

				return nonFollowingIds;

			})
			.then(function(ids) {
				User.find({
					id: ids,
					sport: user.sport
				})
				.then(function(sportsUsers) {
					sportsUsers.forEach(function(sportsUser) {
						userIdSearchArray.push(sportsUser.id);
					});

					if(userIdSearchArray.length + followingIds.length < 100) {
						User.find({
							id: ids,
							hometown: user.hometown
						})
						.then(function(hometownUsers) {
							hometownUsers.forEach(function(hometownUser) {
								userIdSearchArray.push(hometownUser.id);
							})

							if (userIdSearchArray.length + followingIds.length < 100) {
								User.find({
									id: ids
								}).then(function(anyUsers) {
									anyUsers.forEach(function(anyUser) {
										if (userIdSearchArray.length + followingIds.length < 100) {
											userIdSearchArray.push(anyUser.id);
										} else {
											return;
										}
									});
								})
							}
						})
					}
				})
			})
		};

		var query = {
			createdAt: {'<': new Date(date)},
			likesCount: {'>': 3},
			deleted: [false, undefined],
			flaggedAsInappropriate: [false, undefined]
		};

		return Moment.find(query)
			.sort({createdAt: 'desc'})
			.limit(amount);
		})
		.then(function(moments){
			if(moments.length < 0){
				return Promise.resolve([]);
			}
			else{
				return _hydrateMoments(moments, true,  user, user);
			}
		})
		.then(function(momentsHydrated){

			var query = {
				createdAt: {'<': new Date(date)},
				deleted: [false, undefined],
				flaggedAsInappropriate: [false, undefined],
				userId: userIdSearchArray.concat(followingIds)
			};

			return Moment.find(query)
			.sort({createdAt: 'desc'})
			.limit(amount)

			.then(function(moments){
				if(moments.length < 0){
					return Promise.resolve([]);
				}
				else{
					return _hydrateMoments(moments, true,  user, user);
				}
			})
			.then(function(momentsHydrated) {
				return momentsHydrated
			})
	})
}

function _findMostPopularMoments(user){

		var momentIds = ["574cfd601d1aaf71228ca00f", "574da9960750c05922bb8acd", "574db7d33b4bfb5022bbb62d", "574d8f429f053c6c22542ada", "574dd12d0750c05922bb8b40", "574da0600750c05922bb8ac0", "574db2c70750c05922bb8ae8", "574dd6b4a7795c5022e13bc9", "574dc8a21d1aaf71228ca12a", "574cf2f3a3768f5a22f0dcef"];

		return Moment.find({
			id: momentIds
		})
		.sort({
			likesCount: 'desc'
		})
		.then(function(moments){
		if(moments.length < 0){
			return Promise.resolve([]);
		}
		else{
			return _hydrateMoments(moments, true,  user, user);
		}
	})
	.then(function(momentsHydrated){

		return momentsHydrated;
		
	});
}

 /*
  * Updates a users moments, supported attributes for an update operation include:
  *   -flaggedAsInappropriate
  *
  * @param momentId
  * @param updatedAttributes
  * @param user
  * @returns {Promise} promise resolving with the moment's id on success
  * @private
  */
 function _updateMoment(momentId, updatedAttributes, user){
 	return Moment.find({
			id: momentId,
			deleted: [false, undefined]
		})
 		.limit(1)
 		.then(function(moment) {
			if (moment.length < 1) {
				throw new Error("Existing moment not found for update");
			}
			else {
				if (updatedAttributes.hasOwnProperty("flaggedAsInappropriate")) {
					moment[0].flaggedAsInappropriate = updatedAttributes.flaggedAsInappropriate;
					moment[0].flaggedAsInappropriateBy = user.id;
				}

				//fire and forget analytics
				AnalyticsServices.reportMomentRemoved(moment, user, true);

				return moment[0].save();
			}
		})
		.then(function(){
			return Promise.resolve(momentId);
		});
 }

 /**
  * Likes a particular moment
  *
  * @param momentId
  * @param user
  * @returns {Promise} promise resolving to empty on success
  * @private
  */
 function _likeMoment(momentId, user){
 	//1. Check for valid moment
 	//2. If user hasn't already liked moment, add it
 	return Moment.findOne({
			id: momentId,
			deleted: [false, undefined]
	})
	.then(function(moment){
		if(!moment){
			throw new Error('Moment not found with id:  ' + momentId);
		}
		else{
			return moment.consistencyCheck()
			.then(function(moment){

                return Like.findOne({
                    sourceUser: user.id,
                    targetType: Like.targetTypes.MOMENT,
                    targetMoment: moment.id
                });
			})
            .then(function(like){
                if(like){
                    return Promise.resolve();
                }
                else{
                    return Like.create({
                        sourceUser: user.id,
                        targetType: Like.targetTypes.MOMENT,
                        targetMoment: moment.id
                    })
					.then(function(){
						moment.likesCount = moment.likesCount + 1;
						return moment.save();
					})
                    .then(function(){
                        //send any notifications
                        var momentLikeNotif = new NotificationServices.MomentLikeNotification(user, moment);
                        return momentLikeNotif.sendNotification();
                    });
                }
            });
		}
	});
 }

 /**
  * Unlikes a particular moment
  *
  * @param momentId
  * @param user
  * @returns {Promise} resolving to empty on success
  * @private
  */
 function _unlikeMoment(momentId, user){
 	//1. Check for valid moment
 	//2. Remove any reference to this user
 	return Moment.findOne({
		id: momentId,
		deleted: [false, undefined]
	})
 	.then(function(moment){
        if(!moment){
            throw new Error('Moment not found with id:  ' + momentId);
        }

 		return Like.findOne({
            sourceUser: user.id,
            targetType: Like.targetTypes.MOMENT,
            targetMoment: moment.id
        })
		.then(function(like){
			if(!like){
				throw new Error('User does not like moment with id: ' + momentId);
			}
			else{
				return like.destroy();
			}
		})
		.then(function(){
			moment.likesCount = Math.max(0, moment.likesCount - 1);
			return moment.save();
		});
 	});
 }

 /**
  * Fetches likes (public user objects) for a particular moment
  *
  * @param momentId
  * @param since Fetch likes after this Date
  * @param limit # of likes to fetch since the date 'since'
  * @returns {Promise} resolving with a fully hydrated moment object and the total number of likes in that moment
  * @private
  */
 function _getLikes(momentId, since, limit, user){

     var cursorDate = new Date(since);

     return Moment.findOne({
		id: momentId,
		deleted: [false, undefined]
	})
 	.then(function(moment){
 		if(!moment){
 			throw new Error('Moment not found with id:  ' + momentId);
 		}
 		else{
            if(limit <= 0){
                return Promise.resolve([]);
            }
            else{
                return Like.find({
					targetType: Like.targetTypes.MOMENT,
					targetMoment: momentId,
					createdAt: {
						'<': new Date(since)
					}
                })
					.sort('createdAt DESC')
					.limit(limit)
					.populate('sourceUser');
            }
 		}
 	})
    .then(function(likes){

        if(likes.length > 0){
            cursorDate = _.last(likes).createdAt;
        }

        var promises = [];

        likes.forEach(function(like){
            promises.push(like.sourceUser.getPublicData(user));
        });

        return Promise.settle(promises);
    })
    .then(function(results){

        var likes = [];

        results.forEach(function(result){
            if(result.isFulfilled()){
                likes.push(result.value());
            }
        });

        return new Promise(function(resolve, reject){
            Like.count({
                targetType: Like.targetTypes.MOMENT,
                targetMoment: momentId
            }).exec(function(error, count){
                if(error){
                    reject(error);
                }
                else{
                    resolve(count);
                }
            });
        })
        .then(function(likesCount){
            return Promise.resolve({
                likesCount: likesCount,
                likes: likes,
                cursor: cursorDate.getTime()
            });
        });
    });
 }

 function _hydrateMomentsShallow(moments, loggedInUser){
	 var promises = [];

	 moments.forEach(function(moment){
		 promises.push(moment.toJSON(true, loggedInUser, loggedInUser))
	 });

	 return Promise.settle(promises)
		 .then(function(results){
			 var momentData = [];

			 results.forEach(function(result){
				 if(result.isFulfilled()){
					 momentData.push(result.value());
				 }
				 else{
					 sails.log.error(new Error('Failed to hydrate moment shallow:  '), {error: result.error()});
				 }
			 })

			 return momentData;
		 });
 }

 function _getUserMomentsShallow(user, since, limit, loggedInUser){
	 var cursorDate = new Date(since);

	 return Moment.find({
		 userId: user.id,
		 flaggedAsInappropriate: [false, undefined],
		 deleted: [false, undefined],
		 createdAt: {
			 '<': new Date(since)
		 }
	 })
		 .sort('createdAt DESC')
		 .limit(limit)
		 .then(function(moments){

			 if(moments.length > 0){
				 cursorDate = _.last(moments).createdAt;
			 }

			 return _hydrateMomentsShallow(moments, loggedInUser);
		 })
		 .then(function(moments){
			 return Moment.count({
				 userId: user.id,
				 flaggedAsInappropriate: false,
				 deleted: [false, undefined]
			 })
				 .then(function(count){
					 return {
						 results: moments,
						 momentCount: count,
						 cursor: cursorDate.getTime()
					 };
				 });
		 });
 }

 function _sendCommentNotifications(commentAuthor, momentAuthor, commentId, targetMomentId, references)
 {
	 function __sendCommentReferenceNotification(){
		 return User.find({
			 id: _.map(references, function(ref){
				 return ref.id
			 })
		 })
			 .then(function(users){
				 var promises = [];

				 users.forEach(function(user){
					 var commentRefNotif = new NotificationServices.MomentCommentUserReferenceNotification(commentAuthor, user, targetMomentId, commentId);
					 promises.push(commentRefNotif.sendNotification());
				 });

				 return Promise.settle(promises);
			 })
			 .then(function(results){
				 results.forEach(function(result){
					 if(result.isRejected()){
						 //silently log error
						 sails.log.error("Error sending comment user reference notification", {error: result.error()});
					 }
				 });
			 });
	 }

	 //Send a notification to the moment owner and to anyone mentioned in the comment
	 //Note that these are all fire and forget, don't block the promise chain...
	 var commentNotif = new NotificationServices.MomentCommentNotification(commentAuthor, momentAuthor, targetMomentId, commentId);

	 commentNotif.sendNotification()
		.then(function(){
			 return __sendCommentReferenceNotification();
	 	})
	 	.catch(function(err){
			 //log and continue
			 sails.log.error("Error sending comment notification", {error: err});
	 	});

	 //this function is fire and forget
	 return Promise.resolve();
 }

 function _momentAutoTaggingMapper(user){
	 return {
		 referenceType: MomentReference.momentReferenceTypes.USER,
		 id: user.id
	 };
 }

 /**
  * Performs the logic to delete moment comments
  * @private
  */
 function _deleteMomentComment(comment, requestingUser)
 {
	 // we can delete moment comments under two conditions:
	 //   1.  requestingUser is the comment author
	 //   2.  requestingUser is the moment author
	 return Moment.findOne({
		 id: comment.targetMoment
	 })
		 .then(function(targetMoment) {
			 if (targetMoment
				 && targetMoment.userId == requestingUser.id
				 ||comment.author == requestingUser.id)
			 {
				 // Decrement the Moment's Comment Count, be sure not to drop below 0
				 targetMoment.commentCount = Math.max(0, targetMoment.commentCount - 1);

				 return targetMoment.save()
					 .then(function(){
						 return Comment.destroy({id: comment.id});
					 })
					 .then(function(results){
						 //fire and forget analytics
						 AnalyticsServices.reportCommentRemoved(comment, requestingUser, false);

						 return true;
					 });
			 }
			 else{
				 //user is not authorized to delete this moment
				 throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS);
			 }
		 });
 }

 function _createMomentComment(momentId, commentText, references, author)
 {
	 return Moment.findOne({
		 id: momentId
	 })
		 .then(function(moment){
			 if(!moment){
				 throw new Error('Moment not found with id:  ' + momentId);
			 }

			 return CommentServices.createComment(commentText, Comment.commentTypes.MOMENT, moment.id, references, author)
				 .then(function(hydratedComment){

					 //update the moment comment count
                     if (!moment.commentCount) {
                         moment.commentCount = 0;
                     }

					 moment.commentCount = moment.commentCount + 1;
					 return moment.save()
						 .then(function(){
							 return User.findOne({
								 id: moment.userId
							 });
						 })
						 .then(function(momentAuthor){
							 if(momentAuthor){
								return _sendCommentNotifications(author, momentAuthor, hydratedComment.id,
									hydratedComment.targetMoment.hasOwnProperty('id')
										? hydratedComment.targetMoment.id
										: hydratedComment.targetMoment, hydratedComment.references);
							 }
							 else{
								 return Promise.resolve();
							 }
						 })
						 .then(function(){
							 return hydratedComment;
						 });
				 });
		 });
 }

 /**
  * Fetches comments for a moment that were created before 'since'
  *
  * @param momentId
  * @param since
  * @param limit
  * @param requestingUser
  * @returns {Promise} resolving with fully hydrated comments
  * @private
  */
 function _getMomentComments(momentId, since, limit, requestingUser){
	 return Moment.findOne({
		 id: momentId
	 })
		 .then(function(moment){
			 if(!moment){
				 throw new Error('Moment not found with id:  ' + momentId);
			 }

			 return CommentServices.fetchCommentsByDate(momentId, Comment.commentTypes.MOMENT, since, limit, requestingUser)
				 .then(function(comments){
					 return {
						 comments: comments.comments,
						 cursor: comments.cursor,
						 commentCount: moment.commentCount
					 };
				 });
		 });
 }

 /**
  * Module Interface
  */
 module.exports = {

	 /**
	  * Creates a moment in the system with the given attributes
	  * @param productIds
	  * @param headline
	  * @param imagePath
	  * @param song
	  * @param createdAt
	  * @param user
	  * @returns {Promise} resolving on completion
	  */
 	createMoment: _createMoment,


 	createMomentVideo: _createMomentVideo,

	 /**
	  * Finds a single moment given a momentId
	  *
	  * @param momentId
	  * @param user
	  * @returns {Promise} resolve with hydrated moment, or rejects if moment not found with given id
	  */
 	findMoment: _findMoment,

 	findMomentForWebProfiles: _findMomentForWebProfiles,

	 /**
	  * Gets a paginated set of moments for some arbitrary user by some authenticated user loggedInUser
	  * @param pageNumber
	  * @param user
	  * @param loggedInUser
	  * @returns {Promise} resolving with paged data
	  */
 	getUserMoments: function(user, since, limit, loggedInUser){
 		return _getUserMomentsShallow(user, since, limit, loggedInUser);
 	},

	 /**
	  * Soft deleted a moment with id momentId
	  * @param momentId
	  * @param user
	  * @returns {Promise}
	  */
 	destroyMoment: _deleteMoment,

	 /**
	  * Gets a paginated set of moments for a feed with type feedType
	  * @param date
	  * @param amount
	  * @param feedType
	  * @param user
	  * @returns {Promise}
	  */
 	getFeed: _findNMoments,




 	getMostPopularMomentsFeed: _findMostPopularMoments,

	 /**
	  * Updates a singular moment
	  * @param momentId
	  * @param updatedAttributes
	  * @param user
	  * @returns {Promise}
	  */
 	updateMoment: _updateMoment,

	 /**
	  * Likes a single moment by some user, user.  If the moment is already liked, the result is effectively a no-op
	  * @param momentId
	  * @param user
	  * @returns {Promise}
	  */
 	like: _likeMoment,

	 /**
	  * Unlikes a single moment by some user, user.  If the moment isn't currently liked, the result is effectively a no-op
	  * @param momentId
	  * @param user
	  * @returns {Promise}
	  */
 	unlike: _unlikeMoment,

	 /**
	  * Gets a paginated set of likes for a single moment with id momentId, by some authenticated user, user
	  * @param momentId
	  * @param page
	  * @param user
	  * @returns {Promise}
	  */
 	getLikes: _getLikes,

	 /**
	  * Adds a comment to an existing moment
	  * @param momentId
	  * @param commentText
	  * @param references
	  * @param author
	  * @returns {Promise} - resolving with comment Id on success, rejects on error
	  */
	createMomentComment: _createMomentComment,

	findMomentsForWeb: _findMomentsForWeb,

	 /**
	  * Fetches comments for a moment that were created before 'since'
	  * @param momentId
	  * @param since
	  * @param limit
	  * @param requestingUser
	  * @returns {Promise} resolving with fully hydrated comments
	  */
	getMomentComments: _getMomentComments,

	getTopTenFeed: _getTopTenFeed,

	 /**
	  *  Performs the logic to delete moment comments
	  *
	  * @param comment
	  * @param requestingUser
	  * @returns {Promise} resolving when the moment comment has been removed from persistence
	  */
	deleteMomentComment: _deleteMomentComment,

	uploadMomentVideoImage: _uploadMomentVideoImage
 };

 /**
  *   Test Hooks
  */
 module.testExports = {
	 _momentAutoTaggingMapper: _momentAutoTaggingMapper
 };

 for(var property in module.exports) {
	 module.testExports[property] = module.exports[property];
 }