/**
 *
 * Authorization Service
 *
 * @module      :: AuthServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Authorization logic implementation
 *
 **/

var Promise = require('bluebird');
var passport = require('passport');
var oauth2orize = require('oauth2orize');
var crypto = require('crypto');
var server = undefined;

function _init(){

    //create our oauth server
    server = oauth2orize.createServer();

    // Exchange username and password for a token
    server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
        var user = undefined;

        User.findOne({ username: username })
            .then(function(thisUser) {
                if (!thisUser) {
                    return done(null, false);
                }

                user = thisUser;
                //get the user's private data
                return UserPrivate.findOne({userId: thisUser.id});
            })
            .then(function(userPrivate){
                if(!userPrivate){
                    return done(null, false);
                }

                userPrivate.comparePassword(Buffer(password, 'base64').toString('utf8'), function(match) {
                    if (!match) {
                        return done(null, false);
                    }

                    var tokenValue = crypto.randomBytes(32).toString('base64');
                    var refreshTokenValue = crypto.randomBytes(32).toString('base64');

                    AccessToken.create({
                        token: tokenValue,
                        client: client.id,
                        user: user.id,
                        type: AccessToken.TokenTypes.PHENOM
                    })
                        .then(function (accessToken) {
                            return RefreshToken.create({
                                token: refreshTokenValue,
                                client: client.id,
                                user: user.id,
                                accessToken: accessToken.id
                            });
                        })
                        .then(function() {
                            //if this user previously mentioned that he/she had forgotten password, but then
                            //successfully logs in with the old password, lets go ahead and revoke that forgot
                            //password token

                            userPrivate.forgotPasswordToken = '';
                            return userPrivate.save();
                        })
                        .then(function () {
                            done(null, tokenValue, refreshTokenValue, {'expires_in': Config.oauth.tokenLifeTime});
                        })
                        .catch(function (err) {
                            throw new Error(err);
                        });
                })
            })
            .catch(function(err){
                done(err);
            });
    }));

    //Exchange a refresh_token, for a new token without reauthorizing with the user
    server.exchange(oauth2orize.exchange.refreshToken(function(client, refreshToken, scope, done) {
        var originalAccessToken =  undefined;
        var originalRefreshToken = undefined;

        RefreshToken.findOne({ token: refreshToken })
            .then(function(token) {
                if (!token) {
                    return done(null, false);
                }
                else{
                    //cache this guy because we'll need his ids later
                    originalRefreshToken = token;

                    AccessToken.findOne({
                        user: token.user,
                        client: client.id,
                        id: originalRefreshToken.accessToken,
                        type: AccessToken.TokenTypes.PHENOM
                    })
                        .then(function(thisToken){
                            if(thisToken){
                                originalAccessToken = thisToken;  //capture the id value

                                //recycle the original tokens so we don't need to update any notification related things
                                var tokenValue = crypto.randomBytes(32).toString('base64');
                                originalAccessToken.token = tokenValue;
                                originalAccessToken.createdAt = new Date();

                                var refreshTokenValue = crypto.randomBytes(32).toString('base64');
                                originalRefreshToken.token = refreshTokenValue;
                                originalRefreshToken.createdAt = new Date();

                                Promise.all([originalAccessToken.save(), originalRefreshToken.save()])
                                    .then(function() {
                                        return done(null, tokenValue, refreshTokenValue, {'expires_in': Config.oauth.tokenLifeTime});
                                    })
                                    .catch(function (err) {
                                        done(err);
                                    });
                            }
                            else{
                                done(null, false);
                            }
                        })
                        .catch(function(err){
                            done(err);
                        });
                }

            })
            .catch(function(err){
                done(err);
            });
    }));

}

