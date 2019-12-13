 /**
 *
 * Spotify Search Services
 *
 * @module      :: SpotifyServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for searching Spotify for song snippits
 *
 **/
 
var Promise = require('bluebird');
var SpotifyWebAPI = require('spotify-web-api-node');
var Moment = require('moment');
var apiAccessToken = undefined;
var apiAccessTokenDateExpiration = new Moment();

 /**
  * Ensures that a valid access token is available for future requests
  *
  * @returns {Promise}
  * @private
  */
function _prepareForAPIRequest(api) {
     //make sure that we have a previous token:
     //  {
     //     access_token:
     //     token_type:
     //     expires_in:
     //  }
     if (!apiAccessToken
         || !apiAccessToken.hasOwnProperty("access_token")
         || !apiAccessToken.hasOwnProperty("token_type")
         || !apiAccessToken.hasOwnProperty("expires_in")
         || apiAccessTokenDateExpiration < (new Moment())) {
         return api.clientCredentialsGrant()
             .then(function (data) {
                 // Save the access token so that it's used in future calls
                 apiAccessToken = data;
                 apiAccessTokenDateExpiration = new Moment().add(data.expires_in - 60, 'seconds');
                 api.setAccessToken(data.access_token);
                 return Promise.resolve();
             });
     }
     else {
         //reuse the one that we already have
         api.setAccessToken(apiAccessToken.access_token);
         return Promise.resolve();
     }
 }

 /**
  * Creates and initializes an object to access the Spotify API
  * @returns {*}
  * @private
  */
function _getSpotifyAPI() {
    api = new SpotifyWebAPI({
        clientId: Config.Spotify.clientId,
        clientSecret: Config.Spotify.clientSecret
    });

    return _prepareForAPIRequest(api)
        .then(function(){
            return Promise.resolve(api);
        });
}


function _parseResultsForTracks(results){
    var _handleArtists = function(artists){
        var artistNames = [];
        artists.forEach(function(artist){
            if(artist.hasOwnProperty('name')){
                artistNames.push(artist.name);
            }
        });

        return artistNames.join();
    };

    var _handleAlbumArt = function(art){
        var sortedArt = art.sort(function(a, b){
            if(a.height < b.height){
                return -1;
            }
            else if(a.height == b.height){
                return 0;
            }
            else{
                return 1;
            }
        });

        //go for medium in size
        if(sortedArt.length > 1){
            return sortedArt[1].url;
        }
        else{
            return sortedArt[0].url;
        }
    };

    return new Promise(function(resolve, reject){
        var songs = [];

        function _parseTracks(items)
        {
            items.forEach(function(track){
                if(track.hasOwnProperty(('track')))
                {
                    track = track.track;
                }

                if(track.hasOwnProperty('artists')
                    && track.hasOwnProperty('album')
                    && track.album.hasOwnProperty('images')
                    && track.hasOwnProperty('preview_url')
                    && track.album.hasOwnProperty('name')
                    && track.hasOwnProperty('external_urls')
                    && track.external_urls.hasOwnProperty('spotify')  //open.spotify....
                    && track.hasOwnProperty('available_markets')
                    && track.available_markets.length > 0)             //preview links only available for songs where this is > 1
                {
                    songs.push({
                        trackId:     track.id,
                        trackName:   track.name,
                        artistName:  _handleArtists(track.artists),
                        albumName:   track.album.name,
                        previewUrl:  track.preview_url,
                        artworkUrl:  _handleAlbumArt(track.album.images),
                        publicUrl:   track.external_urls.spotify
                    });
                }
            });

            resolve(songs);
        }

        var spotifyPluginAPI_V1_HasTracks = (results.hasOwnProperty('tracks')
            && results.tracks.hasOwnProperty('items') && results.tracks.items.length > 0);
        var spotifyPluginAPI_V2_HasTracks = (results.hasOwnProperty('body')
            && results.body.hasOwnProperty('tracks') && results.body.tracks.hasOwnProperty('items')
            && results.body.tracks.items.length > 0);

        // The latest version of spotify plugin catalogs it's tracks as 'results.body.tracks.items', previously, it was 'results.tracks.items'.
        if( spotifyPluginAPI_V1_HasTracks )
        {
            _parseTracks(results.tracks.items);
        }
        else if(spotifyPluginAPI_V2_HasTracks)
        {
            _parseTracks(results.body.tracks.items);
        }
        else
        {
            //no tracks found
            resolve([]);
        }
    });
}

 /**
  * Locates Spotify tracks given a free text search on track, album, and artist.
  * @param searchString
  * @param pageNumber
  * @returns {Promise} resolving to a list of fully populated track objects
  * @private
  */
