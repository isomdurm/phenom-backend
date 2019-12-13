/**
 *
 * Moment Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Moment
 *
 **/

/*
 	globals Like, UserServices, MomentServices, Comment, CommentServices, MomentReference, LockerServices,
 			User, S3Services, ProductServices
*/

var Promise = require('bluebird');
var MomentDate = require('moment');
var _ = require('underscore');
var util = require('util');

/**
 * Moment mode types, defaults to 'TRAINING'
 *
 * @type {{TRAINING: number, GAMING: number, STYLING: number}}
 * @private
 */
var _momentModes = {
    TRAINING: 0,
    GAMING:   1,
    STYLING:  2
};

/**
 * Removes any moment references associated with a moment
 *
 * @param moment
 * @returns {Promise} resolving when complete
 * @private
 */
function _deleteReferenceForMomentDelete(moment){
	return MomentReference.find({
		sourceMoment: moment.id
	})
		.then(function(references){
			return Promise.settle(_.map(references, function(reference){
				return MomentReference.destroy({
					id: reference.id
				});
			}));
		})
		.then(function(results){
			results.forEach(function(result){
				if(result.isRejected()) {
					sails.log.error("Failed to remove moment reference while destroying Moment", {error: result.error()});
				}
			});
		});
}

/**
 * Removes any comments associated with a moment
 *
 * @param moment
 * @returns {Promise} resolving whem complete
 * @private
 */
function _deleteCommentsForMomentDelete(moment){
	return Comment.find({
		type: Comment.commentTypes.MOMENT,
		targetMoment:moment.id
	})
		.then(function(comments){
			var promises = [];

			comments.forEach(function(comment){
				promises.push(Comment.destroy({
					id: comment.id
				}));
			});

			return Promise.settle(promises)
		})
		.then(function(results){
			results.forEach(function(result){
				if(result.isRejected()){
					sails.log.error("Failed to remove Comment while destroying Moment", {error: result.error()});
				}
				else{
					//this is for completeness, even though the moment will most likely be nuked, let's make sure
					//things are kept consistent
					moment.commentCount = Math.max(0, moment.commentCount - 1);
				}
			});
		});
}

/**
 *   Replaces the moment productIds attribute with an array of fully constructed
 *   product objects
 **/
function _hydrateProducts(moment, summaryOnly, relativeToUser, loggedInUser){

    //If we're only interested in the moment summary, we only need the product count, not all the guts too
    if(summaryOnly){

        moment.products = moment.productIds;
        delete moment.productIds;

        return Promise.resolve(moment);
    }

    return ProductServices.getProducts(moment.productIds, relativeToUser, loggedInUser)
		.then(function(products){
			if(products)
			{
				if(moment.hasOwnProperty('productIds')){
					delete moment.productIds;
				}

				if(moment.hasOwnProperty('updatedAt')){
					delete moment.updatedAt;
				}

				moment.products = products;
			}

			return Promise.resolve(moment);
		});
}

function _hydrateUser(userId, summaryOnly, loggedInUser){
	return User.findOne({
		id: userId
	})
		.then(function(user){
			if(!user){
				throw new Error("no user found while trying to attach user to moment");
			}
			else{
                if(summaryOnly){
                    return user.getSummary(loggedInUser);
                }

				return user.getPublicData(loggedInUser);
			}
		});
}

function _getSignedImageUrl(imageId, imageSize){
	return S3Services.getMomentImageSignedUrl(imageId, imageSize);
}

function _getSignedVideoUrl(videoId, videoSize){
	return S3Services.getMomentVideoSignedUrl(videoId, videoSize);
}

function _getSignedVideoImageUrl(imageId, videoSize){
	return S3Services.getMomentVideoImageSignedUrl(imageId, videoSize);
}


function __hydrateReferences(moment, requestingUser) {
	moment.references = [];

	return Promise.filter(MomentReference.find({
		sourceMoment: moment.id
	}), function(reference){
		return reference.type == MomentReference.momentReferenceTypes.USER;
	}).map(function(reference){
		return reference.targetUser;
	}).then(function(references){
		return User.find({
			id: references
		});
	}).then(function(referencedUsers){
		return Promise.map(referencedUsers, function(referencedUser){
			return referencedUser.getSummary(requestingUser)
				.catch(function(err){
					sails.error.log("Failed to hydrate moment reference:  ", {error: err});
					return undefined;
				});
		}).filter(function(referencedUser){
			return referencedUser != undefined;
		}).each(function(referencedUser){
			moment.references.push(referencedUser);
			moment.headline = moment.headline.replace(
				new RegExp(util.format("@{%s}", referencedUser.id), "g"),
				util.format("@%s", referencedUser.username));
		});
	});
};

