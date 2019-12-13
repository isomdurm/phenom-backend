/**  Comment Tests
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 **/

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var requireFromTest = require('require-from').bind(undefined, 'testExports', module);
var errors = require('../api/services/Errors.js');
var Moment = require('moment');
var MomentServices = require('../api/services/MomentServices.js');
var CommentServices = requireFromTest('../api/services/CommentServices.js');
var Config = require('../api/services/Config.js');
var _ = require('underscore');
var Promise = require('bluebird');
var util = require('util');

chai.use(chaiAsPromised);

module.exports = function(resources) {
    return function () {
        var _defaultMomentMode = 0;
        var _stylingMomentMode = 0;

        function _sleep(time) {
            var stop = new Date().getTime();
            while(new Date().getTime() < stop + time) {
                ;
            }
        };

        before(function (next) {
            //init test assets
            _defaultMomentMode = resources.getSails().models.moment.momentModeTypes.TRAINING;
            _stylingMomentMode = resources.getSails().models.moment.momentModeTypes.STYLING;

            resources.ensureAllTheThings()
                .then(function (something) {
                    next();
                })
                .catch(function (err) {
                    console.log(err);
                    next(err);
                });
        });

        //we uploaded stuff to AWS as part of this test, lets make sure we clean this stuff up
        after(function () {
            return resources.getSails().models.moment.find()
                .then(function (moments) {
                    var promises = [];
                    moments.forEach(function (moment) {
                        promises.push(moment.destroy());
                    });

                    return Promise.settle(promises);
                });
        });

        describe("Auto-tagging Tests", function(){
            it("No references in this string -> []", function(){
                return chai.expect(CommentServices.userReferenceAutotag("No references in this string", [], CommentServices._commentAutoTaggingMapper))
                    .to.eventually.have.length(0);
            });

            it("A simple @reference in this string -> ['reference']", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return chai.expect(
                            CommentServices.userReferenceAutotag(util.format("A simple @%s reference in this string", user.username), [], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id,
                                }
                            ]);
                    });
            });

            it("A simple @reference in this string -> ['reference', 'reference2'] (reference2 is manual)", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return resources.getTestUser2()
                            .then(function(user2){
                                return chai.expect(
                                    CommentServices.userReferenceAutotag(util.format("A simple @%s reference in this string", user.username), [
                                        {
                                            referenceType:  resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                            id: user2.id
                                        }
                                    ], CommentServices._commentAutoTaggingMapper))
                                    .to.eventually.deep.equal([
                                        {
                                            referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                            id: user.id,
                                        },
                                        {
                                            referenceType:  resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                            id: user2.id
                                        }
                                    ]);
                            });
                    });
            });

            it("A simple @reference in this string -> ['reference'] (reference is manual)", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return chai.expect(
                            CommentServices.userReferenceAutotag(util.format("A simple @%s reference in this string", user.username), [
                                {
                                    referenceType:  resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id
                                }
                            ], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id
                                }
                            ]);
                    });
            });

            it("A simple @reference, @reference in this string -> ['reference']", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return chai.expect(
                            CommentServices.userReferenceAutotag(util.format("A simple @%s, @%s reference in this string", user.username, user.username), [], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id,
                                }
                            ]);
                    });
            });

            it("A simple @reference1, @reference2 in this string -> ['reference1, reference2']", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return resources.getTestUser2()
                            .then(function(user2){
                                return chai.expect(
                                    CommentServices.userReferenceAutotag(
                                        util.format("A simple @%s, @%s reference in this string", user.username, user2.username),
                                        [], CommentServices._commentAutoTaggingMapper)
                                )
                                    .to.eventually.deep.equal([
                                        {
                                            referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                            id: user.id,
                                        },
                                        {
                                            referenceType:  resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                            id: user2.id
                                        }
                                    ]);
                            });
                    });
            });

            it("A simple @reference. -> ['reference']", function(){
                return resources.getTestUser()
                    .then(function(user) {
                        return chai.expect(
                            CommentServices.userReferenceAutotag(util.format("A simple @%s.", user.username), [], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id,
                                }
                            ]);
                    });
            });

            it("A simple @reference. -> ['reference.'] when account 'reference.' exists", function(){
                var updatedUser = undefined;
                return resources.getTestUser()
                    .then(function(user){
                        return UserServices.updateUser({
                                username: util.format("%s.", user.username)
                            }, user
                        );
                    })
                    .then(function(user){
                        updatedUser = user;
                        return chai.expect(
                            CommentServices.userReferenceAutotag(util.format("A simple @%s.", user.username), [], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id,
                                }
                            ]);
                    })
                    .then(function(){
                        //restore
                        return chai.expect(UserServices.updateUser({
                                username: resources.testUser.username
                            }, updatedUser
                        )).to.eventually.have.property("username", resources.testUser.username);
                    });
            });

            it("A simple @reference. -> ['reference.'] when accounts 'reference.' and 'reference' exists", function() {
                var updatedUser = undefined;
                return resources.getTestUser2()
                    .then(function (user) {
                        return UserServices.updateUser({
                                username: util.format("%s.", resources.testUser.username)
                            }, user
                        );
                    })
                    .then(function (user) {
                        updatedUser = user;

                        return chai.expect(
                            //note user.username is now 'testUser.', resources.getTestUser() will return a user with username 'testUser'
                            CommentServices.userReferenceAutotag(util.format("A simple @%s", user.username), [], CommentServices._commentAutoTaggingMapper))
                            .to.eventually.deep.equal([
                                {
                                    referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                    id: user.id,  //want the id of the user with username 'testUser.'
                                }
                            ]);
                    })
                    .then(function () {
                        //restore
                        return chai.expect(UserServices.updateUser({
                                username: resources.testUser2.username
                            }, updatedUser
                        )).to.eventually.have.property('username', resources.testUser2.username);
                    });
            });
        });

        var theMomentAuthor = undefined;
        var theCommentAuthor = undefined;
        var moment1Id = undefined;
        var moment2Id = undefined;

        describe('createMomentComment()', function(){
            it("First create some moments", function() {
                //first lets create a bunch of moments
                return resources.getTestUser()
                    .then(function (user) {
                        theMomentAuthor = user;

                        return resources.getTestUser2();
                    })
                    .then(function (user) {
                        theCommentAuthor = user;

                        return MomentServices.createMoment(
                            _defaultMomentMode,
                            [resources.testProductInternalId],
                            resources.testMoment.headline,
                            resources.getImagePath(),
                            {/* no cropping rect */},
                            "song",
                            new Date(),
                            [],
                            theMomentAuthor);
                    })
                    .then(function (momentBundle) {
                        chai.expect(momentBundle.moment).to.not.be.undefined;
                        moment1Id = momentBundle.moment.id;

                        _sleep(1000);

                        return MomentServices.createMoment(
                            _defaultMomentMode,
                            [resources.testProductInternalId],
                            resources.testMoment.headline,
                            resources.getImagePath(),
                            {/* no cropping rect */},
                            "song",
                            new Date(),
                            [],
                            theMomentAuthor);
                    })
                    .then(function (momentBundle) {
                        chai.expect(momentBundle.moment).to.not.be.undefined;
                        moment2Id = momentBundle.moment.id;
                    });
            });

            it("Moment should have 'commentCount' property", function(){
                return resources.getSails().models.moment.findOne({
                    id: moment1Id
                })
                    .then(function(moment){
                        chai.expect(moment).to.not.be.undefined;
                        chai.expect(moment).to.have.property('commentCount', 0);
                    });
            });

            it('Create a comment', function(){
                return CommentServices.createComment(
                    "This is a moment comment",
                    resources.getSails().models.comment.commentTypes.MOMENT,
                    moment1Id,
                    [{
                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                        id: theMomentAuthor.id
                    }],
                    theCommentAuthor
                )
                    .then(function(comment){
                        chai.expect(comment).to.not.be.undefined;

                        return resources.getSails().models.commentreference.find({
                            sourceComment: comment.id
                        })
                            .then(function(commentReferences){
                                chai.expect(commentReferences).to.have.length(1);
                                chai.expect(commentReferences[0]).to.have.property('sourceComment', comment.id);
                                chai.expect(commentReferences[0]).to.have.property('type', resources.getSails().models.commentreference.commentReferenceTypes.USER);
                                chai.expect(commentReferences[0]).to.have.property('targetUser', theMomentAuthor.id);

                                //create more comments for future tests
                                return CommentServices.createComment(
                                    "This is another moment comment",
                                    resources.getSails().models.comment.commentTypes.MOMENT,
                                    moment2Id,
                                    [{   //user 2 tagged the moment author (user1) in a comment
                                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                        id: theMomentAuthor.id
                                    }],
                                    theCommentAuthor
                                );
                            })
                            .then(function(newComment){
                                chai.expect(newComment).to.not.be.undefined;

                                return CommentServices.createComment(
                                    "This is another moment comment for the same moment, we like comments. comments. comments. comments.",
                                    resources.getSails().models.comment.commentTypes.MOMENT,
                                    moment2Id,
                                    [{   //user 2 tagged the moment author (user1) in a comment
                                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                                        id: theMomentAuthor.id
                                    }],
                                    theCommentAuthor
                                );
                            });
                    });
            });

            it("Malformed comment references are properly handled", function() {
                return CommentServices.createComment(
                    "This is a moment comment with malformed references",
                    resources.getSails().models.comment.commentTypes.MOMENT,
                    moment1Id,
                    [{
                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                        REQUIREDKEYIDMISSING: theMomentAuthor.id
                    }],
                    theCommentAuthor
                )
                    .then(function (commentId) {
                        chai.expect(commentId).to.not.be.undefined;

                        return resources.getSails().models.commentreference.find({
                            sourceComment: commentId
                        });
                    })
                    .then(function(commentReferences){
                        chai.expect(commentReferences).to.have.length(0);
                    });
            });
        });

        describe("find-related", function(){
            it("fetchCommentsByDate()", function(){

                return CommentServices.fetchCommentsByDate(moment1Id,
                    resources.getSails().models.comment.commentTypes.MOMENT, Moment().valueOf(), 10, theCommentAuthor)
                    .then(function(results){
                        //there should be 1
                        chai.expect(results).to.have.property('cursor');
                        chai.expect(results).to.have.property('comments');
                        chai.expect(results.comments).to.have.length.above(1);

                        //check that the comment references were supplied as well
                        chai.expect(results.comments[1]).to.have.property('references');
                        chai.expect(results.comments[1].references).to.have.length(1);
                        chai.expect(results.comments[1].references[0]).to.have.property('id', theMomentAuthor.id);
                    });
            });

            it("findCommentById", function(){
                return resources.getSails().models.comment.findOne({
                    targetMoment: moment1Id
                })
                    .then(function(commentDoc) {
                        return CommentServices.findCommentById(commentDoc.id, theCommentAuthor);
                    })
                    .then(function(comment){
                        chai.expect(comment).to.not.be.undefined;
                        chai.expect(comment).to.have.property('id');
                        chai.expect(comment).to.have.property('targetMoment', moment1Id);
                        chai.expect(comment).to.have.property('commentText');
                        chai.expect(comment).to.have.property('flaggedAsInappropriate', false);
                    });
            });
        });

        describe("updateComment()", function(){
            it("Flag as inappropriate", function(){
                return resources.getSails().models.comment.findOne({
                    targetMoment: moment1Id
                })
                    .then(function(commentDoc){
                        //mark the comment as inappropirate
                        return CommentServices.updateComment(commentDoc.id, {
                            flaggedAsInappropriate: true
                        }, theCommentAuthor)
                            .then(function(){
                                return chai.expect(CommentServices.findCommentById(commentDoc.id, theCommentAuthor)).to.be.rejected;
                            })
                            .then(function(){
                                return CommentServices.fetchCommentsByDate(moment1Id,
                                    resources.getSails().models.comment.commentTypes.MOMENT, Moment().valueOf(), 15, theMomentAuthor );
                            })
                            .then(function(results){
                                chai.expect(_.findIndex(results.comments, function(test){
                                    return test.id === commentDoc.id;
                                })).to.equal(-1);
                            });
                    });
            });
        });

        describe("deleteComment()", function(){
            var commentUTId = undefined;

            it("Deleting a moment can only be performed by the comment author (or target owner)", function(){
                //create a comment where the comment author and target author are the same
                return CommentServices.createComment(
                    "This comment will be deleted by unit tests",
                    resources.getSails().models.comment.commentTypes.MOMENT,
                    moment1Id,
                    [{
                        referenceType: resources.getSails().models.commentreference.commentReferenceTypes.USER,
                        id: theMomentAuthor.id
                    }],
                    theMomentAuthor
                )
                    .then(function(comment){
                        commentUTId = comment.id;

                        //now lets try to delete this guy (from theCommentAuthor, who isn't the actualy comment
                        //author in this case, just some other user)
                        return chai.expect(CommentServices.deleteComment(comment.id, theCommentAuthor))
                            .to.be.rejected.and.eventually.have.property('errorMessage',
                                errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS.errorMessage);
                    });
            });

            it("Should be able to delete if we have appropriate access", function(){
               return CommentServices.deleteComment(commentUTId, theMomentAuthor)
                   .then(function(result){
                       chai.expect(result).to.equal(true);

                       return resources.getSails().models.commentreference.find({
                           sourceComment: commentUTId
                       });
                   })
                   .then(function(refs){

                       //they should have been nuked along with the comment
                       chai.expect(refs).to.have.property('length', 0);
                   });
            });
        });

        describe('Comment Controller Tests', function(){
            it("Can only update comments when authorized", function(done){
                resources.PUT('/comment/' + moment1Id , {}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Can only delete comments when authorized", function(done){
                resources.DELETE('/comment/COMMENTID', {}, function(err, res){
                    var resJSON = JSON.parse(res.text);
                    chai.expect(resJSON).to.have.property('errorCode');
                    chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_USER_NOT_AUTHORIZED.errorCode);
                    done();
                });
            });

            it("Should get invalid params error if we dont supply all parameters when updating a moment", function(){
                return resources.ensureTestUserAuthorized()
                    .then(function(){
                        resources.PUT('/comment/COMMENTID', {/*omit the updates param*/}, function(err, res){
                            var resJSON = JSON.parse(res.text);
                            chai.expect(resJSON.errorCode).to.equal(errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS.errorCode);

                            //we should have the following missing parameters, according the API spec
                            chai.expect(resJSON).to.have.property('params');
                        });
                    });
            });
        });
    };
};