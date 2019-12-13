 /**
 *
 * Phenom Backend User Controller Tests
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Generates a bundle which can be passed to each controller/service test which
 * provides access to configuration, the models, and http services which can
 * be configured automatically with oauth 
 *
 **/

var chai = require('chai');
var chaiPromiseSupport = require('chai-as-promised');
var Promise = require('bluebird');
var errors = require('../api/services/Errors.js');
var UserServices = require('../api/services/UserServices.js');
var S3Services = require('../api/services/S3Services.js');

chai.use(chaiPromiseSupport);

module.exports = function(resources){
	return function(){
		before(function(next){
			resources.ensureTestClient() //really only need client creds to test user stuff
			.then(function(something){
				next();
			})
			.catch(function(err){
				next(err);
			});
		});

		after(function(next){
			resources.deleteAllUsers()
			.then(function(){
				next();
			})
			.catch(function(err){
				next(err);
			});
		});

		describe('API Create', function(){
			it('Try without client creds', function(done){
				resources.POST('/user', {
					client_id: 'bogus',
					client_secret: 'bogus'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_CLIENT_NOT_AUTHORIZED.errorCode);
					done();
				});
			});
	
			it('Try with client creds, but missing parameters', function(done){
				resources.POST('/user', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64')
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
				
					//we should have the following missing parameters, according the API spec
					chai.expect(resJSON).to.have.property('params');
					done();
				});

			});
			
			it('Try with client creds, and all parameters', function(done){
				resources.POST('/user', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					firstName: resources.testUser.firstName,
					lastName: resources.testUser.lastName,
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					email: resources.testUser.email,
					suppressEmail: true  //false if we want tests to send the email
					//note that we dont test user images here, that's a multipart form craziness, the find
					//tests will test the code path which expects image to be return as empty property imageUrl
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
					done();
				});
			});

			it('Try with client creds, and all parameters but user already existing (username)', function(done){
				resources.POST('/user', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					firstName: resources.testUser.firstName,
					lastName: resources.testUser.lastName,
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					email: 'dummyAddress@gmail.com'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_DUPLICATE_USERNAME.errorCode);
					done();
				});
			});

			it('Try with client creds, and all parameters but user already existing (email)', function(done){
				resources.POST('/user', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					firstName: resources.testUser.firstName,
					lastName: resources.testUser.lastName,
					username: 'dummyUserName',
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					email: resources.testUser.email
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_DUPLICATE_EMAIL.errorCode);
					done();
				});
			});
		});

		describe('API Find', function(){
			it('Try to perform an unauthorized find action', function(done){
				resources.GET('/user', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it('Should be able to get an auth token and store it for later tests', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('access_token');
					chai.expect(resJSON).to.have.property('refresh_token');
					chai.expect(resJSON).to.have.property('expires_in');
					resources.setBearerToken(resJSON.access_token, resJSON.refresh_token);
					done();
				});
			});

			it('Try to perform an authorized find action', function(done){
				resources.GET('/user', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
					chai.expect(resJSON).to.have.property('errorMessage');
					chai.expect(resJSON.errorMessage).to.equal('');
					chai.expect(resJSON).to.have.property('pipeToUser');
					chai.expect(resJSON.pipeToUser).to.equal(false);
					chai.expect(resJSON).to.have.property('email');
					chai.expect(resJSON.email).to.equal(resources.testUser.email)
					chai.expect(resJSON).to.have.property('firstName');
					chai.expect(resJSON).to.have.property('email');
					chai.expect(resJSON).to.have.property('sport');
					chai.expect(resJSON).to.have.property('hometown');
					chai.expect(resJSON).to.not.have.property('password');
					chai.expect(resJSON).to.have.property('username');
					chai.expect(resJSON).to.have.property('imageUrl');
					chai.expect(resJSON.imageUrl).to.be.empty;
					done();
				});
			});
		});

 		describe('API Update', function(){
			it('Try to perform an unauthorized update action', function(done){
				resources.setBearerToken('', '');
				resources.PUT('/user', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it('Should be able to get an auth token and store it for later tests', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('access_token');
					chai.expect(resJSON).to.have.property('refresh_token');
					chai.expect(resJSON).to.have.property('expires_in');
					resources.setBearerToken(resJSON.access_token, resJSON.refresh_token);
					done();
				});
			});

			it('Try to perform an authorized update action', function(done){
				resources.PUT('/user', {
					hometown: 'Cleveland'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
					chai.expect(resJSON).to.have.property('errorMessage');
					chai.expect(resJSON.errorMessage).to.equal('');
					chai.expect(resJSON).to.have.property('pipeToUser');
					chai.expect(resJSON.pipeToUser).to.equal(false);

					//no perform the GET to verify our Update action
					resources.GET('/user', {}, function(err, res){
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
						chai.expect(resJSON).to.have.property('errorMessage');
						chai.expect(resJSON.errorMessage).to.equal('');
						chai.expect(resJSON).to.have.property('pipeToUser');
						chai.expect(resJSON.pipeToUser).to.equal(false);
						chai.expect(resJSON).to.have.property('username')
						chai.expect(resJSON.hometown).to.equal("Cleveland");
						done();
					});
				});
			});

 			it('Try to perform an authorized password update action', function(done){
				resources.PUT('/user', {
					password: Buffer('newPassword', 'utf8').toString('base64')
				}, function(err, res){ 
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
					chai.expect(resJSON).to.have.property('errorMessage');
					chai.expect(resJSON.errorMessage).to.equal('');
					chai.expect(resJSON).to.have.property('pipeToUser');
					chai.expect(resJSON.pipeToUser).to.equal(false);
					resources.POST('/oauth/token', {
						client_id: resources.clientId,
						client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
						username: resources.testUser.username,
						password: Buffer('newPassword', 'utf8').toString('base64'),
						grant_type: 'password'
					}, function(err, res){
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('access_token');
						chai.expect(resJSON).to.have.property('refresh_token');
						chai.expect(resJSON).to.have.property('expires_in');
						resources.setBearerToken(resJSON.access_token, resJSON.refresh_token);
						resources.PUT('/user', {
							hometown: 'Pittsburg'
						}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON).to.have.property('errorCode');
							chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
							chai.expect(resJSON).to.have.property('errorMessage');
							chai.expect(resJSON.errorMessage).to.equal('');
							chai.expect(resJSON).to.have.property('pipeToUser');
							chai.expect(resJSON.pipeToUser).to.equal(false);
							resources.POST('/oauth/token', {
								client_id: resources.clientId,
								client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
								username: resources.testUser.username,
								password: Buffer('newPassword', 'utf8').toString('base64'),
								grant_type: 'password'
							}, function(err, res){
								var resJSON = JSON.parse(res.text);
								chai.expect(resJSON).to.have.property('access_token');
								chai.expect(resJSON).to.have.property('refresh_token');
								chai.expect(resJSON).to.have.property('expires_in');
								resources.setBearerToken(resJSON.access_token, resJSON.refresh_token);
								done();
							});
						});
					});
				});
			});
		});

 		describe('User Model Tests', function(){
 			it('Test User.toJSON() returns all properties', function(done){
 				resources.getSails().models.user.findOne({username: resources.testUser.username})
				.then(function(user){
					return user.toJSON();
				}).
				then(function(json){
					chai.expect(json).to.have.property('username');
					chai.expect(json).to.have.property('firstName');
					chai.expect(json).to.have.property('lastName');
					chai.expect(json).to.have.property('hometown');
					chai.expect(json).to.have.property('email');
					chai.expect(json).to.have.property('sport');
					chai.expect(json).to.have.property('followingCount');
					chai.expect(json).to.have.property('followersCount');
					done();
				})
				.catch(function(err){
					done(err);
				});
 			});

 			it('Test User.getPublicData() returns all public properties', function(done){
 				resources.getSails().models.user.findOne({username: resources.testUser.username})
				.then(function(user){
					return user.getPublicData();
				})
				.then(function(json){
					chai.expect(json).to.have.property('username');
					chai.expect(json).to.have.property('firstName');
					chai.expect(json).to.have.property('lastName');
					chai.expect(json).to.have.property('hometown');
					chai.expect(json).to.have.property('followingCount');
					chai.expect(json).to.have.property('followersCount');
					chai.expect(json).to.not.have.property('email');
					done();
				})
				.catch(function(err){
					done(err);
				});
 			});

 			it('Test User.getImageUrl() returns \'\' when no image key stored', function(done){
 				resources.getSails().models.user.findOne({username: resources.testUser.username})
				.then(function(user){
					return user.getUserImageUrl(S3Services.ImageSizes.ORIGINAL);
				}).
				then(function(imageUrl){
					chai.expect(imageUrl).to.be.empty;
					done();
				})
				.catch(function(err){
					done(err);
				});
 			});

 			it('Test User.getImageUrl() returns a valid signed URL when key stored', function(done){
 				var thisUser = undefined;

 				resources.getSails().models.user.findOne({username: resources.testUser.username})
				.then(function(user){
					thisUser = user;
					user.image = "FAKE KEY";  //note that this fake key will still yeild a signed URL
					                          //and since the data isn't really in S3, we don't need to
					                          //worry about leaking any data

					return user.save();
				})
				.then(function(){
					return thisUser.getUserImageUrl(S3Services.ImageSizes.ORIGINAL);
				})
				.then(function(imageUrl){
					chai.expect(imageUrl).to.not.be.empty;
					chai.expect(imageUrl).to.contain('https');
				})
				.then(function(){
					done();
				})
				.catch(function(err){
					done(err);
				});
 			});
 		});

		describe('API Follow User', function(){
 			it('Only authorized user can try to follow another user', function(done){
 				resources.setBearerToken('', '');
 				resources.POST('/user/fakeid/follow', {}, function(err, res){
 					if(err){
 						done(err);
 					}
 					else{
 						//we are looking for a specific error
 						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
 					}
 				});
 			});

 			it('Check that all parameters are supplied', function(done){
 				//only required param 'id' is implied by the URL
 				done()
 			});
 		});

 		describe('API Unfollow User', function(){
 			it('Only authorized user can try to unfollow another user', function(done){
 				resources.setBearerToken('', '');
 				resources.DELETE('/user/fakeid/unfollow', {}, function(err, res){
 					if(err){
 						done(err);
 					}
 					else{
 						//we are looking for a specific error
 						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
 					}
 				});
 			});

 			it('Check that all parameters are supplied', function(done){
 				//only required param 'id' is implied by the URL
 				done()
 			});
 		});

		describe('API Get Following', function(){
			it('Only authorized user can search their following', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/following', {since: Date.now(), limit:25}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Only authorized user can search another users following', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/anotherUserId/following', {since: Date.now(), limit:25}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Check that all parameters are supplied, my following', function(done){
				resources.ensureTestUser()
				.then(function(){
					return resources.ensureTestUserAuthorized();
				})
				.then(function(){
					resources.GET('/user/following', {/* missing the page param*/}, function(err, res){
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                        chai.expect(resJSON.params).to.contain('limit');
                        chai.expect(resJSON.params).to.contain('since');
						done();
					});
				})
				.catch(function(err){
					done(err);
				});
			});

			it('Check that all parameters are supplied, another users following', function(done){
				resources.ensureTestUser()
					.then(function(){
						return resources.ensureTestUserAuthorized();
					})
					.then(function(){
						resources.GET('/user/anotherUserId/following', {/* missing the page param*/}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON).to.have.property('errorCode');
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                            chai.expect(resJSON.params).to.contain('limit');
                            chai.expect(resJSON.params).to.contain('since');
							chai.expect(resJSON.params).to.not.contain('id');  //built into URL
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});
		});

		describe('API Get Followers', function(){
			it('Only authorized user can search their followers', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/followers', {since: Date.now(), limit:25}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Only authorized user can search another users followers', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/anotherUserId/followers', {since: Date.now(), limit:25}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Check that all parameters are supplied, my followers', function(done){
				resources.ensureTestUser()
				.then(function(){
					return resources.ensureTestUserAuthorized();
				})
				.then(function(){
					resources.GET('/user/followers', {/* missing the page param*/}, function(err, res) {
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                        chai.expect(resJSON.params).to.contain('limit');
						chai.expect(resJSON.params).to.contain('since');
						done();
					});
				})
				.catch(function(err){
					done(err);
				});
			});

			it('Check that all parameters are supplied, another users followers', function(done){
				resources.ensureTestUser()
					.then(function(){
						return resources.ensureTestUserAuthorized();
					})
					.then(function(){
						resources.GET('/user/anotherUserId/followers', {/* missing the page param*/}, function(err, res) {
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON).to.have.property('errorCode');
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                            chai.expect(resJSON.params).to.contain('limit');
                            chai.expect(resJSON.params).to.contain('since');
							chai.expect(resJSON.params).to.not.contain('id');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});
		});

		describe('API Search Users', function(){
			it('Only authorized user can try to search for another user', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/search', {pageNumber: 1, query: 'fake'}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Check that all parameters are supplied', function(done){
				resources.ensureTestUser()
					.then(function(){
						return resources.ensureTestUserAuthorized();
					})
					.then(function(){
						resources.GET('/user/search', {/* missing the page param*/}, function(err, res) {
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON).to.have.property('errorCode');
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
							chai.expect(resJSON.params).to.contain('pageNumber');
							chai.expect(resJSON.params).to.contain('query');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});
		});

		describe('API Search Users By Email', function(){
			it('Only authorized user can try to search for another user by email', function(done){
				resources.setBearerToken('', '');
				resources.GET('/user/invite/search', {emails: []}, function(err, res){
					if(err){
						done(err);
					}
					else{
						//we are looking for a specific error
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('errorCode');
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
						done();
					}
				});
			});

			it('Check that all parameters are supplied when searching for users by email', function(done){
				resources.ensureTestUser()
					.then(function(){
						return resources.ensureTestUserAuthorized();
					})
					.then(function(){
						resources.GET('/user/invite/search', {/* missing the emails param*/}, function(err, res) {
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON).to.have.property('errorCode');
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
							chai.expect(resJSON.params).to.contain('emails');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});
		});

 		describe('User Service', function(){
 			it('follow() - Trying to follow invalid user', function(){
 				return resources.getTestUser()
 				.then(function(user){
 					chai.expect(UserServices.follow('fakeUserId', user)).to.eventually.be
 					   .rejectedWith("No user with id:  fakeUserId");
 				});
 			});

 			it('follow() - Trying to follow yourself', function(done){
 				resources.getTestUser()
 				.then(function(user){
 					chai.expect(UserServices.follow(user.id, user)).to.eventually.be
 					   .rejectedWith("User cannot follow self").and.notify(done);
 				});
 			});
	
 			it('follow() - Following a user', function(){
 				var user1 = undefined;
 				var user2 = undefined;

                var refreshTestUsers = function(){
                    return resources.getTestUser()
                        .then(function(testUser) {
                            user1 = testUser;
                            return resources.getTestUser2()
                        })
                        .then(function(testUser){
                            user2 = testUser;
                            return Promise.resolve();
                        });
                };

                return resources.ensureTestUser()
                    .then(function(){
                        return refreshTestUsers();
                    })
                    .then(function(){
                        return  UserServices.follow(user2.id, user1);
                    })
                    .then(function(){
                        return refreshTestUsers();
                    })
                    .then(function() {

                        return resources.getSails().models.following.findOne({
                            sourceUser: user1.id,
                            targetType: resources.getSails().models.following.followingTypes.USER,
                            targetUser: user2.id
                        });
                    })
                    .then(function(followingEdge){
                        chai.expect(followingEdge).to.not.be.undefined;
                        chai.expect(followingEdge.sourceUser).to.equal(user1.id);
                        chai.expect(followingEdge.targetUser).to.equal(user2.id);

                        return Promise.settle([
                            chai.expect(user1.toJSON()).to.eventually.have
                                .property('followingCount').that.equals(1),
                            chai.expect(user1.toJSON()).to.eventually.have
                                .property('followersCount').that.equals(0),
                            chai.expect(user2.toJSON()).to.eventually.have
                                .property('followersCount').that.equals(1),
                            chai.expect(user2.toJSON()).to.eventually.have
                                .property('followingCount').that.equals(0)
                        ]);
                    })
                    .then(function(results) {
                        results.forEach(function(result){
                            if(result.isRejected()){
                                throw result.error();
                            }
                        });
                        return Promise.resolve();
                    });
 			});

			it('getFollowing() - Try to get a paginated list of users which this users if following', function(){
				var user1 = undefined;
				var user2 = undefined;

                var user1FollowingEdges = undefined;
                var user2FollowingEdges = undefined;

				return resources.getTestUser()
				.then(function(user) {
                    user1 = user;

                    return resources.getSails().models.following.find({
                        sourceUser: user1.id,
                        targetType: resources.getSails().models.following.followingTypes.USER
                    });
                })
                .then(function(followingEdges){
                    user1FollowingEdges = followingEdges;
					return resources.getTestUser2();
				})
				.then(function(user) {
                    user2 = user;

                    return resources.getSails().models.following.find({
                        sourceUser: user2.id,
                        targetType: resources.getSails().models.following.followingTypes.USER
                    });
                })
                .then(function(followingEdges){
                    user2FollowingEdges = followingEdges;

					var promise1 = UserServices.findFollowers(Date.now(), 25, user2, user2);
					var promise2 = UserServices.findFollowers(new Date( Date.now() - 15000), 25, user2, user2);
					var promise3 = UserServices.findFollowers(Date.now(), 25, user1, user1);

					var promise4 = UserServices.findFollowing(Date.now(), 25, user1, user1);
					var promise5 = UserServices.findFollowing(user1FollowingEdges[0].createdAt.getMilliseconds() - 2000, 25, user1, user1);
					var promise6 = UserServices.findFollowing(Date.now(), 25, user2, user2);

					return Promise.settle([ promise5])
						.then(function(results){
                            //make sure there were no errors above
                            results.forEach(function(result){
                                if(result.isRejected()){
                                    throw result.error();
                                }
                            });

                            return Promise.settle([
                                chai.expect(promise1).to.eventually.have.property('followers'),
                                chai.expect(promise1).to.eventually.have.deep.property('followers.length').that.equals(1),
                                chai.expect(promise1).to.eventually.have.deep.property('followers[0].id').that.equals(user1.id),
                                chai.expect(promise1).to.eventually.have.deep.property('followers[0].userFollows').that.equals(false),
                                chai.expect(promise1).to.eventually.have.property('cursor'),

                                chai.expect(promise2).to.eventually.have.property('followers'),
                                chai.expect(promise2).to.eventually.have.deep.property('followers.length').that.equals(0),

                                chai.expect(promise3).to.eventually.have.property('followers'),
                                chai.expect(promise3).to.eventually.have.deep.property('followers.length').that.equals(0),

                                chai.expect(promise4).to.eventually.have.property('following'),
                                chai.expect(promise4).to.eventually.have.deep.property('following.length').that.equals(1),
                                chai.expect(promise4).to.eventually.have.deep.property('following[0].userFollows').that.equals(true),
                                chai.expect(promise4).to.eventually.have.property('cursor'),

                                chai.expect(promise5).to.eventually.have.property('following'),
                                chai.expect(promise5).to.eventually.have.deep.property('following.length').that.equals(0),

                                chai.expect(promise6).to.eventually.have.property('following'),
                                chai.expect(promise6).to.eventually.have.deep.property('following.length').that.equals(0)
                            ]);
						})
						.then(function(results){
                            //make sure there were no errors above
                            results.forEach(function(result){
                                if(result.isRejected()){
                                    throw result.error();
                                }
                            });

                            return Promise.resolve();
						})
                        .catch(function(err){
                            //pass any error the outer chain
                            throw err;
                        });

				});
			});
	
 			it('follow() - Trying to follow user which this user is already following', function(){
                var user1 = undefined;
                var user2 = undefined;

                var refreshTestUsers = function(){
                    return resources.getTestUser()
                        .then(function(testUser) {
                            user1 = testUser;
                            return resources.getTestUser2()
                        })
                        .then(function(testUser){
                            user2 = testUser;
                            return Promise.resolve();
                        });
                };


                //continue where the last test left off
 				return refreshTestUsers()
 				.then(function() {
                    return UserServices.follow(user2.id, user1);
                })
                .then(function(){
                    return refreshTestUsers();
                })
                .then(function() {

                    return resources.getSails().models.following.findOne({
                        sourceUser: user1.id,
                        targetType: resources.getSails().models.following.followingTypes.USER,
                        targetUser: user2.id
                    });
                })
                .then(function(followingEdge){
                    chai.expect(followingEdge).to.not.be.undefined;
                    chai.expect(followingEdge.sourceUser).to.equal(user1.id);
                    chai.expect(followingEdge.targetUser).to.equal(user2.id);

                    return Promise.settle([
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(1),
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(0),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(1),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(0)
                    ]);
                })
                .then(function(results){
                    results.forEach(function(result){
                        if(result.isRejected()){
                            throw result.error();
                        }
                    });

                    return Promise.resolve();
                });
 			});

 			it('unfollow() - Trying to unfollow invalid user', function(){
 				return resources.getTestUser()
 				.then(function(user){
 					return chai.expect(UserServices.unfollow('fakeUserId', user)).to.eventually.be
 					   .rejectedWith("User not currently following any user with id:  fakeUserId");
 				});
 			});

 			it('unfollow() - Trying to unfollow yourself', function(){
 				return resources.getTestUser()
 				.then(function(user){
 					return chai.expect(UserServices.unfollow(user.id, user)).to.eventually.be
 					   .rejectedWith("User cannot unfollow self");
 				});
 			});
	
 			it('unfollow() - unfollowing a user', function(){
 				var user1 = undefined;
 				var user2 = undefined;

 				return resources.getTestUser()
 				.then(function(user){
 					user1 = user;
 					return resources.getTestUser2();
 				})
 				.then(function(user){
 					user2 = user;
 					return UserServices.unfollow(user2.id, user1);
 				})
                .then(function() {

                    return resources.getSails().models.following.findOne({
                        sourceUser: user1.id,
                        targetType: resources.getSails().models.following.followingTypes.USER,
                        targetUser: user2.id
                    });
                })
                .then(function(followingEdge) {
                        chai.expect(followingEdge).to.be.undefined;

                        return resources.getTestUser2();
                })
                .then(function(updatedUserModelObj){
                    user2 = updatedUserModelObj;

                    return Promise.settle([
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(0),
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(0),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(0),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(0)
                    ]);
                })
                .then(function(results){
                    results.forEach(function(result){
                        if(result.isRejected()){
                            throw result.error();
                        }
                    });

                    return Promise.resolve();
                });
 			});
	
 			it('unfollow() - Trying to unfollow user which this user is not following', function(){
 				var user1 = undefined;
 				var user2 = undefined;

 				//continue where the last test left off
 				return resources.getTestUser()
 				.then(function(user){
 					user1 = user;
 					return resources.getTestUser2();
 				})
 				.then(function(user){
 					user2 = user;
 					return chai.expect(UserServices.unfollow(user2.id, user1)).to.eventually.be.rejectedWith(
                        "User not currently following any user with id:  " + user2.id);
 				})
 				.then(function(){
 					//There should be no change, calling follow again doesn't re-follow, counts 
 					//should all remain the same

                    return Promise.settle([
                        chai.expect(user1.following).to.not.contain(user2.id),
                        chai.expect(user1).to.not.have.property('followingCount'), //must call toJSON
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(0),
                        chai.expect(user1.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(0),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followersCount').that.equals(0),
                        chai.expect(user2.toJSON()).to.eventually.have
                            .property('followingCount').that.equals(0)
                    ]);
 				})
                .then(function(results){
                    results.forEach(function(result){
                        if(result.isRejected()){
                            throw result.error();
                        }
                    });

                    return Promise.resolve();
                });
 			});

			it('findUsers() - Searching for users by username', function(){
				var user1 = undefined;
				var user2 = undefined;

				//continue where the last test left off
				return resources.getTestUser()
					.then(function(user){
						user1 = user;
						return resources.getTestUser2();
					})
					.then(function() {

                        return Promise.settle([
                            chai.expect(UserServices.findUsers((user1.firstName), 1, user1)).to.eventually.have.length(2),

                            //verify that the same search yields no results for page 2 (default page size 25)
                            chai.expect(UserServices.findUsers((user1.firstName), 2, user1)).to.eventually.have.length(0),

                            //verify that the search string is tokenized appropriatly, if I search 'bob smith' then I should
                            //get back all first/last/user names that either contain 'bob' or 'smith'
                            chai.expect(UserServices.findUsers(user1.firstName + " " + user1.lastName, 1, user1)).to.eventually
                                .have.length(2)
                        ]);
					})
                    .then(function(results){
                        results.forEach(function(result){
                            if(result.isRejected()){
                                throw result.error();
                            }
                        });

                        return Promise.resolve();
                    });
			});

			it('findUsersByEmail() - Search for users by email', function(){
				var user1 = undefined;
				var user2 = undefined;

				return Promise.all([
					resources.getTestUser().then(function(user){
						user1 = user;
					}),
					resources.getTestUser2().then(function(user){
						user2 = user;
					})
				]).then(function(){
					return Promise.all([
						chai.expect(UserServices.findUsersByEmail(user1, [])).to.eventually.have.length(0),
						chai.expect(UserServices.findUsersByEmail(user1, [ user2.email ])).to.eventually.have.length(1),

						//User might supply own email, make sure we can handle this (user filtered from results)
						chai.expect(UserServices.findUsersByEmail(user1, [ user1.email, user2.email ] )).to.eventually.have.length(1),
						chai.expect(UserServices.findUsersByEmail(user1, [
							'malformed email )_*(&)(*&',
							'crap@email.com',
							user2.email,
							'cory sucks'
						])).to.eventually.have.length(1)
					]);
				});
			});

			it('update() - Duplicate username', function(){
				var user1 = undefined;
				var user2 = undefined;

				//continue where the last test left off
				return resources.getTestUser()
					.then(function(user){
						user1 = user;
						return resources.getTestUser2();
					})
					.then(function(user) {
						user2 = user;
						return chai.expect(UserServices.updateUser({
							username: user2.username
						}, user1)).to.be.rejected.and.eventually.have.property('errorMessage', errors.clientErrors.ERROR_CLIENT_DUPLICATE_USERNAME.errorMessage);
					});
			});

			it('update() - Duplicate email', function(){
				var user1 = undefined;
				var user2 = undefined;

				//continue where the last test left off
				return resources.getTestUser()
					.then(function(user){
						user1 = user;
						return resources.getTestUser2();
					})
					.then(function(user) {
						user2 = user;
						return chai.expect(UserServices.updateUser({
							email: user2.email
						}, user1)).to.be.rejected.and.eventually.have.property('errorMessage', errors.clientErrors.ERROR_CLIENT_DUPLICATE_EMAIL.errorMessage);
					});
			});

			it('update() - Duplicate facebookId', function(){
				var user1 = undefined;
				var user2 = undefined;

				//continue where the last test left off
				return resources.getTestUser()
					.then(function(user){
						user1 = user;
						user1 = user;
						return resources.getTestUser2();
					})
					.then(function(user) {
						user2 = user;
						user2.facebookId = "crapId";

						return user2.save();
					})
					.then(function(updatedUser){
						user2 = updatedUser;
						return chai.expect(UserServices.updateUser({
							facebookId: user2.facebookId
						}, user1)).to.be.rejected.and.eventually.have.property('errorMessage', errors.clientErrors.ERROR_CLIENT_DUPLICATE_FACEBOOKACCOUNT.errorMessage);
					});
			});
 		});

 		//describe('API Forgot Password', function(){
 		//	it('Test that this route is not available without client-only crendentials', function(done){
 		//		resources.GET('/user/forgotPassword', {}, function(err, res){
 		//			var resJSON = JSON.parse(res.text);
 		//			chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
 		//			done();
 		//		});
 		//	});
 		//	
 		//	it('Test that email parameter is required', function(done){
 		//		resources.GET('/user/forgotPassword', {
 		//			client_id: resources.clientId,
		//			client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64')
 		//		}, function(err, res){
 		//			var resJSON = JSON.parse(res.text);
 		//			chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
		//			chai.expect(resJSON).to.have.property('params');
 		//			done();
 		//		});
 		//	});
 		//	
 		//	it('Test the happy path', function(done){
 		//		resources.GET('/user/forgotPassword', {
 		//			client_id: resources.clientId,
		//			client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
		//			email: 'stephen@phenomapp.com'
 		//		}, function(err, res){
 		//			var resJSON = JSON.parse(res.text);
 		//			chai.expect(resJSON).to.have.property('errorCode');
		//			chai.expect(resJSON.errorCode).to.equal(errors.noError.errorCode);
		//			chai.expect(resJSON).to.have.property('errorMessage');
		//			chai.expect(resJSON.errorMessage).to.equal('');
		//			chai.expect(resJSON).to.have.property('pipeToUser');
		//			chai.expect(resJSON.pipeToUser).to.equal(false);
 		//			done();
 		//		});
 		//	});
		//});
	};
};