function _hydrateMoment(moment, summaryOnly, relativeToUser, loggedInUser){

    return _hydrateProducts(moment, summaryOnly, relativeToUser, loggedInUser)
		.then(function(){
			return __hydrateReferences(moment, loggedInUser);
		})
		.then(function(){
			
			if (moment.video == "" || moment.video == undefined) {

				return _getSignedImageUrl(moment.image, S3Services.ImageSizes.ORIGINAL);

			} else {

				return _getSignedVideoUrl(moment.video, S3Services.ImageSizes.ORIGINAL);

			}

		})
		.then(function(url){

			if (moment.video == "" || moment.video == undefined) {

				moment.imageUrl = url;

				if(moment.croppedRect && moment.croppedRect.bottom - moment.croppedRect.top > 0 && moment.croppedRect.right - moment.croppedRect.left > 0){
				
					return _getSignedImageUrl(moment.image, S3Services.ImageSizes.CROPPED);
				}
				else{
				//lets skip this one, see the next thenable
					return Promise.resolve(undefined);
				}

			} else {

				moment.videoUrl = url + '.mp4';

				_getSignedVideoImageUrl(moment.image, S3Services.ImageSizes.ORIGINAL)
				.then(function(testone){
					moment.imageUrl = testone;
				})

				return url;

			};

		})
		.then(function(url) {
			if (moment.video == "" || moment.video == undefined) {

				moment.imageUrlCropped = url;
				return _getSignedImageUrl(moment.image, S3Services.ImageSizes.THUMBNAIL);
			} else {

				_getSignedVideoImageUrl(moment.image, S3Services.ImageSizes.CROPPED)
				.then(function(testtwo){
					moment.imageUrlCropped = testtwo;
				})

				return url;
			}
		})
		.then(function(url){

			if (moment.video == "" || moment.video == undefined) {
				moment.imageUrlThumb = url;

				return  S3Services.getMomentImageSignedUrl(moment.image, S3Services.ImageSizes.TINY);

			} else {

				_getSignedVideoImageUrl(moment.image, S3Services.ImageSizes.THUMBNAIL)
				.then(function(testthree){
					moment.imageUrlThumb = testthree;
				})

				return url;
			};

		})
		.then(function(url){

			if (moment.video == "" || moment.video == undefined) {
				moment.imageUrlTiny = url;

				return _hydrateUser(moment.userId, summaryOnly, loggedInUser);

			} else {

				_getSignedVideoImageUrl(moment.image, S3Services.ImageSizes.TINY)
				.then(function(testfour){
					moment.imageUrlTiny = testfour;
				})
				
				return _hydrateUser(moment.userId, summaryOnly, loggedInUser);

			}
		})
		.then(function(userPublic) {

			delete moment.userId;
			moment.user = userPublic;

			return Like.find({
				targetType: Like.targetTypes.MOMENT,
				targetMoment: moment.id,
				createdAt: {
					'<=': new Date()
				}
			}).sort({createdAt: 'desc'}).limit(5).populate('sourceUser')
		})
		.then(function(topLikes){

			var promises = [];
			topLikes.forEach(function (topLike) {
				promises.push(topLike.sourceUser.getSummary());
			});

			return Promise.settle(promises);
		})
		.then(function(results) {

			moment.topLikes = [];

			//we're not going to raise the red flag if we didn't get all the promises
			//to resolve, but we'll at least log an error
			results.forEach(function (result) {
				if (result.isRejected()) {
					sails.log.error('Promise failed in allSettled', result.reason());
				}
				else {
					moment.topLikes.push(result.value());
				}
			});

			return Like.findOne({
				targetType: Like.targetTypes.MOMENT,
				targetMoment: moment.id,
				sourceUser: loggedInUser.id
			})
				.then(function (like) {

					moment.userLikes = like != undefined;
					return Promise.resolve(moment);
				});
		})
		.then(function(){
			return MomentServices.getMomentComments(moment.id, MomentDate().valueOf(), 2, relativeToUser);
		})
		.then(function(results){
			moment.recentComments = [];

			if(results && results.comments.hasOwnProperty('length') && results.comments.length > 0){
				moment.recentComments = results.comments;
			}
			else{
				moment.recentComments = [];
			}

			return MomentReference.find({
				sourceMoment: moment.id
			});
		})
		.then(function(references){
			return Promise.settle(_.map(references, function(reference){
				return reference.toJSON(loggedInUser);
			}));
		})
		.then(function(results){
			moment.references = _.map(_.filter(results, function(result){
				if(result.isRejected()){
					sails.log.error(new Error('Error hydrating moment references'), {error: result.error()});
					return false;
				}

				return true;
			}), function(result){
				return result.value();
			});

			return moment;
		});
}

