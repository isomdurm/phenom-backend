 /**
 *
 * Change PasswordController
 *
 * @module      :: ForgotPasswordController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Servers up the 'Forgot/Change Password' form
 *
 **/

 module.exports = {
 	renderChangePasswordForm: function(req, res){
 		var missingParams = Validation.validateParams(req, [
            "token"]);
  
        if(missingParams.length > 0){
        	//we need something more helpful than invalid params, something like, hey, we didn't recognize this password
        	//reset request
            //Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            Output.renderFailure(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
        }
        else{
 			ChangePassword.renderChangePasswordForm(req.param('token'))
 			.then(function(result){
 				Output.renderDefaultControllerActionView(res, 'CHANGE PASSWORD');
 			})
 			.catch(function(err){
 				if(err.hasOwnProperty('errorCode') && err.errorCode == Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN.errorCode){
					//Provide a helpful response to the user that the token provided with this password change request is
					//not valid (probably due to the user already using it once)
					//Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
                    Output.renderFailure(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
				}
				else{
					//Something went very, very wrong, lets provide a helpful error message
					//Output.sendJSON(res, Errors.serverErrors.ERROR_FAILED_TO_UPDATE_NEW_PASSWORD);
                    Output.renderFailure(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE_NEW_PASSWORD);
				}
 			});
 		}
 	},

 	handleChangePasswordFormSubmit: function(req, res){
 		var missingParams = Validation.validateParams(req, [
            "token", "newPasswordFinal"]);
  
        if(missingParams.length > 0){
        	//we need something more helpful than invalid params, something like, hey, we didn't recognize this password
        	//reset request submission
            //Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
            Output.renderFailure(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
        }
        else{
        	ChangePassword.handleChangePasswordFormSubmit(req.param('token'), Buffer(req.param('newPasswordFinal'), 'base64').toString('utf8'))
        	.then(function(result){
        		//Output.sendJSON(res, Errors.noError, result);
                Output.renderSuccess(res);
        	})
        	.catch(function(err){
        		if(err.hasOwnProperty('errorCode') && err.errorCode == Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN.errorCode){
					//Provide a helpful response to the user that the token provided with this password change request is
					//not valid (probably due to the user already using it once)
					//Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
                    Output.renderFailure(res, Errors.serverErrors.ERROR_CLIENT_INVALID_PASSWORD_RESET_REQUEST_TOKEN);
				}
				else{
					//Something went very, very wrong, lets provide a helpful error message
					//Output.sendJSON(res, Errors.serverErrors.ERROR_FAILED_TO_UPDATE_NEW_PASSWORD);
                    Output.renderFailure(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE_NEW_PASSWORD);
				}
        	});
        }
 	}
 }