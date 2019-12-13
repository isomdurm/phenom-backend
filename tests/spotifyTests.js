/**  Tests the Spotify API Service
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 **/

var chai = require('chai');
chai.config.includeStack = true;
var errors = require('../api/services/Errors.js');
var requireFromTest = require('require-from').bind(undefined, 'testExports', module);
var Moment = require('moment');
var SpotifyService = requireFromTest('../api/services/SpotifyServices.js');
var Config = require('../api/services/Config.js');
var Promise = require('bluebird');

module.exports = function(resources) {
    return function () {
        before(function (next) {
            next()
        });

        describe("Spotify API Integration Tests", function(){

            it("Should be able to fetch a token for the first time ", function(){

                //we should initially be undefined
                chai.expect(SpotifyService.getApiAccessToken()).to.be.undefined;

                //after the first request of the api, we should have a valid token

                return SpotifyService._getSpotifyAPI()
                    .then(function(api){
                        chai.expect(api).to.be.an.object;
                        chai.expect(SpotifyService.getApiAccessToken()).to.not.be.null;
                    });
            });

            it("Artificially decrease the token date to make sure we fetch a new one", function(){
                //Current token
                var currentToken = SpotifyService.getApiAccessToken();

                chai.expect(SpotifyService.getApiAccessTokenDateExpiration() > (new Moment())).to.be.true;

                SpotifyService.setApiAccessTokenDateExpiration(Moment(SpotifyService.getApiAccessTokenDateExpiration()).subtract(SpotifyService.getApiAccessToken().expires_in, 'seconds'));
                chai.expect(SpotifyService.getApiAccessTokenDateExpiration() < (new Moment())).to.be.true;

                return SpotifyService._getSpotifyAPI()
                    .then(function(api){
                        chai.expect(api).to.be.an.object;

                        //Token date should have been reset
                        chai.expect(SpotifyService.getApiAccessTokenDateExpiration() > (new Moment())).to.be.true;
                        chai.expect(currentToken).to.not.equal(SpotifyService.getApiAccessToken());
                    });
            });

        });
    };
}