module.exports = {
	connection: ['mongo'],
	
 	attributes: {
		userId: {
			type: 'string',
			required: true
		},

		referencedUserIds:{
			type: 'array' //of User objects (future release)
		},

		productIds:{
			type: 'array',
			defaultsTo: [] //of Product objects
		},

		headline: {
			type: 'string',
			required: true
		},

		song: {
			type: 'json'  //trackId, previewUrl, artworkUrl
		},

		image: {
			type: 'string',
			defaultsTo: '',
		},

		video: {
			type: 'string',
			defaultsTo: ''
		},

		createdAt: {
			type:  'date'
		},

		flaggedAsInappropriate: {
			type: 'boolean'
		},

		flaggedAsInappropriateCompare: {
			type: 'boolean'
		},

		flaggedAsInappropriateBy: {
			type: 'string'
        },

		deleted: {
			type: 'boolean',
			defaultsTo: false
		},

        mode: {
            type: 'integer',
            defaultsTo: _momentModes.TRAINING
        },

        croppedRect: {
            type: 'json',
            defaultsTo: {
                top:    0,
                bottom: 0,
                right:  0,
                left:   0
            }
        },

		likesCount: {
			type: 'integer',
			defaultsTo: 0
		},

		commentCount: {
			type: 'integer',
			defaultsTo: 0
		},

		featured: {
			type: 'boolean',
			defaultsTo: false
		},

		/*
		 *    Backwards compatibility checks
		 */
		consistencyCheck: function(){
			//capture model ref for later use
			var thisMoment = this;

			return new Promise(function(resolve, reject) {
				//old documents may not have defined the following
				//attribute, lets make sure we do now
				if (!(thisMoment.hasOwnProperty('deleted'))        //pre 1.3
                    || !(thisMoment.hasOwnProperty('mode'))        //pre 2.0
                    || !(thisMoment.hasOwnProperty('croppedRect')) //pre 2.0
                ) {
					if(!(thisMoment.hasOwnProperty('deleted'))){
						thisMoment.deleted = false;
					}

                    if(!(thisMoment.hasOwnProperty('mode'))){
                        thisMoment.mode = _momentModes.TRAINING;
                    }

                    if(!thisMoment.hasOwnProperty('croppedRect')){
                        thisMoment.croppedRect = {
                            bottom: 0,
                            top:    0,
                            right:  0,
                            left:   0
                        };
                    }

					return thisMoment.save()
						.then(function () {
							resolve(thisMoment);
						})
						.catch(function (err) {
							reject(err);
						});
				}
				else {
					//we're all good
					resolve(thisMoment);
				}
			});
		},

		deleteAWSImage: function() {
			var self = this;
			return new Promise(function (resolve) {
				//remove any s3 data
				S3Services.deleteMomentImage(self.image)
					.then(function (resp) {
						resolve("deleted");
					})
					.catch(function (err) {
						//we don't care
						resolve("deleted");
					});
			});
		},

		toJSON: function(summaryOnly, relativeToUser, loggedInUser){
			var moment = {
				id: this.id,
				userId: this.userId,
				productIds: this.productIds,
				headline: this.headline,
				song: this.song,
				createdAt: this.createdAt,
				mode: this.mode,
				croppedRect: this.croppedRect,
                image: this.image,
                video: this.video,
				likesCount: this.likesCount,
                commentCount: this.commentCount ? this.commentCount : 0
			};

			return _hydrateMoment(moment, summaryOnly, relativeToUser, loggedInUser);
		},

		toJSONForWeb: function(){
			var moment = {
				id: this.id,
				userId: this.userId,
				productIds: this.productIds,
				headline: this.headline,
				song: this.song,
				createdAt: this.createdAt,
				mode: this.mode,
				croppedRect: this.croppedRect,
                image: 'https://d1m9cftgf9ypai.cloudfront.net/momentImages/' + this.image + '_cropped',
                video: 'https://d1m9cftgf9ypai.cloudfront.net/momentVideos/' + this.video,
				likesCount: this.likesCount,
                commentCount: this.commentCount ? this.commentCount : 0
			}

			return moment;
		},

		toJSONForFeed: function(){
			var moment = {
				id: this.id,
				image: 'https://d1m9cftgf9ypai.cloudfront.net/momentImages/' + this.image + '_cropped',
                video: 'https://d1m9cftgf9ypai.cloudfront.net/momentVideos/' + this.video,
                likesCount: this.likesCount,
                productIds: this.productIds,
                userId: this.userId,
                createdAt: this.createdAt
			}

			return moment;
		},

		getSignedImageUrl: function(imageSize){
			return _getSignedImageUrl(this.image, imageSize);
		},

		getSignedVideoUrl: function(imageSize){
			return _getSignedVideoUrl(this.video, imageSize);
		}
	},

    //Export Moment Modes
    momentModeTypes: _momentModes,

	beforeCreate: function(moment, next){
		moment.flaggedAsInappropriate = false;
		moment.flaggedAsInappropriateCompare = false;
		moment.flaggedAsInappropriateBy = "";
		next();
	},

	beforeUpdate: function(moment, next){
		if(moment.flaggedAsInappropriate != moment.flaggedAsInappropriateCompare
			&& moment.flaggedAsInappropriate === true
			&& moment.flaggedAsInappropriateBy != "")   //this has been marked as inappropriate
		{
			var thisUser = undefined;

			var getMessage = function(signedUrl, user){
				return Config.Moment.inappropriateEmailMessage(
					signedUrl,
					moment.song,
					moment.id,
					user
				);
			};

			var getMailRecipient = function(){
				return Config.Moment.inappropriateEmailRecipient;
			}

			User.findOne({id: moment.flaggedAsInappropriateBy})
			.then(function(user){
				if(!user){
					throw new Error('No user found:  ' + moment.flaggedAsInappropriateBy);
				}
				else{
					thisUser = user;

					if (typeof moment.croppedRect !== 'undefined') {
						return _getSignedImageUrl(moment.image, S3Services.ImageSizes.ORIGINAL);
					} else {
						return _getSignedVideoUrl(moment.video, S3Services.ImageSizes.ORIGINAL);
					}
				}
			})
			.then(function(signedUrl){
				return EmailServices.sendPlainMail(getMailRecipient(), "Inappropriate Moment Reported", getMessage(signedUrl, thisUser));
			})
			.then(function(unused){
				moment.flaggedAsInappropriateCompare = moment.flaggedAsInappropriate;  //remember the new value
				next();
			})
			.catch(function(err){
				sails.log.error('Failed to send email regarding flagged inappropriate moment ' + moment.flaggedAsInappropriate, {error:  err});
				moment.flaggedAsInappropriateCompare = moment.flaggedAsInappropriate;  //remember the new value
				next();
				//just keep going
			});
		}
		else{
			next();
		}
	},

	beforeDestroy: function(criteria, next){
		//this shouldn't happened, but who knows
		if(!(criteria.hasOwnProperty('where'))){
			next();
			return;
		}

		//get the AWS key for the moment image, and delete it, since we're about to 
		//delete this moment document
		Moment.findOne(criteria)
		.then(function(moment){
			if(moment){
				return moment.deleteAWSImage()
					.then(function(){
						return Notification.find({
								'additionalData.momentId': moment.id
							});
					})
					.then(function(notifs){
						var promises = [];

						notifs.forEach(function(notif){
							promises.push(notif.destroy());
						});

						return Promise.settle(promises);
					})
					.then(function(results) {
                        results.forEach(function (result) {
                            if (result.isRejected()) {
                                //log an internal error but keep going
                                sails.log.error("Failed to cleanup referenced notifications when deleting moment:  " + result.reason());
                            }
                        });

                        return Like.find({
                            targetType: Like.targetTypes.MOMENT,
                            targetMoment: moment.id
                        });
                    })
                    .then(function(likes){
                        var promises = [];

                        likes.forEach(function(like){
                            promises.push(like.destroy());
                        });

                        return Promise.settle(promises);
                    })
					.then(function(){
						return _deleteCommentsForMomentDelete(moment);
					})
					.then(function(){
						return _deleteReferenceForMomentDelete(moment);
					})
					.then(function(){
						//create a new DeletedMoment from this moment model (archive)
						return DeletedMoment.create({
							userId: moment.userId,
							referencedUserIds: moment.referencedUserIds,
							productIds: moment.productIds,
							headline: moment.headline,
							song: moment.song,
							image: moment.image,
							createdAt: moment.createdAt,
							flaggedAsInappropriate: moment.flaggedAsInappropriate,
							flaggedAsInappropriateBy: moment.flaggedAsInappropriateBy
						});
					})
					.then(function(){
						//at this point we've cleaned everything up so lets go ahead
						//and destroy the actual moment
						next();
					})
					.catch(function(err){
						sails.log.error(err);
						next();
					});
			}
			else{
				throw new Error('No moment found when trying to delete moment with id:  ' + criteria.where.id);
			}
		})
		.catch(function(err){
			sails.log.error(err);
			//keep going if there isn't a moment for this id, should never happen
			next();
		});
	}
};