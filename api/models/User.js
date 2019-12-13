/**
 *
 * User Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a persisted User object along with convience functions and passwork salting
 * hooks on create, save.
 *
 **/

var bcrypt = require('bcrypt');
var Promise = require('bluebird');

module.exports = {
	connection: ['mongo'],
	
	attributes: {
		firstName: 'string',
		lastName: 'string',
		birthDate: 'string',
		email: {
			type: 'email', //yay validation
			required: true,
			notEmpty: true
		},
		username: {
			type: 'string',
			required: true,
			notEmpty: true
		},
		sport: {
            type: 'string'
        },
        sports: {
        	type: 'array',
        	defaultsTo: []
        },
        gender: {
        	type: 'string',
        	defaultsTo: ''
        },
		hometown: {
			type: 'string',
            defaultsTo: ''
		},
		image: {
			type: 'string',
			defaultsTo: ''
		},
		locale: {
			type: 'string',
			defaultsTo: 'en'
		},
		description: {
			type: 'string',
			defaultsTo: ''
		},
        followersCount: {
            type: 'integer',
            defaultsTo: 0
        },
		facebookId: {
			type: 'string',
			defaultsTo: ''
		},
		twitterId: {
			type: 'string',
			defaultsTo: ''
		},
		featured: {
			type: 'boolean',
			defaultsTo: false
		},
		/*
		 *    Backwards compatibility checks
		 */
		consistencyCheck: function(){
			var thisUser = this;

			return new Promise(function(resolve, reject){
				//old documents may not have defined the following
				//attribute, lets make sure we do now
				if( !(thisUser.hasOwnProperty('locale')) ||       //pre-1.2
					!(thisUser.hasOwnProperty('description'))     //pre-1.3
				){

					if(!(thisUser.hasOwnProperty('locale'))){   //note that empty strings are falsey
						thisUser.locale = 'en';
					}

					if(!(thisUser.hasOwnProperty('description'))){
						thisUser.description = '';
					}

					thisUser.save()
						.then(function(){
							resolve(thisUser);
						})
						.catch(function(err){
							reject(err);
						});
				}
				else{
					resolve(thisUser);  //we're all good
				}
			});
		}, 

		/*
		 *    Serialize this model including all referenced models
		 */
		toJSON: function(relativeToThisUser){
			var data = {
                username: 	    this.username,
                firstName: 	    this.firstName,
                lastName: 	    this.lastName,
                email: 		    this.email,
                gender: 		this.gender,
                sport: 		    this.sport,
                sports: 		this.sports,
                hometown: 	    this.hometown,
				id:             this.id,
				description:    this.description,
                followersCount: this.followersCount
            };

            var thisUser = this;

			return thisUser.consistencyCheck()
				.then(function() {
                    return thisUser.getFollowingCount();
                })
                .then(function(count){
					data.followingCount = count;
                    return thisUser.getUserImageUrl(S3Services.ImageSizes.ORIGINAL);
				})
				.then(function(url){
					data.imageUrl = url;
                    return thisUser.getUserImageUrl(S3Services.ImageSizes.THUMBNAIL);
                })
                .then(function(url){
                    data.imageUrlThumb = url;
                    return thisUser.getUserImageUrl(S3Services.ImageSizes.TINY);
                })
                .then(function(url){
                    data.imageUrlTiny = url;
                    return thisUser.getNotificationCount();
				})
				.then(function(count) {
					data.notificationCount = count;
					return thisUser.getMomentCount();
				})
				.then(function(momentCount){
					data.momentCount = momentCount;
					return thisUser.getLockerProductCount();
				})
				.then(function(lockerSize) {
                    data.lockerProductCount = lockerSize;

                    if (relativeToThisUser) {
                        return Following.find({
                            sourceUser: relativeToThisUser.id,
                            targetUser: thisUser.id,
                            targetType: Following.followingTypes.USER
                        });
                    }

                    return Promise.resolve(undefined);
                })
                .then(function(following){

                    if(relativeToThisUser) {
                        data.userFollows = (following.length > 0);
                    }

                    return Promise.resolve(data);
				});
		},

		/**
		 * Gets the number of products in this user's locker
		 * @returns {Promise} resolving the product count
		 */
		getLockerProductCount: function(){
			return LockerItem.count({
				sourceUser: this.id,
				entryType: LockerItem.lockerEntryTypes.PRODUCT
			});
		},

		/**
		 * Gets the number of un-acknowledged notifications for this user
		 * @returns promise for the total count, errors bubble
		 */
		getNotificationCount: function(){
			return Notification.find({
					targetId: this.id,
					acknowledged: false
			})
			.then(function(notifs){
				var count = 0;

				if(notifs){
					count = notifs.length;
				}

				return Promise.resolve(count);
			});
		},

		/**
		 * Gets the number of moments which this user has authored
		 * @returns {Promise} resolving to the number of moments authored by this user
		 */
		getMomentCount: function(){
			return Moment.count({
				userId: this.id,
				flaggedAsInappropriate: false,
                deleted: [false, undefined]
			});
		},

		/*
		 *    Gets a publicly accessible image URL for a given user model via a promise.
		 */
		getUserImageUrl: function(ImageSize){
			//if we don't have any id for our image, don't bother trying to get a URL, this
			//user hasn't uploaded any picture, just return empty string
			if(!(this.image) || this.image == ''){
				return Promise.resolve('');
			}
			else{
				//continue down this promise chain

				return S3Services.getProfileImageSignedUrl(this.image, ImageSize);
			}
		},

        getMostRecentMoments: function() {

            // Fetch the moments for this user, sorted by date, limited to 3
            return MomentServices.getUserMoments(this, Date.now(), 3, this)
				.then(function(results){
					return results.results;
				});
        },

		/*
		 *    Returns public data associated with a user object.  This currently includes
		 *    the following attributes:
		 *       - username
		 *       - firstName
		 *       - lastName
		 *       - hometown
		 *       - followersCount
		 *       - followingCount
		 *       - imageUrl
		 *       - id
		 *       - mostRecentMoments
		 */
		getPublicData: function(relativeToThisUser){
            return this.toJSON(relativeToThisUser)
				.then(function(data){
					//remove non-public attributes
					delete data.notificationCount;

					return Promise.resolve(data);
				});
		},

		getPublicDataForWeb: function(user){
			var data = {
                username: 	    this.username,
                firstName: 	    this.firstName,
                lastName: 	    this.lastName,
                email: 		    this.email,
                gender: 		this.gender,
                sport: 		    this.sport,
                sports: 		this.sports,
                hometown: 	    this.hometown,
				id:             this.id,
				imageUrl:       'https://d1m9cftgf9ypai.cloudfront.net/profileImages/' + this.image,
				description:    this.description,
                followersCount: this.followersCount
            };

            return data;
		},

        getPublicDataWithMostRecentMoments: function(relativeToThisUser) {

            var self = this;

			return this.getSummary(relativeToThisUser)
                .then(function(data){
                    return self.getMostRecentMoments()
                           .then(function(moments){
                                data.mostRecentMoments = moments;

								if(relativeToThisUser){
									return Following.find({
										sourceUser: relativeToThisUser.id,
										targetUser: self.id,
										targetType: Following.followingTypes.USER
									})
										.then(function(following){
											data.userFollows = (following.length > 0);

											return data;
										});
								}
								else{
									return data;
								}
                            });
                });

        },

		/*
		 *    Returns public data associated with a user object.  This currently includes
		 *    the following attributes:
		 *       - username
		 *       - description
		 *       - firstName
		 *       - lastName
		 *       - imageUrl
		 *       - momentCount
		 *       - followingCount
		 *       - followersCount
		 *       - lockerProductsCount
		 */
		getSummary: function(relativeToThisUser){
			var toReturn = {
				username:    this.username,
				description: this.description,
				firstName:   this.firstName,
				lastName:    this.lastName,
				id:          this.id,
				email:       this.email,
				sport:       this.sport,
				sports: 	 this.sports,
				hometown:    this.hometown,
				followersCount: this.followersCount
			};

            var self = this;

			return this.getUserImageUrl()
			.then(function(url){
				toReturn.imageUrl = url;

                return self.getUserImageUrl(S3Services.ImageSizes.THUMBNAIL);
            })
            .then(function(url){
                toReturn.imageUrlThumb = url;

                return self.getUserImageUrl(S3Services.ImageSizes.TINY);
            })
            .then(function(url){
                toReturn.imageUrlTiny = url;

                return self.getMomentCount();
			})
			.then(function(count){

				toReturn.momentCount = count;
				return self.getLockerProductCount();
			})
			.then(function(count){
				toReturn.lockerProductCount = count;
				return self.getFollowingCount();
			})
			.then(function(count){
				toReturn.followingCount = count;

				if(relativeToThisUser){
					return Following.count({
						sourceUser: relativeToThisUser.id,
						targetUser: self.id,
						targetType: Following.followingTypes.USER
					})
					.then(function(following){

						toReturn.userFollows = (following > 0);
						return toReturn;
					});
				}
				else{
					return toReturn;
				}
			});
		},

        getFollowingCount: function() {
            var thisUser = this;

            return new Promise(function(resolve, reject){
                Following.count({
                    sourceUser: thisUser.id,
                    targetType: Following.followingTypes.USER
                })
                .exec(function(err, count){
                    if(err){
                        return reject(err);
                    }

                    return resolve(count);
                });
            });
        },

		deleteAWSImage: function(){
			//remove any s3 data
			return new Promise(function(resolve){
				S3Services.deleteUserImage(this.image)
					.then(function(resp){
						resolve("deleted");
					})
					.catch(function(err){
						//we are leaking this image in S3, but that's no reason to kill the app,
						//space is cheap right?
						resolve("deleted");
					});
			});
		}
	},

	beforeDestroy: function(criteria, next){
		//this shouldn't happened, but who knows
		if(!(criteria.hasOwnProperty('where'))
			|| !(criteria.where) 
			|| !(criteria.where.hasOwnProperty('id'))
			|| !(criteria.where.id))
		{
			next();
			return;
		}

		//get the AWS key for the moment image, and delete it, since we're about to
		//delete this moment document
		User.findOne({
			id: criteria.where.id
		}).then(function(user){
			if(user){
				return user.deleteAWSImage().then(function() {
					return Following.find({
						sourceUser: user.id,
						targetType: Following.followingTypes.USER
					}).populate('targetUser');
				}).then(function(following) {
					return Promise.each(following, function(followingEdge){
						followingEdge.targetUser.followersCount = Math.max(0, followingEdge.targetUser.followersCount - 1);
						return followingEdge.targetUser.save().then(function(){
							return followingEdge.destroy();
						}, function(err){
							sails.log.error('Failed to update followersCount when deleting user:  ' + user.id);
						}).catch(function(err){
							sails.log.error('Failed to destroy following edge for user:  ' + user.id);
						});
					});
				}).then(function(){
					return Following.find({
						targetId: user.id,
						targetType: Following.followingTypes.USER
					});
				}).then(function(following) {
					return Promise.each(following, function(followingEdge){
						return followingEdge.destroy().catch(function(err){
							sails.log.error('Failed to destroy following edge for user where some other user followed user:  ' + user.id)
						})
					});
				}).then(function(){
					return Moment.find({
						userId: user.id,
						deleted: [undefined, false]
					});
				}).then(function(moments){
					return Promise.each(moments, function(moment){
						return MomentServices.destroyMoment(moment.id, user).catch(function(err){
							sails.log.error('Failed to soft delete moment for user which is being destroyed', {error: err});
						});
					});
				}).then(function() {
					next();
				});
			}
			else{
				throw new Error('No user found');
			}
		}).catch(function(err) {
			//log and internal error and keep going
			sails.log.error(err);
			next();
		});
	}
};