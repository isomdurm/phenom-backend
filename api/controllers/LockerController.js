/**
 *
 * Locker Controller
 *
 * @module      :: LockerController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines Phenom API endpoints to access user Locker functionality
 *
 **/

/*
    globals ProductServices, Output, LockerServices, Validation
 */

function _find(req, res){
    var missingParams = Validation.validateParams(req, [
        "products"]);

    if(missingParams.length > 0){
        return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    //Lets make sure that we have a user for this Bearer
    if(!(req.user)){
        sails.log.error("Failed to find mongo user for locker search, request object doesn't have user model instance");
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }

    ProductServices.getProducts(req.param('products'), req.user.id, req.user.id).
        then(function(products){
            Output.sendJSON(res, Errors.noError, {'results': products});
        })
        .catch(function(err){
            sails.log.error('Failed to find mongo user for locker search', {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
        });
}

function _destroy(req, res){
    var missingParams = Validation.validateParams(req, [
        "products"]);

    if(missingParams.length > 0){
        return Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    //Lets make sure that we have a user for this Bearer
    if(!(req.user)){
        sails.log.error("Failed to find mongo user for locker search, , Request object doesn't have user model instance");
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }

    LockerServices.removeProducts(req.param('products'), req.user)
        .then(function(removedIds){
            Output.sendJSON(res, Errors.noError, {removed: removedIds});
        })
        .catch(function(err){
            sails.log.error('Failed to remove products from users locker', {error:  err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_DELETE);
        });
}

function _update(req, res){
    var missingParams = Validation.validateParams(req, [
        "product"]);

    if(missingParams.length > 0){
      return  Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
    }

    //Lets make sure that we have a user for this Bearer
    if(!(req.user)){
        sails.log.error("Failed to find mongo user for locker search, Request object doesn't have user model instance");
        return Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_FIND);
    }

    LockerServices.addProduct(req.param('product'), req.user).
        then(function(products){
            Output.sendJSON(res, Errors.noError, {'results': products});
        })
        .catch(function(err){
            sails.log.error('Failed to add product to locker', {error: err});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_UPDATE);
        });
}

module.exports = {
	find:       _find,
    destroy:    _destroy,
    update:     _update
};