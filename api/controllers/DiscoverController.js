/**
 *
 * Discover Controller
 *
 * @module      :: DiscoverController
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines Phenom API endpoints to request/update mobile application discover functionality for specific
 * application behaviors
 *
 **/

module.exports = {

    /**
     * Performs and returns DiscoverServices.getDefaultDiscoverPeople results to the request object
     *
     * @param req
     * @param res
     */
    getDefaultDiscoverPeople: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
            "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDefaultDiscoverPeople(req.user, req.param('pageNumber'))
                .then(function(results){
                    console.log(results);
                    sails.log.error(results);
                    sails.log(results);
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                .catch(function(err){
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                });
        }
    },

    /**
     * Performs and returns DiscoverServices.getDefaultDiscoverGear results to the request
     *
     * @param req
     * @param res
     */
    getDefaultDiscoverGear: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
                "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDefaultDiscoverGear(req.user, req.param('pageNumber'))
                .then(function(results){
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                .catch(function(err){
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                });
        }
    },

    /**
     * Used to access the Default Phenom Music search results
     *
     * @param req
     * @param res
     */
    getDefaultDiscoverMusic: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
                "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDefaultDiscoverMusic(req.user, req.param('pageNumber'))
                .then(function(results){
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                .catch(function(err){
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                });
        }
    },

    /**
     * Used to access the Featured Phenoms
     *
     * @param req
     * @param res
     */
    getDiscoverFeaturedPeople: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
                "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDiscoverFeaturedPeople(req.user, req.param('pageNumber'))
                .then(function(results){
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                .catch(function(err){
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                });
        }
    },

    /**
     * Used to access the Featured Gear
     *
     * @param req
     * @param res
     */
    getDiscoverFeaturedGear: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
                "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDiscoverFeaturedGear(req.user, req.param('pageNumber'))
                .then(function(results){
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                .catch(function(err){
                    Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                });
        }
    },

    /**
     * Used to access the Featured Moments
     *
     * @param req
     * @param res
     */
    getDiscoverFeaturedMoments: function(req, res) {
        if(!(req.user)){
            sails.log.error("Request must have user object in order to get discover content", {error: new Error("Request object doesn't have user model instance")});
            Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH);
            return;
        }

        var missingParams = Validation.validateParams(req, [
                "pageNumber"]
        );

        if(missingParams.length > 0){
            Output.sendJSON(res, Errors.clientErrors.ERROR_CLIENT_INVALID_PARAMS, {params: missingParams});
        }
        else{
            DiscoverServices.getDiscoverFeaturedMoments(req.user, req.param('pageNumber'))
                .then(function(results){
                    Output.sendJSON(res, Errors.noError, { results: results, pageNumber: req.param('pageNumber') });
                })
                // .catch(function(err){
                //     Output.sendJSON(res, Errors.serverErrors.ERROR_SERVER_FAILED_TO_SEARCH, {error: err});
                // });
        }
    }
};