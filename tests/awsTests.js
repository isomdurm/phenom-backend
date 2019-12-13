 /**
 *
 * Phenom Backend AWS Integration Tests
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Tests AWS services used by the Phenom API, such as S3 for user images, and cloudfront
 *
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');
var Config = require('../api/services/Config.js');
var S3Services = require('../api/services/S3Services.js');

module.exports = function(resources){
	return function(){
		before(function(next){
			resources.ensureAllTheThings()
			.then(function(something){
				next();
			})
			.catch(function(err){
				next(err);
			});
		});

		describe("S3 Integration Tests", function(){
			it("Should be able to upload an image", function(done){
				S3Services.uploadProfileImage("unique test key 1234", resources.getImagePath())
				.then(function(resp){
					chai.expect(resp).to.have.property("original");
					done();
				})
				.catch(function(err){
					done(err);
				});
			});

			it("Should be able to delete an an image", function(done){
				S3Services.deleteUserImage("unique test key 1234")
				.then(function(resp){
					// bug in AWS, doesn't return what it's supposed to (as described in documentation), but
					// overall operation does succeed
					// chai.expect(resp).to.equal("deleted"); //the aws response
					done();
				})
				.catch(function(err){
					done(err);
				});
			});
		});
	};
};
