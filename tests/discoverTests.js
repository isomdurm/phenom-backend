/**  Tests Discover Support
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');
var Config = require('../api/services/Config.js');
var _ = require('lodash');
var MomentServices = require('../api/services/MomentServices.js');
var UserServices = require('../api/services/UserServices.js');
var DiscoverServices = require('../api/services/DiscoverServices.js');
var Promise = require('bluebird');

module.exports = function(resources){
    return function(){

        before(function(next){
            var user1 = undefined;
            var user2 = undefined;
            resources.ensureAllTheThings()
                .then(function(){
                   return resources.getTestUser();
                })
                .then(function(testUser){
                    user1 = testUser;
                    return MomentServices.createMoment(
                        resources.getSails().models.moment.momentModeTypes.TRAINING,
                        [resources.testProductInternalId],
                        resources.testMoment.headline,
                        resources.getImagePath(),
                        {/* no cropping rect */},
                        "song",
                        new Date(),
                        [],
                        user1);
                })
                .then(function(){
                    return MomentServices.createMoment(
                        resources.getSails().models.moment.momentModeTypes.TRAINING,
                        [resources.testProductInternalId],
                        resources.testMoment.headline,
                        resources.getImagePath(),
                        {/* no cropping rect */},
                        "song",
                        new Date(),
                        [],
                        user1);
                })
                .then(function(){
                    return MomentServices.createMoment(
                        resources.getSails().models.moment.momentModeTypes.TRAINING,
                        [resources.testProductInternalId],
                        resources.testMoment.headline,
                        resources.getImagePath(),
                        {/* no cropping rect */},
                        "song",
                        new Date(),
                        [],
                        user1);
                })
                .then(function(){
                    return resources.getTestUser2();
                })
                .then(function(testUser2) {
                    user2 = testUser2;
                    return UserServices.follow(user1.id, user2);
                })
                .then(function() {
                    next();
                })
                .catch(function(err){
                    next(err);
                });
        });

        //we uploaded stuff to AWS as part of this test, lets make sure we clean this stuff up
        after(function(next){
            resources.getSails().models.moment.find()
                .then(function(moments) {
                    var promises = [];
                    moments.forEach(function (moment) {
                        promises.push(moment.destroy());
                    });

                    return Promise.settle(promises);
                })
                .then(function(results){
                    next();
                })
                .catch(function(err){
                    //just keep going
                    next();
                });
        });


        describe("Discover Controller Tests", function(){

            it("Can only get discover people results when authorized", function(done){
                resources.GET('/discover/people', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting discover people results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/people', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });

            it("Can only get discover gear results when authorized", function(done){
                resources.setBearerToken('', '');
                resources.GET('/discover/gear', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting discover gear results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/gear', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });

            it("Can only get discover music results when authorized", function(done){
                resources.setBearerToken('', '');
                resources.GET('/discover/music', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting discover music results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/music', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });

            it("Can only get featured people results when authorized", function(done){
                resources.setBearerToken('', '');
                resources.GET('/discover/people/featured', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting featured people results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/people/featured', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });

            it("Can only get featured gear results when authorized", function(done){
                resources.setBearerToken('', '');
                resources.GET('/discover/gear/featured', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting featured gear results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/gear/featured', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });

            it("Can only get featured moment results when authorized", function(done){
                resources.setBearerToken('', '');
                resources.GET('/discover/moment/featured', {pageNumber: 1}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when requesting featured moment results", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.GET('/discover/moment/featured', {/*omit the pageNumber param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');

                            return Promise.resolve();
                        });
                    });
            });
        });

        describe("Discover Services Tests", function(){

            it("Should be able to get default results for people in descending order by followers count, for user 1", function() {

                var testUser1 = undefined;
                return resources.getTestUser()
                    .then(function (user) {
                        testUser1 = user;
                        return DiscoverServices.getDefaultDiscoverPeople(user, 1);
                    })
                    .then(function (results) {
                        chai.expect(results).to.have.length(2);
                        chai.expect(results[0]).to.have.property('id');
                        chai.expect(results[0].id).to.equal(testUser1.id);
                        chai.expect(results[0]).to.have.property('mostRecentMoments').to.have.length(3);

                        return Promise.resolve();
                    });
            });

            it("Should be able to get default results for people in descending order by followers count, for user 2", function(){

                var testUser2 = undefined;
                return resources.getTestUser2()
                    .then(function(user){
                        testUser2 = user;
                        return DiscoverServices.getDefaultDiscoverPeople(user, 1);
                    })
                    .then(function(results){
                        chai.expect(results).to.have.length(2);
                        chai.expect(results[1]).to.have.property('id');
                        chai.expect(results[1].id).to.equal(testUser2.id);
                        chai.expect(results[1]).to.have.property('userFollows');
                        chai.expect(results[1].userFollows).to.equal(false);
                        chai.expect(results[1]).to.have.property('mostRecentMoments').to.have.length(0);

                        return Promise.resolve();
                    });
            });

            it("Should be able to get default results for gear in descending order by lockerCount", function(){

                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(testUser){
                        testUser1 = testUser;

                        return DiscoverServices.getDefaultDiscoverGear(testUser1, 1);
                    })
                    .then(function(results){
                        chai.expect(results).to.have.length(2);
                        chai.expect(results[0]).to.have.property('existsInLocker');
                        chai.expect(results[0].existsInLocker).to.equal(true);
                        chai.expect(results[0].id).to.equal(resources.testProductInternalId);
                        chai.expect(results[1].id).to.equal(resources.testProductInternalId2);

                        return Promise.resolve();
                    });
            });

            it('Should not get back default discover gear with an invalid page number', function(){
                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;

                        return DiscoverServices.getDefaultDiscoverGear(testUser1, 0);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDefaultDiscoverGear(testUser1, -1);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDefaultDiscoverGear(testUser1, 1000000);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                    });
            });

            it("Should be able to get default results for music", function(){

                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(testUser){
                        testUser1 = testUser;
                        return DiscoverServices.getDefaultDiscoverMusic(testUser1, 1);
                    })
                    .then(function(results){
                        chai.expect(results).to.be.an.array;

                        return Promise.resolve();
                    });
            });

            it('Should not get back default music with an invalid page number', function(){
                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;

                        return DiscoverServices.getDefaultDiscoverMusic(testUser1, 0);
                    })
                    .then(function(results){
                        //we're actually not sure what spotify does with page numbers that do not make sense,
                        //usually they seem to just give you the last page's data, so as long as were getting here
                        //with some array, and throwing and error, we should be good.
                        chai.expect(results).to.not.be.undefined;
                        return DiscoverServices.getDefaultDiscoverMusic(testUser1, -1);
                    })
                    .then(function(results){
                        //we're actually not sure what spotify does with page numbers that do not make sense,
                        //usually they seem to just give you the last page's data, so as long as were getting here
                        //with some array, and throwing and error, we should be good.
                        chai.expect(results).to.not.be.undefined;
                        return DiscoverServices.getDefaultDiscoverMusic(testUser1, 100000);
                    })
                    .then(function(results){
                        //we're actually not sure what spotify does with page numbers that do not make sense,
                        //usually they seem to just give you the last page's data, so as long as were getting here
                        //with some array, and throwing and error, we should be good.
                        chai.expect(results).to.not.be.undefined;
                    });
            });

            it('Should be able to get featured users in descending order by follower count ', function(){
                //lets make users 1 and 2 'featured'
                var testUser1 = undefined;
                var testUser2 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;
                        testUser1.featured = true;

                        return testUser1.save();
                    })
                    .then(function(){
                        return resources.getTestUser2();
                    })
                    .then(function(user){
                        testUser2 = user;
                        testUser2.featured = true;
                        return testUser2.save();
                    })
                    .then(function(){
                        return DiscoverServices.getDiscoverFeaturedPeople(testUser1, 1);
                    })
                    .then(function(featuredUsers){
                        chai.expect(featuredUsers).to.have.length(2);
                        chai.expect(featuredUsers[0].id).to.equal(testUser1.id);
                        chai.expect(featuredUsers[0]).to.have.property('mostRecentMoments').to.have.length(3);
                    });
            });

            it('Should not get back featured users with an invalid page number', function(){
                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;

                        return DiscoverServices.getDiscoverFeaturedPeople(testUser1, 0);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedPeople(testUser1, -1);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedPeople(testUser1, 1000000);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                    });
            });

            it('should be able to get featured products in descending order by locker count', function(){
                var testUser1 = undefined;
                var testProduct1 = undefined;
                var testProduct2 = undefined;

                return resources.getTestUser().then(function(testUser) {
                    testUser1 = testUser;

                    return resources.getTestProduct();
                })
                .then(function(product){
                    testProduct1 = product;
                    return resources.getSails().models.productmetadata.findOne({
                        product: testProduct1.id
                    });
                })
                .then(function(productMetadata){
                    chai.expect(productMetadata).to.not.be.undefined;
                    productMetadata.featured = true;
                    return productMetadata.save();
                })
                .then(function(){
                    return resources.getTestProduct2();
                })
                .then(function(product) {
                    testProduct2 = product;
                    return resources.getSails().models.productmetadata.findOne({
                        product: testProduct2.id
                    });
                })
                .then(function(productMetadata){
                     chai.expect(productMetadata).to.not.be.undefined;
                     productMetadata.featured = true;
                     return productMetadata.save();
                })
                .then(function(){
                    return DiscoverServices.getDiscoverFeaturedGear(testUser1, 1);
                })
                .then(function(results){
                    chai.expect(results).to.have.length(2);
                    chai.expect(results[0]).to.have.property('existsInLocker');
                    chai.expect(results[0].existsInLocker).to.equal(true);
                    chai.expect(results[0].id).to.equal(resources.testProductInternalId);
                    chai.expect(results[1].id).to.equal(resources.testProductInternalId2);

                    return Promise.resolve();
                });
            });


            it('Should not get back featured products with an invalid page number', function(){
                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;

                        return DiscoverServices.getDiscoverFeaturedGear(testUser1, 0);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedGear(testUser1, -1);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedGear(testUser1, 1000000);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                    });
            });

            it('Should be able to get featured moments in descending order by data', function(){
                var testUser1 = undefined;

                return resources.getSails().models.moment.find()
                .then(function(moments){
                    var promises = [];
                    //lets mark the first 2 as featured
                    _.slice(moments, 0, 2).forEach(function(moment){
                        moment.featured = true;
                        promises.push(moment.save());
                    });

                    return Promise.settle(promises);
                })
                .then(function() {
                    return resources.getTestUser();
                })
                .then(function(user){
                    testUser1 = user;

                    //assume all went well
                    return DiscoverServices.getDiscoverFeaturedMoments(testUser1, 1);
                })
                .then(function(featuredMoments){
                    chai.expect(featuredMoments.length).to.equal(2);
                    chai.expect(featuredMoments[0].createdAt).to.be.above(featuredMoments[1].createdAt);
                });
            });

            it('Should not get back featured moments with an invalid page number', function(){
                var testUser1 = undefined;

                return resources.getTestUser()
                    .then(function(user){
                        testUser1 = user;

                        return DiscoverServices.getDiscoverFeaturedMoments(testUser1, 0);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedMoments(testUser1, -1);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                        return DiscoverServices.getDiscoverFeaturedMoments(testUser1, 1000000);
                    })
                    .then(function(results){
                        chai.expect(results.length).to.equal(0);
                    });
            });
        });
    };
};
