/**
 *
 * Passport Authentication Strategies
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines authentication strategies for OAuth purposes
 *
 **/

var Config = require('../api/services/Config.js');

var passport = require('passport'),
    BearerStrategy = require('passport-http-bearer').Strategy,
    LocalStrategy = require('passport-local').Strategy,
    ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    FacebookTokenStrategy = require('passport-facebook-token').Strategy,
    TwitterTokenStrategy = require('passport-twitter-token').Strategy;

//The basic strategy should only be used for routes which only require client_id and client_secret
//for authentication such as creating a user
passport.use(new LocalStrategy( {usernameField: 'client_id', passwordField: 'client_secret'},
    function(client_id, client_secret, done) { 
        Client.findOne({ clientId: client_id }, function(err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            client.compareSecret(Buffer(client_secret, 'base64').toString('utf8'), function(match){
                if(!match){
                    return done(null, false);
                }

                return done(null, client);
            });
        });
    }
));

passport.use(new ClientPasswordStrategy(
    function(clientId, clientSecret, done) {
        Client.findOne({ clientId: clientId }, function(err, client) {
            if (err) { return done(err); }
            if (!client) { return done(null, false); }
            client.compareSecret(Buffer(clientSecret, 'base64').toString('utf8'), function(match){
                if(!match){
                    return done(null, false);
                }

                return done(null, client);
            });
        });
    }
));

passport.use(new BearerStrategy(
    function(accessToken, done) {
        AccessToken.findOne({
            token: accessToken
        }).populate('user')
        .then(function(token){
            if(!token){
                return done(null, false);
            }

            if( Math.round(((Date.now()/1000) /*seconds*/ - token.createdAt.getTime() /* seconds */)) > 3600 ) {
                token.destroy()
                    .then(function () {
                        return done(null, false, { message: 'Token expired' });
                    });
            }
            else {
                var info = { scope: '*', token: token };
                return done(null, token.user, info);
            }
        })
        .catch(function(err){
            return done(err);
        });
    }
));

passport.use(new FacebookTokenStrategy({
        clientID: Config.Facebook.clientId,
        clientSecret: Config.Facebook.clientSecret
    },
    function(accessToken, refreshToken, profile, done) {

        done(null, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile
        });

    }
));

passport.use(new TwitterTokenStrategy({
        consumerKey: Config.Twitter.consumerKey,
        consumerSecret: Config.Twitter.consumerSecret
    },
    function(token, tokenSecret, profile, done) {

        done(null, {
            accessToken: token,
            accessTokenSecret: tokenSecret,
            profile: profile
        });

    }
));