function _facebookTokenExchange(accessToken, grantType, refreshToken, profile, client){

    //first lets see if we know who this is
    return User.findOne({
        facebookId: profile.id
    })
    .then(function(user) {
        if (!user) {
            if (profile.hasOwnProperty('emails') && profile.emails.length > 0) {
                return User.findOne({
                    email: profile.emails[0].value
                })
                .then(function (legacyUser){
                    if (!legacyUser) {
                        var error = new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_NO_USER_FOUND);
                        error.email = profile.emails[0].value;

                        throw error;
                    }
                    var error = new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_MISSING_FACEBOOK_LINK);
                    error.email = profile.emails[0].value;
                    error.username = legacyUser.username;

                    throw error;
                });
            }
            else {
                throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_UNKNOWN);
            }
        }
        else {
            //for 'access_token' grant types, we simply new up an access token.  for refresh_token types,
            //we try to locate a previous token, and recycle/refresh it with the latest and greatest token
            //information
            var __createToken = function(){
                return AccessToken.create({
                    facebookAccessToken: accessToken,
                    token: crypto.randomBytes(32).toString('base64'),
                    user: user.id,
                    client: client.id,
                    type: AccessToken.TokenTypes.FACEBOOK
                });
            };

            return new Promise(function(resolve, reject){
                if(grantType === 'access_token'){
                    __createToken()
                        .then(function(newToken){
                            resolve(newToken);
                        })
                        .catch(function(err){
                            reject(err);
                        });
                }
                else if(grantType === 'refresh_token'){
                    //See if we have an existing token, if we do, swap the 'token' value, otherwise, new up an AccessToken
                    //instance to wrap the FB token
                    AccessToken.findOne({
                        user: user.id,
                        type: AccessToken.TokenTypes.FACEBOOK,
                        token: refreshToken
                    })
                        .then(function(existingAccessToken){
                            if(existingAccessToken){

                                //recycle this AccessToken with the latest and creates
                                existingAccessToken.token = crypto.randomBytes(32).toString('base64');
                                existingAccessToken.createdAt = new Date();
                                existingAccessToken.facebookAccessToken = accessToken;

                                return existingAccessToken.save();
                            }
                            else{
                                return __createToken();
                            }
                        })
                        .then(function(token){
                            resolve(token);
                        })
                        .catch(function(err){
                            reject(err);
                        });
                }
            })
            .then(function(phenomAccessToken){
                return {
                    accessToken: phenomAccessToken.token,
                    expires_in:  Config.Facebook.oauth.tokenLifeTime
                };
            });
        }
    })
    .catch(function(err){
        sails.log.error('Failed to create FB AccessToken/RefreshToken for user', err);

        //any errors at this point are generic failed to create errors from the client's point of view
        //we don't want any node errors to escape to the user

        if(err.constructor !== Errors.PMError){
            throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_UNKNOWN);
        }

        throw err;
    });
}

function _twitterTokenExchange(accessToken, accessTokenSecret, grantType, refreshToken, profile, client){

    return User.findOne({
        twitterId: profile.id.toString()
    })
        .then(function(user) {
            if (!user) {
                //we have no Twitter support to detect non-migrated accounts.
                throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_NO_USER_FOUND);
            }
            else {
                //for 'access_token' grant types, we simply new up an access token.  for refresh_token types,
                //we try to locate a previous token, and recycle/refresh it with the latest and greatest token
                //information
                var __createToken = function(){
                    return AccessToken.create({
                        twitterAccessToken: accessToken,
                        twitterTokenSecret: accessTokenSecret,
                        token: crypto.randomBytes(32).toString('base64'),
                        user: user.id,
                        client: client.id,
                        type: AccessToken.TokenTypes.TWITTER
                    });
                };

                return new Promise(function(resolve, reject){
                    if(grantType === 'access_token'){
                        __createToken()
                            .then(function(newToken){
                                resolve(newToken);
                            })
                            .catch(function(err){
                                reject(err);
                            });
                    }
                    else if(grantType === 'refresh_token'){
                        //See if we have an existing token, if we do, swap the 'token' value, otherwise, new up an AccessToken
                        //instance to wrap the FB token
                        AccessToken.findOne({
                            user: user.id,
                            type: AccessToken.TokenTypes.TWITTER,
                            token: refreshToken
                        })
                        .then(function(existingAccessToken){
                            if(existingAccessToken){

                                //recycle this AccessToken with the latest and creates
                                existingAccessToken.token = crypto.randomBytes(32).toString('base64');
                                existingAccessToken.createdAt = new Date();
                                existingAccessToken.facebookAccessToken = accessToken;

                                return existingAccessToken.save();
                            }
                            else{
                                return __createToken();
                            }
                        })
                        .then(function(token){
                            resolve(token);
                        })
                        .catch(function(err){
                            reject(err);
                        });
                    }
                })
                .then(function(phenomAccessToken){
                    return Promise.resolve({
                        accessToken: phenomAccessToken.token,
                        expires_in:  Config.Twitter.oauth.tokenLifeTime
                    });
                });
            }
        })
        .catch(function(err){
            sails.log.error('Failed to create Twitter AccessToken for user', err);

            //any errors at this point are generic failed to create errors from the client's point of view
            //we don't want any node errors to escape to the user

            if(err.constructor !== Errors.PMError){
                throw new Errors.PMError(Errors.serverErrors.ERROR_SERVER_UNKNOWN);
            }

            throw err;
        });
}

function _deauthroize(token){
    return UserServices.logout(token);
}

module.exports = {
    getOAuthServer: function(){ return server; },
    init: _init,
    facebookTokenExchange: _facebookTokenExchange,
    twitterTokenExchange: _twitterTokenExchange,
    deauthorize: _deauthroize
};