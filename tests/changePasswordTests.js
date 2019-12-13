 /**
 *
 * Phenom Backend ChangePassword Services Tests
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Test the forgot/change password form logic
 *
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');
var ChangePasswordService = require('../api/services/ChangePassword.js');
var Promise = require('bluebird');
var ConfigService = require('../api/services/config.js');

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

 		function _getUserPrivateDoc(){
			return resources.getSails().models.user.findOne({username: resources.testUser.username})
			.then(function(user){
				return resources.getSails().models.userprivate.findOne({userId: user.id});
			})
			.then(function(userPrivate){
				return Promise.resolve(userPrivate);
			});
		};

		function _getUserPrivateDocByToken(token){
			return resources.getSails().models.userprivate.findOne({forgotPasswordToken: token})
			.then(function(userPrivateDoc){
				return Promise.resolve(userPrivateDoc);
			});
		};

		function _requestResetForm(token){
			//let's make a GET request to see if the form is available
			return new Promise(function(resolve, reject){
				resources.GET('/support/resetPassword', {token: token},
					function(err, res){
						chai.expect(res).to.not.be.null;

						if(err){
							reject(err);
						}
						else{
							resolve(res);
						}
					}
				);
			});
		};

		function _resetFormSubmit(token, newPassword){
			//let's make a GET request to see if the form is available
			return new Promise(function(resolve, reject){
				resources.POST('/support/resetPassword', {token: token, newPasswordFinal: newPassword},
					function(err, res){
						chai.expect(res).to.not.be.null;
						if(err){
							reject(err);
						}
						else{
							resolve(res);
						}
					}
				);
			});
		};

		function _getAccessTokenUsingExistingPassword(){
			return new Promise(function(resolve, reject){
				resources.POST('/oauth/token', {
					client_id: resources.clientId,
					client_secret: Buffer(resources.clientSecret, 'utf8').toString('base64'),
					username: resources.testUser.username,
					password: Buffer(resources.testUser.password, 'utf8').toString('base64'),
					grant_type: 'password'
				}, function(err, res){
					if(err){
						reject(err);
					}
					else{
						var resJSON = JSON.parse(res.text);
						chai.expect(resJSON).to.have.property('access_token');
						resources.setBearerToken(resJSON.access_token, resJSON.refresh_token);

						resolve(resJSON.access_token);
					}
				});
			});
		}

		function _expireResetToken(token){
			return _getUserPrivateDocByToken(token)
				.then(function(userPrivateDoc) {
					var time = userPrivateDoc.forgotPasswordTokenTimestamp.getTime();
					userPrivateDoc.forgotPasswordTokenTimestamp = new Date(time - ConfigService.passwordReset.tokenLifetime - 1000);
					return userPrivateDoc.save();
				})
				.then(function(){
					return Promise.resolve(token);
				});
		}

		describe('Change/Forgot Logic', function(){
			it('Test that after a forgot password request, a login with the current password will invalidate the reset token', 

				function(){
					var _userPrivateDoc = {};

					return ChangePasswordService.sendResetPasswordRequest(resources.testUser.email, 'http://crapURL/', true)
					.then(function(){
						return _getUserPrivateDoc();
					})
					.then(function(userPrivateDoc){
						_userPrivateDoc = userPrivateDoc;
						return _requestResetForm(userPrivateDoc.forgotPasswordToken);
					})
					.then(function(){
						return _getAccessTokenUsingExistingPassword();
					})
					.then(function(){
						return _requestResetForm(_userPrivateDoc.forgotPasswordToken);
					})
					.then(function(result){
						chai.expect(result.body).to.not.be.null;
					});
				}
			);
		});

 		describe('Change/Forgot Logic', function(){
			it('Test that password reset requests expire after 24 hours', 

				function(){
					var _userPrivateDoc = {};

					return ChangePasswordService.sendResetPasswordRequest(resources.testUser.email, 'http://crapURL/', true)
					.then(function(){
						return _getUserPrivateDoc();
					})
					.then(function(userPrivateDoc){
						_userPrivateDoc = userPrivateDoc;
						return _expireResetToken(_userPrivateDoc.forgotPasswordToken);
					})
					.then(function(token){
						return _requestResetForm(token);
					})
					.then(function(result){
						chai.expect(result.body).to.not.be.null;
						chai.expect(result.text).to.contain("support@phenomapp.com");
					});
				}
			);
		});

		describe('Change/Forgot Logic', function(){
			it('Test the happy path', 

				function(){
					var _userPrivateDoc = {};

					return ChangePasswordService.sendResetPasswordRequest(resources.testUser.email, 'http://crapURL/', true)
					.then(function(){
						return _getUserPrivateDoc();
					})
					.then(function(userPrivateDoc){
						_userPrivateDoc = userPrivateDoc;
						return _requestResetForm(userPrivateDoc.forgotPasswordToken);
					})
					.then(function(result){
						chai.expect(result.text).to.not.be.empty;
						chai.expect(result.text).to.not.contain("please contact support@phenomapp.com");
					});
				}
			);
		});

		describe('Change/Forgot Logic', function(){
			it('Test Form Submit without body params', 
				function(){
					return ChangePasswordService.sendResetPasswordRequest(resources.testUser.email, 'http://crapURL/', true)
					.then(function(){
						return _getUserPrivateDoc();
					})
					.then(function(){
						return _resetFormSubmit();
					})
					.then(function(result){
						chai.expect(result.text).to.not.be.empty;
						chai.expect(result.text).to.contain("support@phenomapp.com");
					});
				}
			);
		});

		describe('Change/Forgot Logic', function(){
			it('Test Form Submit happy path', 
				function(){
					return ChangePasswordService.sendResetPasswordRequest(resources.testUser.email, 'http://crapURL/', true)
					.then(function(){
						return _getUserPrivateDoc();
					})
					.then(function(userPrivateDoc){
						return _resetFormSubmit(userPrivateDoc.forgotPasswordToken, new Buffer(resources.testUser.password).toString('base64'));
					})
					.then(function(result){
						chai.expect(result.text).to.not.be.empty;
						chai.expect(result.text).to.not.contain("support@phenomapp.com");
					});
				}
			);
		});

		describe('Change/Forgot Logic', function(){
			it('Test post successful form submit zeros out the current request token',
				function(){
					return _getUserPrivateDoc()
					.then(function(privateDoc){
						chai.expect(privateDoc.forgotPasswordToken).to.equal('');
					});
				}
			);
		});
	};
};
