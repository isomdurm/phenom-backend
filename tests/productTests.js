/**  Product Tests
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 **/

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var requireFromTest = require('require-from').bind(undefined, 'testExports', module);
var errors = require('../api/services/Errors.js');
var Moment = require('../api/models/product.js');
var ProductServices = require('../api/services/ProductServices.js');
var CommentServices = require('../api/services/CommentServices.js');
var Config = require('../api/services/Config.js');
var _ = require('underscore');
var Promise = require('bluebird');
var util = require('util');

chai.use(chaiAsPromised);

module.exports = function(resources) {
    return function () {
        before(function (next) {
            resources.ensureAllTheThings()
                .then(function() {
                    next();
                })
                .catch(function (err) {
                    console.log(err);
                    next(err);
                });
        });

        describe('Product Model Tests', function() {
            it("getJSON() - Product should have 'commentCount' property", function () {
                return resources.getTestUser()
                    .then(function (testUser) {
                        return resources.getTestProduct()
                            .then(function (testProduct) {
                                return testProduct.getJSON(testUser, testUser);
                            })
                            .then(function (testProductJSON) {
                                chai.expect(testProductJSON).to.not.be.undefined;
                                chai.expect(testProductJSON).to.have.property('commentCount', 0);
                            });
                    });
            });
        });

        describe('Product Services Tests', function(){
            var testUser1 = undefined;
            var testUser2 = undefined;
            var testProduct1 = undefined;
            var testProduct2 = undefined;

            //lets make sure that we have some products to work with
            before(function(next){
                resources.getTestUser().then(function(testUser){
                    testUser1 = testUser;
                    return resources.getTestUser2();
                }).then(function(testUser){
                    testUser2 = testUser;
                    return resources.getTestProduct();
                }).then(function(testProduct){
                    testProduct1 = testProduct;
                    return resources.getTestProduct2();
                }).then(function(testProduct){
                    testProduct2 = testProduct;
                    next();
                }).catch(function(err){
                    next(err);
                });
            });

            it('Create a comment', function() {
                return ProductServices.createComment(
                    testProduct1.id,
                    "This is a product comment",
                    [{
                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                        id: testUser2.id
                    }],
                    testUser1
                ).then(function(comment){
                    chai.expect(comment).to.not.be.undefined;

                    return resources.getSails().models.commentreference.find({
                        sourceComment: comment.id
                    }).then(function(commentReferences){
                        chai.expect(commentReferences).to.have.length(1);
                        chai.expect(commentReferences[0]).to.have.property('sourceComment', comment.id);
                        chai.expect(commentReferences[0]).to.have.property('type', resources.getSails().models.commentreference.commentReferenceTypes.USER);
                        chai.expect(commentReferences[0]).to.have.property('targetUser', testUser2.id);}
                    ).then(function() {
                        return testProduct1.getJSON(testUser1, testUser1);
                    })
                    .then(function(testProductJSON) {
                        chai.expect(testProductJSON).to.not.be.undefined;
                        chai.expect(testProductJSON).to.have.property('commentCount', 1);
                        chai.expect(testProductJSON).to.have.deep.property('mostRecentComments.length', 1);
                    })

                });
            });

            it("Should NOT be able to delete if we do NOT have appropriate access", function() {
                return ProductServices.getComments(testProduct1.id, Date.now(), 1, testUser1).then(function (comments) {
                    return chai.expect(ProductServices.deleteComment(comments.comments[0], testUser2)).to.eventually
                        .be.rejected;
                });
            });

            it('Delete product comment shall decrement commentCount',  function(){
                return ProductServices.getComments(testProduct1.id, Date.now(), 1, testUser1).then(function(comments){
                    chai.expect(comments).to.have.deep.property('comments[0].id');
                    return ProductServices.deleteComment(comments.comments[0], testUser1);
                }).then(function(){
                    return testProduct1.getJSON(testUser1, testUser1);
                }).then(function(productJSON){
                    chai.expect(productJSON).to.have.property('commentCount', 0);
                });
            });

            it("Malformed product comment references are properly handled", function() {
                return ProductServices.createComment(
                    testProduct1.id,
                    "This is a moment product with malformed references",
                    [{
                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                        REQUIREDKEYIDMISSING: 'blah'
                    }],
                    testUser1
                ).then(function (commentId) {
                    //comment should have succeeded, reference not so much
                    chai.expect(commentId).to.not.be.undefined;

                    return resources.getSails().models.commentreference.find({
                        sourceComment: commentId
                    });
                }).then(function(commentReferences){
                    chai.expect(commentReferences).to.have.length(0);
                });
            });
        });

        describe('Product Controller Tests', function(){
            it("Can only create product comments when authorized", function(done){
                resources.getTestProduct()
                    .then(function(testProduct){
                        resources.POST(util.format('/product/%s/comment', testProduct.id), {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                            done();
                        });
                    })
                    .catch(function(err){
                        done(err);
                    });
            });

            it("Can only search for product comments when authorized", function(done){
                resources.getTestProduct()
                    .then(function(){
                        resources.GET('/product', {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                            done();
                        });
                    })
                    .catch(function(err){
                        done(err);
                    });
            });

            it("Can only get product comments when authorized", function(done){
                resources.getTestProduct()
                    .then(function(testProduct){
                        resources.GET(util.format('/product/%s/comments', testProduct.id), {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                            done();
                        });
                    })
                    .catch(function(err){
                        done(err);
                    });
            });

            it("Can only create product comments when params supplied", function(done){
                resources.ensureTestUserAuthorized()
                    .then(function(){
                        return resources.getTestProduct();
                    })
                    .then(function(testProduct){
                        resources.POST(util.format('/product/%s/comment', testProduct.id), {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                            done();
                        });
                    })
                    .catch(function(err){
                        done(err);
                    });
            });

            it("Can only search for product when params supplied", function(done){
                resources.ensureTestUserAuthorized()
                    .then(function(){
                        return resources.getTestProduct();
                    })
                    .then(function(){
                        resources.GET('/product', {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
                            done();
                        });
                    })
                    .catch(function(err){
                        done(err);
                    });
            });

            it("Can only get product comments when params supplied", function(done){
                resources.ensureTestUserAuthorized()
                    .then(function(){
                        return resources.getTestProduct();
                    })
                    .then(function(testProduct){
                        resources.GET(util.format('/product/%s/comments', testProduct.id), {}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON).to.have.property('errorCode');
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);
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