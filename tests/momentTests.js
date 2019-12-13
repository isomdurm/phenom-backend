/**  Tests Moment Support
 *   
 * @author      :: Isom Durm (isom@phenomapp.com)
 *  
 **/

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var requireFromTest = require('require-from').bind(undefined, 'testExports', module);
var errors = require('../api/services/Errors.js');
var util = require('util');
var LockerServices = require('../api/services/LockerServices.js');
var LikeModel = require('../api/models/Like.js');
var MomentReferenceModel = require('../api/models/MomentReference.js');
var MomentServices = requireFromTest('../api/services/MomentServices.js');
var UserServices = require('../api/services/UserServices.js');
var Config = require('../api/services/Config.js');
var _ = require('lodash');
var Promise = require('bluebird');

chai.use(chaiAsPromised);

module.exports = function(resources){
	return function(){
        var _defaultMomentMode = 0;
        var _stylingMomentMode = 0;

		before(function(){
            //init test assets
            _defaultMomentMode = resources.getSails().models.moment.momentModeTypes.TRAINING;
            _stylingMomentMode = resources.getSails().models.moment.momentModeTypes.STYLING;

			return resources.ensureAllTheThings();
		});

		//we uploaded stuff to AWS as part of this test, lets make sure we clean this stuff up
		after(function(){
			return resources.getSails().models.moment.destroy({});
		});

		describe('Moment Service Tests', function(){
			it("Should be able to create a moment", function(){
				return resources.ensureAllTheThings()
					.then(function(){
						return resources.getTestUser();
					})
 					.then(function(user){
 						return MomentServices.createMoment(
                            _stylingMomentMode,
 							[resources.testProductInternalId],
 							resources.testMoment.headline,
 							resources.getImagePath(),
                            {/* no cropping rect */},
 							"song",
 							new Date(),
							[],
 							user);
 					})
 					.then(function(momentBundle){
 						chai.expect(momentBundle.moment).to.not.be.null;
 					});
 				});

 				it("Should be able to get an existing moment", function(){
 					var user = undefined;

 					return resources.getTestUser()
 					.then(function(thisUser){
 						user = thisUser;
 						return resources.getSails().models.moment.findOne({userId: user.id});
 					})
 					.then(function(moment){
 						return MomentServices.findMoment(moment.id, false, user);
 					})
 					.then(function(result){
                        chai.expect(result).to.have.property('mode').that.equals(_stylingMomentMode);
 						chai.expect(result).to.have.property('headline');
 						chai.expect(result).to.have.property('user');  //all userId objects should be turned into user objects with public data
 						chai.expect(result.headline).to.equal(resources.testMoment.headline);
 						chai.expect(result.hasOwnProperty('products')).to.equal(true);
 						chai.expect(result.products).to.be.an('array');
 						chai.expect(result).to.have.property('createdAt');
 						chai.expect(result.products.length).to.be.above(0);
 						chai.expect(result.products[0]).to.have.property('id');
 						chai.expect(result.products[0].id).to.equal(resources.testProductInternalId);
 					});
 				});

				function sleep(time) {
    				var stop = new Date().getTime();
    				while(new Date().getTime() < stop + time) {
    	   				 ;
    				}
				}

			it("Should be able to get several existing moments by date", function(){
 				var theUser = undefined;
 				var theYoungest = undefined;

				//first lets create a bunch of moments
 				return resources.getTestUser()
 				.then(function(user){
 					theUser = user;

 					sleep(2000);

 					return MomentServices.createMoment(
                        _defaultMomentMode,
 						[resources.testProductInternalId],
 						resources.testMoment.headline,
 						resources.getImagePath(),
                        {/* no cropping rect */},
 						"song",
 						new Date(),
						[],
 						user);
 				})
 				.then(function(){
 					sleep(2000);

 					return MomentServices.createMoment(
                        _defaultMomentMode,
 						[resources.testProductInternalId],
 						resources.testMoment.headline,
 						resources.getImagePath(),
                        {/* no cropping rect */},
 						"song",
 						new Date(),
						[],
 						theUser);
 				})
 				.then(function(){
 					sleep(2000);

 					return MomentServices.createMoment(
                        _defaultMomentMode,
 						[resources.testProductInternalId],
 						resources.testMoment.headline,
 						resources.getImagePath(),
                        {/* no cropping rect */},
 						"song",
 						new Date(),
						[],
 						theUser);
 				})
 				.then(function(){
 					return MomentServices.getFeed(Date.now(), 5, theUser); //get all
 				})
 				.then(function(moments){
 					chai.expect(moments.length).to.equal(4);
 					chai.expect(moments[0].headline).to.equal(resources.testMoment.headline);
                    chai.expect(moments[0].topLikes).to.be.empty;
 					theYoungest = moments[0];

 					return MomentServices.getFeed(Date.now(), 2, theUser);  //get the latest two
 				})
 				.then(function(moments){
 					chai.expect(moments.length).to.equal(2);
 					chai.expect(moments[0].headline).to.equal(resources.testMoment.headline);

 					return MomentServices.getFeed(Date.now(), 0, theUser);  //get none
 				})
 				.then(function(moments){
 					chai.expect(moments.length).to.equal(0);

 					return MomentServices.getFeed(theYoungest.createdAt - 1000, 5, theUser); //get all younger than theYoungest
 				})
 				.then(function(moments){
 					chai.expect(moments.length).to.equal(3);
 					chai.expect(moments[0].createdAt).to.be.below(theYoungest.createdAt);  //should all be older (lesser time value)
 					chai.expect(moments[1].createdAt).to.be.below(theYoungest.createdAt);
 					chai.expect(moments[2].createdAt).to.be.below(theYoungest.createdAt);
 				});
 			});

			it("Should increment the global moment type counts and user moment count", function(){
				var thisUser = undefined;
				var newProduct = undefined;

				return resources.getTestUser2()
				.then(function(user){
					thisUser = user;
					return resources.getTestProduct();
				})
 				.then(function(product){
					newProduct = product;
 					return LockerServices.addProduct(newProduct, thisUser);
 				})
 				.then(function(result){
 					return ProductServices.getProducts([result.productId], thisUser, thisUser);
 				})
 				.then(function(products){
 					chai.expect(products.length).to.equal(1);
					chai.expect(products[0]).to.have.property('momentCount');
 					chai.expect(products[0]).to.have.property('stylingMomentCount');
					chai.expect(products[0]).to.have.property('trainingMomentCount');
					chai.expect(products[0]).to.have.property('gamingMomentCount');

 					//cache for later use
 					var oldMomentCount = products[0].momentCount;
					var oldGlobalMomentCount = products[0].stylingMomentCount + products[0].trainingMomentCount + products[0].gamingMomentCount;

 					//now make the moment
 					return MomentServices.createMoment(
                        _defaultMomentMode,
 						[products[0].id],
 						resources.testMoment.headline,
 						resources.getImagePath(),
                        {/* no cropping rect */},
 						"song",
 						new Date(),
						[],
 						thisUser
					)
						.then(function(){
							//get the latest values for the new product
							return ProductServices.getProducts([newProduct.id], thisUser, thisUser);
						})
						.then(function(products){
							chai.expect(products.length).to.equal(1);
							chai.expect(products[0]).to.have.property('momentCount', oldMomentCount + 1);
							var newGlobalMomentCount = products[0].stylingMomentCount + products[0].trainingMomentCount + products[0].gamingMomentCount;
							chai.expect(newGlobalMomentCount).to.equal(oldGlobalMomentCount + 1);
						});;
 				});
			});

            it("getMostRecentMoments() - should exist on user object, bundled with moment", function() {

                return resources.getTestUser()
                    .then(function(user){

                        return user.getPublicDataWithMostRecentMoments()
                            .then(function(userJSON){
                                chai.expect(userJSON).to.have.property('mostRecentMoments');
                                chai.expect(userJSON.mostRecentMoments).to.have.length(3);
                            });
                    });
            });

			it("like() - Perform like operation", function(){
				var testUser1 = undefined;
				var testUser2 = undefined;
				var testMoment = undefined;

				return resources.getTestUser()
				.then(function(user){
					chai.expect(user).to.not.be.null;
					testUser1 = user;

					return resources.getTestUser2();
				})
				.then(function(user){
					chai.expect(user).to.not.be.null;
					testUser2 = user;

					return resources.getSails().models.moment.findOne({
						userId: testUser1.id,
						deleted: false
					});
				})
				.then(function(moment){
					chai.expect(moment).to.not.be.null;
					testMoment = moment;

					return MomentServices.like(testMoment.id, testUser1);
				})
				.then(function(){
					return MomentServices.like(testMoment.id, testUser2);
				})
				.then(function(){
					//lets fetch the latest likes attribute
					return MomentServices.findMoment(testMoment.id, false, testUser1)
				})
				.then(function(moment){
					chai.expect(moment).to.have.property('topLikes');
                    chai.expect(moment.topLikes).to.have.length(2);
                    chai.expect(moment.topLikes[0].id).to.equal(testUser2.id);
                    chai.expect(moment.userLikes).to.be.true;

                    return resources.getSails().models.like.find({
                        targetType: LikeModel.targetTypes.MOMENT,
                        targetMoment: moment.id
                    }).populate('sourceUser');
                })
                .then(function(likes){
                    chai.expect(likes.length).to.equal(2);
                    return Promise.resolve();
				});
			});

			it("getLikes() - Search for a list of users who like a particular moment", function() {

				var testUser = undefined;
                var testMoment = undefined;

				return resources.getTestUser()
				.then(function(user) {

					chai.expect(user).to.not.be.undefined;
					testUser = user;
					return resources.getSails().models.moment.findOne({userId: user.id});
				})
				.then(function(moment) {

					chai.expect(moment).to.not.be.undefined;
					testMoment = moment;

					return MomentServices.getLikes(testMoment.id, Date.now(), 25, testUser);
				})
				.then(function(results) {

                    chai.expect(results).to.have.property('cursor');
                    chai.expect(results.cursor).to.be.above(0);
                    chai.expect(results.likesCount).to.equal(2);
                    chai.expect(results.likes[0]).to.have.property('firstName');
                    chai.expect(results.likes[0]).to.have.property('lastName');
                    chai.expect(results.likes[0]).to.have.property('imageUrl');
                    chai.expect(results.likes[0]).to.have.property('username');
                    chai.expect(results.likes[1].lastName).to.equal(testUser.lastName);  //ordered by date liked

                    //make sure we can fetch by date 'since'
                    return resources.getSails().models.like.find({
                        targetType: LikeModel.targetTypes.MOMENT,
                        targetMoment: testMoment.id
                    }).sort({createdAt: 'desc'});
                })
                .then(function(likes){
					return MomentServices.getLikes(testMoment.id, likes[0].createdAt, 25, testUser);
				})
				.then(function(results) {
                    chai.expect(results).to.have.property('cursor');
                    chai.expect(results.cursor).to.be.above(0);
                    chai.expect(results.likes).to.have.length(1);
                    chai.expect(results.likesCount).to.equal(2);
                    return MomentServices.getLikes(testMoment.id, Date.now(), 0, testUser);
                })
                .then(function(likes){
                    chai.expect(likes.likes.length).to.equal(0);
                    return Promise.resolve();
                });
			});

			it("unlike() - Perform unlike operation", function(){
				var testUser1 = undefined;
				var testUser2 = undefined;
				var testMoment = undefined;

				return resources.getTestUser()
				.then(function(user){
					chai.expect(user).to.not.be.undefined;
					testUser1 = user;

					return resources.getTestUser2();
				})
				.then(function(user){
					chai.expect(user).to.not.be.undefined;
					testUser2 = user;

					return resources.getSails().models.moment.findOne({userId: testUser1.id});
				})
				.then(function(moment){
					chai.expect(moment).to.not.be.null;
					testMoment = moment;

					return MomentServices.unlike(testMoment.id, testUser1);
				})
				.then(function(){
					return MomentServices.findMoment(testMoment.id, false, testUser1);
				})
				.then(function(moment){
					chai.expect(moment.userLikes).to.be.false;
                    chai.expect(moment.likesCount).to.equal(1);
					return MomentServices.unlike(testMoment.id, testUser2);
				})
				.then(function(){
					//lets fetch the latest likes attribute
					return MomentServices.findMoment(testMoment.id, false, testUser1);
				})
				.then(function(moment){
					chai.expect(moment.likesCount).to.equal(0);

                    return Like.find({
                        targetType: LikeModel.targetTypes.MOMENT,
                        targetMoment: moment.id
                    });
				})
                .then(function(likes){
                    chai.expect(likes.length).to.equal(0);
                    return Promise.resolve();
                });
			});

			it("Adding a moment comment should increase it's commentCount", function(){
				var testUser = undefined;
				var testMoment = undefined;

				return resources.getTestUser()
					.then(function(user) {

						chai.expect(user).to.not.be.undefined;
						testUser = user;
						return resources.getSails().models.moment.findOne({userId: user.id});
					})
					.then(function(moment) {
						chai.expect(moment).to.not.be.undefined;
						chai.expect(moment.commentCount).to.equal(0);
						testMoment = moment;

						return MomentServices.createMomentComment(
							testMoment.id,
							"This is a moment comment, hey @" + testUser.username + " @^#, @ , @FAKEPHENOMID.",
							[/* they're all auto-tagged references here */],
							testUser
						);
					})
					.then(function (commentId) {
						chai.expect(commentId).to.not.be.undefined;

						return resources.getSails().models.moment.findOne({id: testMoment.id});
					})
					.then(function(moment) {
						chai.expect(moment).to.not.be.undefined;
						testMoment = moment;

						chai.expect(moment.commentCount).to.equal(1);
						return true; //done
					});
			});

			it('Moments should also contain recentComments when not fetched in summary mode', function(){
				var testUser = undefined;
				var testMoment = undefined;

				return resources.getTestUser()
					.then(function(user) {

						chai.expect(user).to.not.be.undefined;
						testUser = user;
						return resources.getSails().models.moment.findOne({userId: user.id});
					})
					.then(function(moment) {
						chai.expect(moment).to.not.be.undefined;
						testMoment = moment;

						return MomentServices.findMoment(testMoment.id, false, testUser);
					})
					.then(function(results){
						chai.expect(results).to.have.property('recentComments');
						chai.expect(results.recentComments).to.have.property('length', 1);
						chai.expect(results.recentComments[0].references).to.have.property('length', 1);

						return true; //done
					});
			});

			var momentWithRefs = undefined;
			var testUser = undefined;
			var testUser2 = undefined;

			it('create() - Creating with references shall increment reference count', function(){
				return resources.getTestUser()
					.then(function(user) {

						chai.expect(user).to.not.be.undefined;
						testUser = user;
						return resources.getTestUser2();
					})
					.then(function(user){
						chai.expect(user).to.not.be.undefined;
						testUser2 = user;

						return MomentServices.createMoment(
							_stylingMomentMode,
							[resources.testProductInternalId],
							resources.testMoment.headline,
							resources.getImagePath(),
							{/* no cropping rect */},
							"song",
							new Date(),
							[
								{referenceType: MomentReferenceModel.momentReferenceTypes.USER, id: testUser2.id}
							],
							testUser);
					})
					.then(function(moment){
						chai.expect(moment).to.have.property('moment');
						chai.expect(moment).to.have.property('references');
						chai.expect(moment.references).to.have.length(1);
						chai.expect(moment).to.have.deep.property('references[0].id', testUser2.id);

						//cache for later tests
						momentWithRefs = moment.moment;
					});
			});

			it('find() - References come with moment if they exist', function(){
				return chai.expect(MomentServices.findMoment(momentWithRefs.id, true, testUser))
					.to.eventually.have.deep.property("references[0].id", testUser2.id);
			});

			//soft delete keeps headline references
			it("destroyMoment() - Soft delete saves moment references and dumps notifications", function(){
				return MomentServices.destroyMoment(momentWithRefs.id, testUser)
					.then(function(){
						return chai.expect(resources.getSails().models.momentreference.find({
							sourceMoment: momentWithRefs.id
						})).to.eventually.have.length(1);
					})
					.then(function(){
						return chai.expect(resources.getSails().models.notification.find({
							'additionalData.momentId': momentWithRefs.id
						})).to.eventually.have.length(0);
					});
			});

			//soft delete keeps headline references
			it("Moment.destroy() - Hard delete dumps moment references", function(){
				return resources.getSails().models.moment.destroy({
					id: momentWithRefs.id
				})
					.then(function(numdeleted){
						chai.expect(numdeleted).to.have.length(1);
						return chai.expect(resources.getSails().models.momentreference.find({
							sourceMoment: momentWithRefs.id
						})).to.eventually.have.length(0);
					});
			});

			//should be the last test
			it('destroyMoment() - Moment is only soft-deleted (recycled)', function(){
				var testUser = undefined;
				var testMoment = undefined;
				var testProduct = undefined;

				return resources.getTestUser()
					.then(function(user){
						chai.expect(user).to.not.be.null;
						testUser = user;

						return resources.getSails().models.moment.findOne({userId: testUser.id});
					})
					.then(function(moment) {
                        chai.expect(moment).to.not.be.null;
                        testMoment = moment;

                        return MomentServices.like(testMoment.id, testUser);
                    })
                    .then(function(){

                        return resources.getSails().models.like.find({
                            targetType: LikeModel.targetTypes.MOMENT,
                            targetMoment: testMoment.id
                        });
                    })
                    .then(function(likes) {
						chai.expect(likes.length > 0).to.be.true;

						//capture the test product before we delete the moment, want to compare counts before and
						//after
						//get the latest values for the new product
						return resources.getTestProduct();
					})
					.then(function(product){
						return ProductServices.getProducts([product.id], testUser, testUser);
					})
					.then(function(products){
						chai.expect(products).to.have.length(1);
						testProduct = products[0];

						//at this point, there are 4 moments for testProduct1 created by user1, and 1 moment for testProduct1
						//created by user2 (5 moments in total)
						return MomentServices.destroyMoment(testMoment.id, testUser);
					})
                    .then(function(){
                        return resources.getSails().models.like.find({
                            targetType: LikeModel.targetTypes.MOMENT,
                            targetMoment: testMoment.id
                        });
                    })
                    .then(function(likes){
                        chai.expect(likes.length).to.equal(1);

						//get the latest values for the new product
						return ProductServices.getProducts([testProduct.id], testUser, testUser);
					})
					.then(function(products){
						chai.expect(products.length).to.equal(1);
						chai.expect(products[0]).to.have. property('momentCount', testProduct.momentCount - 1);

						if(testMoment.mode == resources.getSails().models.moment.momentModeTypes.STYLING){
							chai.expect(products[0]).to.have.property('stylingMomentCount', testProduct.stylingMomentCount - 1);
						}
						else{
							chai.expect(products[0]).to.have.property('gamingMomentCount');
							chai.expect(products[0]).to.have.property('trainingMomentCount');
						}


						if(testMoment.mode == resources.getSails().models.moment.momentModeTypes.GAMING){
							chai.expect(products[0]).to.have.property('gamingMomentCount', testProduct.gamingMomentCount - 1);
						}
						else{
							chai.expect(products[0]).to.have.property('stylingMomentCount');
							chai.expect(products[0]).to.have.property('trainingMomentCount');
						}


						if(testMoment.mode == resources.getSails().models.moment.momentModeTypes.TRAINING){
							chai.expect(products[0]).to.have.property('trainingMomentCount', testProduct.trainingMomentCount - 1);
						}
						else{
							chai.expect(products[0]).to.have.property('gamingMomentCount');
							chai.expect(products[0]).to.have.property('stylingMomentCount');
						}

						var oldGlobalCount = testProduct.trainingMomentCount + testProduct.gamingMomentCount + testProduct.stylingMomentCount;
						var newGlobalCount = products[0].trainingMomentCount + products[0].gamingMomentCount + products[0].stylingMomentCount;
						chai.expect(newGlobalCount).to.equal(oldGlobalCount - 1);

                        return resources.getSails().models.moment.findOne({
							id: testMoment.id
						});
					})
					.then(function(moment){
						chai.expect(moment).to.have.property('deleted', true);

						//soft deleting preserves comments
						chai.expect(moment).to.have.property('commentCount', 1);

						//trying to fetch the moment from MomentServices should reject
						return chai.expect(MomentServices.findMoment(testMoment.id, false, testUser)).to.eventually.be.rejected;
					});
			});

			it('Moment Model - destroy() - all hard references are actually removed', function(){
				var testUser = undefined;
				var testMoment = undefined;

				return resources.getTestUser()
					.then(function(user){
						chai.expect(user).to.not.be.null;
						testUser = user;

						return resources.getSails().models.moment.findOne({userId: testUser.id});
					})
					.then(function(moment) {
						chai.expect(moment).to.not.be.null;
						testMoment = moment;
					})
					.then(function(){
						return testMoment.destroy();
					})
					.then(function(){
						return resources.getSails().models.like.find({
							targetTypes: LikeModel.targetTypes.MOMENT,
							targetMoment: testMoment.id
						});
					})
					.then(function(likes) {
						chai.expect(likes.length).to.equal(0);

						//all associated comments should be removed
						return resources.getSails().models.comment.find({
							targetMoment: testMoment.id
						});
					})
					.then(function(results){
						chai.expect(results).to.have.length(0);

						return resources.getSails().models.moment.find({
							id: testMoment.id
						});
					})
					.then(function(results){
						chai.expect(results).to.have.length(0);
					});
			});
		});

		describe('Moment Controller Tests', function(){
			it("Can only create moments when authorized", function(done){
				resources.POST('/moment', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("Can only delete moments when authorized", function(done){
				resources.DELETE('/moment/FAKEID', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("Can only get single moment by id when authorized", function(done){
				resources.GET('/moment', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("like() - Can only get moments when authorized", function(done){
				resources.POST('/moment/fakeID/like', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("unlike() - Can only get moments when authorized", function(done){
				resources.DELETE('/moment/fakeID/unlike', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("getLikes() - Can only get moment likes when authorized", function(done){
				resources.GET('/moment/fakeID/likes', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("UserController.getMoments() - Can only get moments for another user when authorized", function(done){
				resources.GET('/user/fakeID/moments', {pageNumber: 1}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("Can only create comments when authorized", function(done){
				resources.POST('/moment/SOMEID/comment', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("Can only fetch comments when authorized", function(done){
				resources.GET('/moment/SOMEID/comments', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it("Should get invalid params error if we dont supply all parameters when deleting a moment", function(done){
				resources.ensureTestUserAuthorized()
					.then(function(){
						resources.DELETE('/moment/', {/*omit the id param*/}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

							//we should have the following missing parameters, according the API spec
							chai.expect(resJSON).to.have.property('params');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});

			it("Can't delete a moment that's not yours", function(done){
				var testUser2 = undefined;
				var testMoment = undefined;

				resources.ensureTestUserAuthorized()
					.then(function() {
						return resources.getTestUser2();
					})
					.then(function(user){
						chai.expect(user).to.not.be.null;
						testUser2 = user;

						return resources.getSails().models.moment.findOne({userId: testUser2.id});
					})
					.then(function(moment){
						chai.expect(moment).to.not.be.null;
						testMoment = moment;

						resources.DELETE('/moment/' + testMoment.id + '/', {}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS.errorCode);
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});

			it("Should get invalid params error if we dont supply all parameters when creating a moment", function(done){
				resources.ensureTestUserAuthorized()
					.then(function(something){
						resources.POST('/moment', {}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

							//we should have the following missing parameters, according the API spec
							chai.expect(resJSON).to.have.property('params');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});

			it("Should get invalid params error if we dont supply all parameters when getting moment by id", function(done){
				resources.ensureTestUserAuthorized()
				.then(function(something){
					resources.GET('/moment', {}, function(err, res){
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

						//we should have the following missing parameters, according the API spec
						chai.expect(resJSON).to.have.property('params');
						done();
					});
				})
				.catch(function(err){
					done(err);
				});
			});

			it("like():  Should get invalid params error if we dont supply all parameters", function(){
				//only required param is implied in URL
				return Promise.resolve();
			});

			it("unlike():  Should get invalid params error if we dont supply all parameters", function(){
				//only required param is implied in URL
                return Promise.resolve();
			});

			it("getLikes():  Should get invalid params error if we dont supply all parameters", function(){
				return resources.ensureTestUserAuthorized()
				.then(function(){
					resources.GET('/moment/fakeId/likes', {}, function(err, resp){
						chai.expect(err).to.be.null;
						var resJSON = JSON.parse(resp.text);
						chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
						chai.expect(resJSON).to.have.property('params');
                        chai.expect(resJSON.params.length).to.equal(2);
					});
				})
			});

			it("UserController.getMoments():  Should get invalid params error if we dont supply all parameters", function(){
				return resources.ensureTestUserAuthorized()
					.then(function(){
						resources.GET('/user/fakeId/moments', { /* no pageNumber */}, function(err, resp){
							chai.expect(err).to.be.null;
							var resJSON = JSON.parse(resp.text);
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
							chai.expect(resJSON).to.have.property('params');
						});
					})
			});

			it("Should get invalid params error if we dont supply all parameters when creating a moment comment", function(done){
				resources.ensureTestUserAuthorized()
					.then(function(something){
						resources.POST('/moment/ID/comment', {}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

							//we should have the following missing parameters, according the API spec
							chai.expect(resJSON).to.have.property('params');
							done();
						});
					})
					.catch(function(err){
						done(err);
					});
			});

		});
	};
};
