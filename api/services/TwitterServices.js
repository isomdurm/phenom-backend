/**
 *
 * Twitter Services
 *
 * @module      :: TwitterServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides Twitter-API related support
 *
 **/
var Promise = require('bluebird');
var _ = require('lodash');
var twitterAPI = require('node-twitter-api');
var twitter = undefined;
var request = require('request');

function _init(){
    twitter = new twitterAPI({
        consumerKey: Config.Twitter.consumerKey,
        consumerSecret: Config.Twitter.consumerSecret,
        callback: ''  //unused
    });
}

function _postMoment(accessToken, accessTokenSecret, momentId, userPerformingAction){
    return Moment.findOne({
        id: momentId
    })
    .then(function(moment){
        if(!moment){
            throw new Error("No moment found with id:  " + momentId);
        }

        return moment.toJSON(true, userPerformingAction, userPerformingAction).then(function(hydratedMoment){
            request.get({
                url: hydratedMoment.imageUrlCropped,
                encoding: null
            }, function(err, res, imageBody){
                if(err){
                    reject(err);
                }
                else{
                    twitter.uploadMedia({
                        media: new Buffer(imageBody).toString('base64'),
                        isBase64: true
                    }, accessToken, accessTokenSecret, function(err, data, response){
                        if(data
                            && data.hasOwnProperty('errors')
                            && data.errors.hasOwnProperty('length')
                            && data.errors.length > 0)
                        {
                            reject(data.errors[0]);
                        }
                        else if(data.hasOwnProperty('media_id_string')){
                            //now create the tweet with the media_id from the previous call
                            twitter.statuses("update", {
                                    status: hydratedMoment.headline,
                                    media_ids: data.media_id_string
                                },
                                accessToken,
                                accessTokenSecret,
                                function(error, data1, response1) {
                                    if (error) {
                                        reject(err);
                                    } else {
                                        resolve(data1);
                                    }
                                }
                            );
                        }
                        else{
                            reject(new Error('Unrecognized reponse from Twitter when uploading image'));
                        }
                    });
                }
            });
        });
    });
}

module.exports = {
    init: _init,
    postMoment: _postMoment
};