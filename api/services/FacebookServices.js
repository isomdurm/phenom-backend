/**
 *
 * Facebook Services
 *
 * @module      :: FacebookServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides Facebook Graph-API related support
 *
 **/
var Promise = require('bluebird');
var _ = require('lodash');
var graphAPI = require('fbgraph');

function _init(){
    graphAPI.setVersion(Config.Facebook.APIVersion);
    graphAPI.setAppSecret(Config.Facebook.clientSecret);
}

function _findPhenomUsers(accessToken, pageNumber){
    return new Promise(function(resolve, reject){
        graphAPI.get("/me/friends", {
            access_token: accessToken,
            offset: (pageNumber - 1) * Config.Facebook.defaultPageSize,
            limit: Config.Facebook.defaultPageSize
        }, function(err, result){
            if(err){
                reject(err);
            }
            else{
                resolve(result);
            }
        });
    });
}

function _postMoment(accessToken, momentId, userPerformingAction){
    return Moment.findOne({
        id: momentId
    })
    .then(function(moment){

        if(!moment){
            throw new Error("No moment found with id:  " + momentId);
        }

        return moment.toJSON(true, userPerformingAction, userPerformingAction).then(function(hydratedMoment){
            return new Promise(function(resolve, reject){
                graphAPI.post("/me/photos", {
                    access_token: accessToken,
                    url:          hydratedMoment.imageUrlCropped,
                    caption:      hydratedMoment.headline
                }, function(err, result){

                    if(err){
                        return reject(err);
                    }

                    resolve(result);
                });
            });
        });
    });
}

module.exports = {
    init: _init,
    findPhenomUsers: _findPhenomUsers,
    postMoment: _postMoment
};