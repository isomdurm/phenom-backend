 /**
 *
 * ChangePassword Service
 *
 * @module      :: UserController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides endpoint services for forgot/change password workflow including request via email, and change
 * by web form.
 *
 **/

/*
	globals User
 */

var Promise = require('bluebird');
var guid = require('node-uuid');

function _getResetKey(){
	return guid.v4();
};

function _getUserDocumentByEmail(email){
	return new Promise(function(resolve, reject){
		User.findOne({email: email.toLowerCase()})
			.then(function(userDoc){
				if(!userDoc){
					var error = new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_EMAIL_NOT_FOUND);
					error.email = email;
					reject(error);
				}
				else{
					resolve(userDoc);
				}
			})
			.catch(function(err){
				reject(err);
			});
	});
}

function _getUserPrivateDocumentByToken(token){
	return new Promise(function(resolve, reject){
		UserPrivate.findOne({forgotPasswordToken: token})
			.then(function(userPrivateDoc){
				if(!userPrivateDoc){
					reject(new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN));
				}
				else{
					resolve(userPrivateDoc);
				}
			})
			.catch(function(err){
				reject(err);
			});
	});
}

 /**
  * Generates and returns a new 'forgot password' reset token
  *
  * @param userPrivateDoc
  * @returns Promise resolving to the "forgotPasswordToken" for this user
  * @private
  */
function _setResetToken(userPrivateDoc){
	userPrivateDoc.forgotPasswordToken = _getResetKey();
	userPrivateDoc.forgotPasswordTokenTimestamp = new Date();
	return userPrivateDoc.save()
		.then(function(savedPrivateDoc){
			return Promise.resolve(savedPrivateDoc.forgotPasswordToken);
		});
}

function _clearResetToken(userPrivateDoc){
	userPrivateDoc.forgotPasswordToken = "";
	userPrivateDoc.forgotPasswordTokenTimestamp = new Date(0);
	return userPrivateDoc.save();
}

function _generateChangePasswordUrl(baseUrl, resetToken){
	//strip https://
	var url = baseUrl.replace('https://', '').replace('http://', '');

	return "".concat(url, "/support/resetPassword?token=", resetToken);
}

function _resetPasswordRequest(email, baseUrl, supressEmail){
	var user = undefined;

	return _getUserDocumentByEmail(email)
	.then(function(userDoc){
		user = userDoc;

		return UserPrivate.findOne({'userId' : userDoc.id});
	})
	.then(function(userPrivateDoc){
		if(!userPrivateDoc){
			var error = new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_EMAIL_NOT_FOUND);
			error.email = email;
			throw error;
		}
		else{
			return _setResetToken(userPrivateDoc);
		}
	})
	.then(function(resetToken){
		if(!supressEmail){
			return EmailServices.sendResetPasswordEmail(user, _generateChangePasswordUrl(baseUrl, resetToken));
		}

		return Promise.resolve();
	});
};

function _changePasswordFormSubmit(token, newPassword){
	var userPrivateDoc = undefined;

	//We don't want to use our normal parameter validation logic because we're not speaking
	//to an iOS client, rather hosting a page.
	return _getUserPrivateDocumentByToken(token)
	.then(function(privateDoc){
		//get the new password from the form and set it
		privateDoc.password = newPassword;

		//cache this for later
		userPrivateDoc = privateDoc;

		return privateDoc.save();
	}).
	then(function(){
		//lets zero out this users's 
		return _clearResetToken(userPrivateDoc);
	})
	.then(function(){
		return Promise.resolve();
	});
};

function _changePasswordFormRender(token){
	return new Promise(function(resolve, reject){
		//first lets make sure that the token is valid
		_getUserPrivateDocumentByToken(token)
			.then(function(userPrivateDoc){
				//make sure that this request hasn't expired
				if((new Date()).getTime() - userPrivateDoc.forgotPasswordTokenTimestamp.getTime() < Config.passwordReset.tokenLifetime)
				{
					resolve();
				}
				else{
					reject(Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
				}
			})
			.catch(function(err){
				reject(err);
			});
	});
};

function _forgotPhenomIdRequest(email){
	return _getUserDocumentByEmail(email)
		.then(function(userDoc){
			if(!userDoc){
				var error = new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_EMAIL_NOT_FOUND);
				error.email = email;
				throw error;
			}
			else{
				return EmailServices.sendForgotPhenomIdEmail(userDoc);
			}
		});
}

module.exports = {
	sendResetPasswordRequest: _resetPasswordRequest,

	sendForgotPhenomIdRequest: _forgotPhenomIdRequest,

	renderChangePasswordForm: function(token){
		return _changePasswordFormRender(token);
	},
	handleChangePasswordFormSubmit: function(token, newPassword){
		return _changePasswordFormSubmit(token, newPassword);
	}
};