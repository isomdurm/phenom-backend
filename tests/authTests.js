 /**
 *
 * Phenom Backend OAuth Tests
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Generates a bundle which can be passed to each controller/service test which
 * provides access to configuration, the models, and http services which can
 * be configured automatically with oauth 
 *
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');

module.exports = function(resources){
	return function(){
		before(function(next){
			resources.ensureTestClient()
			.then(function(){
				return resources.ensureTestUser();
			})
			.then(function(){
				next();
			})
			.catch(function(err){
				next(err);
			});
		});

		describe('OAuth', function(){
			it('Try to authenticate without username and password', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					done();
				});
			});

			it('Try to authenticate without client_id or client_secret', function(done){
				resources.POST('/oauth/token', {
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(412);
					done();
				});
			});

			it('Try to authenticate with wrong username or password', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					username: resources.testUser.username,
					password: resources.testUser.password,  //no base 64
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode', 404);
					done();
				});
			});

			it('Try to authenticate without client_id or client_secret, no base 64', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: resources.clientSecret, //no base 64
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode');
					chai.expect(resJSON.errorCode).to.equal(412);
					done();
				});
			});

			it('Try to authenticate with wrong grant type', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'YAY'
				}, function(err, res){
					var resJSON = JSON.parse(res.text);
					chai.expect(resJSON).to.have.property('errorCode', 501);
					chai.expect(resJSON).to.have.property('error');
					chai.expect(resJSON.error).to.have.property('code', 'unsupported_grant_type');
					chai.expect(resJSON.error).to.have.property("message", "Unsupported grant type: YAY");
					done();
				});
			});

			it('Try to authenticate with correct credentials', function(done){
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

			it('Try to authenticate with refresh_token', function(done){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					refresh_token: resources.refreshToken,
					grant_type: 'refresh_token'
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
	};
};
