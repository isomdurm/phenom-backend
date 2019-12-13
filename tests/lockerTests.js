/**  Tests Locker Support
 *   
 * @author      :: Isom Durm (isom@phenomapp.com)
 *  
 **/

var chai = require('chai');
chai.use(require('chai-as-promised'));
var errors = require('../api/services/Errors.js');
var Config = require('../api/services/Config.js');
var _ = require('underscore');

/*
	globals ProductServices
 */

module.exports = function(resources){
	return function(){
		before(function(next){
			resources.ensureAllTheThings()
			.then(function(){
				next();
			})
			.catch(function(err){
				next(err);
			});
		});

 		describe('Locker Service Tests', function(){
 			it("Should be able to get a product in the test user's locker by id", function(done){
 				resources.getTestUser()
 				.then(function(user){
 					return ProductServices.getProducts([resources.testProductInternalId], user, user);
 				})
 				.then(function(products){
 					chai.expect(products.length).to.equal(1);
 					chai.expect(products[0].hasOwnProperty('id')).to.be.true;
 					chai.expect(products[0].id).to.equal(resources.testProductInternalId);
 					done();
 				})
 				.catch(function(err){
 					done(err);
 				});
 			});

 			it("Should get back empty array when deleting a product from a locker that isn't associated with said locker", function(done){
 				resources.getTestUser()
 				.then(function(user){
 					return LockerServices.removeProducts('9709384701928370498712039481', user);
 				}).
 				then(function(removedIds){
 					chai.expect(removedIds.length).to.equal(0);
 					done();
 				})
 				.catch(function(err){
 					done(err);
 				});
 			});

 			it("Should be able to remove a product from the users locker", function(done){
 				resources.getTestUser()
 				.then(function(user){
 					return LockerServices.removeProducts(resources.testProductInternalId, user);
 				}).
 				then(function(removedIds){
 					chai.expect(removedIds.length).to.equal(1);
 					chai.expect(removedIds[0]).to.equal(resources.testProductInternalId);
 					done();
 				})
 				.catch(function(err){
 					done(err);
 				});
 			});

			it("Should get back empty array when deleting a product that was already deleted", function(done){
				resources.getTestUser()
					.then(function(user){
						return LockerServices.removeProducts(resources.testProductInternalId, user);
					}).
					then(function(removedIds){
						chai.expect(removedIds.length).to.equal(0);
						done();
					})
					.catch(function(err){
						done(err);
					});
			});

 			it("Should be able to add an EXISTING product to the users locker", function(){
				return resources.getTestUser()
					.then(function(user){
						return resources.getTestProduct()
							.then(function(product){
								return LockerServices.addProduct(product, user);
							})
							.then(function(product){
								chai.expect(product.productId).to.equal(resources.testProductInternalId);
							});
					});
 			});

 			it("Should be able to add the same EXISTING product to the users locker", function(){
				return resources.getTestUser()
					.then(function(user){
						return resources.getTestProduct()
							.then(function(product){
								return LockerServices.addProduct(product, user);
							})
							.then(function(product){
								chai.expect(product.productId).to.equal(resources.testProductInternalId);
							});
					});
 			});

 			it("Shouldn't be able to add a malformed product to the users locker", function(){
 				return resources.getTestUser()
 				.then(function(user){
 					var malformedProduct = {
 						fakeKey: '',
 						fakeKey2: ''
 					};

 					return chai.expect(LockerServices.addProduct(malformedProduct, user)).to.eventually.be.rejected;
 				});
 			});

			it("Should be able to get products in the test user's locker by page", function(){
				var user = undefined;

				return resources.getTestUser()
					.then(function(thisUser){
						user = thisUser;
						return LockerServices.getProducts(user.id, Date.now(), 20, user);
					})
					.then(function(results){
						chai.expect(results).to.have.property('products');
						chai.expect(results.products.length).to.equal(2);
						chai.expect(results.products[0]).to.have.property('id');
						chai.expect(results.products[0]).to.have.property('lockerCount');
						chai.expect(results.products[0].id).to.equal(resources.testProductInternalId); //added last, should be first
						chai.expect(results.products[1].id).to.equal(resources.testProductInternalId2);
						chai.expect(results).to.have.property('productCount');
						chai.expect(results).to.have.property('cursor');

						return resources.getSails().models.lockeritem.findOne({
							sourceUser: user.id,
							targetProduct: resources.testProductInternalId,
							entryType: resources.getSails().models.lockeritem.lockerEntryTypes.PRODUCT
						});
					})
					.then(function(lockerEntry){
						chai.expect(lockerEntry).to.not.be.undefined;

						//products added before this date, should only be product '2'
						return LockerServices.getProducts(user.id, lockerEntry.createdAt, 25, user);
					})
					.then(function(results){
						chai.expect(results).to.have.property('productCount');
						chai.expect(results.productCount).to.equal(2);
						chai.expect(results).to.have.property('products');
						chai.expect(results.products.length).to.equal(1);
						chai.expect(results.products[0].id).to.equal(resources.testProductInternalId2);
					});
			});


            it("Product should exist in locker", function(done){
                resources.getTestUser()
                    .then(function(thisUser){
                        return LockerServices.attachExistsInLocker(resources.testProduct , thisUser);
                    }).
                    then(function(product){
                        chai.expect(product).to.have.property('existsInLocker', true);
                        done();
                    })
                    .catch(function(err){
                        done(err);
                    })
            });

			it("Product should NOT exist in locker", function(done) {
				resources.getTestUser()
					.then(function (thisUser) {
						return resources.getTestProduct2()
							.then(function (testProduct2) {
								return LockerServices.removeProducts([testProduct2.id], thisUser)
									.then(function () {
										return testProduct2.getJSON(thisUser, thisUser);
									})
									.then(function (product) {
										chai.expect(product).to.have.property('existsInLocker', false);
										done();
									});
							});
					})
					.catch(function (err) {
						done(err);
					});
			});
		});

		describe('Locker Controller Tests', function(){
			it('Should get back unauthorized user error when trying to remove products from a locker', function(done){
				resources.DELETE('/locker', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it('Should get back unauthorized user error when trying to add products to a locker', function(done){
				resources.PUT('/locker', {}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it('Should get back unauthorized user error when trying to access another users locker without being authorized', function(done){
				resources.GET('/user/fakeId/locker', {pageNumber: 1}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
					done();
				});
			});

			it('Should get back a specific error when trying to find products in the users locker and not specifying the product ID', function(done){
				//to do this we need to exercise the actual endpoint
				resources.ensureTestUserAuthorized()
				.then(function(){
					resources.GET('/locker', {}, function(err, res){
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

			it('Should get back a specific error when trying to remove products in the users locker and not specifying the product ID', function(done){
				//to do this we need to exercise the actual endpoint
				resources.ensureTestUserAuthorized()
				.then(function(){
					resources.DELETE('/locker', {}, function(err, res){
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

			it('Should get back a specific error when trying to add products to the users locker and not supplying the product', function(done){
				//to do this we need to exercise the actual endpoint
				resources.ensureTestUserAuthorized()
				.then(function(){
					resources.PUT('/locker', {}, function(err, res){
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

			it('Should get back a specific error when trying to get products from another users locker without specifying the page', function(done){
				//to do this we need to exercise the actual endpoint
				resources.ensureTestUserAuthorized()
					.then(function(){
						resources.GET('/user/fakeId/locker', {/* no pageNumber */}, function(err, res){
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

			it('Should get back a specific error when trying to get products from another users locker with invalid user id', function(done){
				//to do this we need to exercise the actual endpoint
				resources.ensureTestUserAuthorized()
					.then(function(){
						resources.GET('/user/fakeId/locker', {since: 123, limit: 123}, function(err, res){
							var resJSON = JSON.parse(res.text);
							chai.expect(resJSON.errorCode).to.equal(errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND.errorCode);
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