function _searchForSongs(searchString, pageNumber){


	//convert to our promise library
	return new Promise(function(resolve, reject){
		_getSpotifyAPI()
            .then(function(api){
                return api.searchTracks(searchString, {offset: ((pageNumber - 1) * Config.Spotify.searchLimit)});
            })
            .then(function(results) {
                return _parseResultsForTracks(results);
            })
            .then(function(songs){
                resolve(songs);
            }, function(err){
                var errorMessage  = "";

                try{
                    errorMessage = JSON.parse(err);
                }
                catch(e){
                    errorMessage = 'Error searching Spotify';
                }

                reject(new Error(errorMessage));
            });
	});
}

 /**
  * Gets the latest preview URL given a Spotify track id
  * @param trackId
  * @returns {Promise} resolving to latest URL
  * @private
  */
function _getLatestPreviewUrl(trackId){
	return new Promise(function(resolve, reject){
		_getSpotifyAPI()
            .then(function(api) {
                return api.getTrack()
                    .then(function (info) {
                        //inside the response object, the preview URL should be top level
                        if (!info || !info.hasOwnProperty('preview_url')) {
                            reject(new Error("Spotify track not found"));
                        }
                        else {
                            resolve(info.preview_url);
                        }
                    }, function (err) {
                        reject(err);
                    });
            }
        );
	});
}

function _getDefaultPlaylist(pageNumber){
    return _getSpotifyAPI()
        .then(function(api) {
            return api.getPlaylist(Config.Spotify.id, Config.Spotify.defaultPlaylistId, {offset: ((pageNumber - 1) * Config.Spotify.searchLimit)});
        })
        .then(function(results) {

            return _parseResultsForTracks(results);

        })
        .then(function(songs){

            return Promise.resolve(songs);

        }, function(err) {
            var errorMessage  = "";

            try{
                errorMessage = JSON.parse(err);
            }
            catch(e){
                errorMessage = 'Error searching Spotify';
            }

            return Promise.reject(new Error(errorMessage));
        });
}

 /**
  * Service Public Interface
  * @type {{searchForSongs: Function, getLatestPreviewUrl: Function}}
  */
module.exports = {
    /**
     *
     * @param searchString
     * @param pageNumber
     * @returns {Promise}
     */
 	searchForSongs: function(searchString, pageNumber){
 		return _searchForSongs(searchString, (typeof pageNumber !== 'undefined' || pageNumber < 1) ? pageNumber : 1);
 	},

    /**
     *
     * @param trackId
     * @returns {Promise}
     */
 	getLatestPreviewUrl: function(trackId){
 		return _getLatestPreviewUrl(trackId);
 	},

    /**
     * Fetches tracks from the Default Spotify Playlist, used for "suggested" tracks while searching for
     *      music to add to a moment
     * @param pageNumber
     * @returns {Promise} Resolves with a page of tracks from the Phenom Default Playlist
     */
    getDefaultPlaylist: function(pageNumber){
        return _getDefaultPlaylist(pageNumber);
    }
}

 /**
  * Text Exports for private, testable functions functions
  */
module.testExports = {
    getApiAccessToken: function(){ return apiAccessToken; },
    getApiAccessTokenDateExpiration: function(){ return apiAccessTokenDateExpiration; },
    setApiAccessTokenDateExpiration: function(date){ apiAccessTokenDateExpiration = date; },
    _prepareForAPIRequest: _prepareForAPIRequest,
    _getSpotifyAPI: _getSpotifyAPI,
    _parseResultsForTracks: _parseResultsForTracks
}

for(var key in module.exports){
    module.testExports[key] = module.exports[key];
}