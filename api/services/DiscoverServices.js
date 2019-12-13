/**
 *
 * Discover Services
 *
 * @module      :: DiscoverSercvices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for discover / search functionality
 *
 **/

/*
    globals ProductServices, Output, Validation, User, DiscoverServices, ProductMetadata, Moment, SpotifyServices
*/

var Promise = require('bluebird');
var SpotifyWebAPI = require('spotify-web-api-node');
var api = new SpotifyWebAPI();
var _ = require('lodash');

function _shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function _manualPagination(inputCollection, pageNumber){
    if(pageNumber < 1){
        return [];
    }

    var start = Math.max(0, pageNumber * Config.Discover.defaultResultsPageSize - Config.Discover.defaultResultsPageSize);
    var end   = Math.min(inputCollection.length, start + Config.Discover.defaultResultsPageSize);
    return _.slice(inputCollection, start, end);
}

function _getDefaultDiscoverMusic(relativeToUser, page){
    return SpotifyServices.getDefaultPlaylist(page);
}

function _getDefaultDiscoverPeople(relativeToUser, page) {
    var phenomIds = [ '53f245f28e59ba3e566c62e2', '53ed65718e59ba3e566c607f', '53ee0dc98e59ba3e566c618f', '53ed76d68e59ba3e566c6164', '53ee0fd78e59ba3e566c619d', '53ed76d68e59ba3e566c6164', '53f160448e59ba3e566c6281', '55147ab18f8198672c2df595', '56b8dd565c53eca578a97c8d', '56c77ca1ac8fd38e2bdb86fc', '56ea58c0a53bf2db0c3bf6d8', '56a152b9fadb8a9361764f63', '53f932b441c5993a6f13fbf6'];
    // Find the user's that have the most fans ( followersCount )
    return User.find({
        id: {'!': phenomIds}
    })
        .limit(50)
    .sort('followersCount DESC')//lets keep our memory foot print down
    .then(function(users){

        var promises = [];

        //we do manual pagination with the pruned 500 results from above to keep from loading every user into memory
        //to do a skip
        var pagedResults = _manualPagination(users, page);

        pagedResults.forEach(function(user){


            if (relativeToUser == user) {

            } else if (user.userFollows == true) {
                // don noting
            } else if (relativeToUser.hometown == user.hometown && relativeToUser.sport == user.sport) {
                promises.unshift(user.getPublicDataWithMostRecentMoments(relativeToUser));

            } else if (relativeToUser.hometown != user.hometown && relativeToUser.sport == user.sport) {
                promises.unshift(user.getPublicDataWithMostRecentMoments(relativeToUser));

            } else if (relativeToUser.hometown == user.hometown && relativeToUser.sport != user.sport) {
                promises.unshift(user.getPublicDataWithMostRecentMoments(relativeToUser));

            } else {
                promises.push(user.getPublicDataWithMostRecentMoments(relativeToUser));
            }
        });

        return Promise.settle(promises);
    })
    .then(function(results){

        var users = [];

        results.forEach(function(result){
            if(result.isFulfilled()){
                users.push(result.value());
            }
            else {
                sails.log.error('Error getting public data with most recent moments for a user', {error: result.error()});
            }
        });

        for (var i = 0; i < users.length; i++) {

            if (users[i].momentCount < 3) {
                users.splice(i, 1);
            };

        };

        console.log(users);
        return _shuffle(users);
        
    });
}

function _getDefaultDiscoverGear(relativeToUser, page) {
    return MomentServices.getFeed(new Date(), 10, relativeToUser)
        .then(function(moments){
            var productIds = [];

            _.forEach(moments, function(moment){
                productIds = _.concat(productIds, moment.products);
            });
            return productIds;
        })
        .then(function(productIds) {
            return ProductMetadata
                .find()
                .where({
                    product: productIds
                })
                .limit(30)
                .populate('product')
        })
        .then(function(products) {
            products = _shuffle(products);
            productsToHydrate = _manualPagination(products, page);

            return Promise.map(productsToHydrate, function (productMetaData) {
                return productMetaData.product.getJSON(relativeToUser, relativeToUser)
                    .catch(function(err){
                        sails.log.error("Failed to hydrate product data", {error: err});
                        return undefined;
                    });
                })
                .filter(function(productData) {

                    for (var i = 0; i < productData.length; i++) {
                        if (productData[i].existsInLocker == true) {
                            productData.push(productData[i]);
                        }
                    }
                    return productData != undefined;
                })
        });
}

function _getDiscoverFeaturedPeople(relativeToUser, pageNumber){
    return User.find()
    .limit(Config.Discover.defaultResultsPageSize)
    .then(function(people){
            var promises = [];
            var pagedResults = _manualPagination(people, pageNumber);

            pagedResults.forEach(function(user){
                promises.push(user);
            });

            return Promise.settle(promises);
        })
    .then(function(results){
        var users = [];
        results.forEach(function(result){
            if(result.isFulfilled()){
                users.push(result.value());
            }
            else {
                sails.log.error('Error getting public data with most recent moments for a user', {error: result.error()});
            }
        });

        return users;
    });
}

function _getDiscoverFeaturedGear(relativeToUser, pageNumber){

    var productIds = [ 1, 31170, 582556, 34924, 614582, 171496, 260143, 667348, 31160, 301372, 20464, 17555, 7605, 12936, 9638 ];

    return ProductMetadata.find().where({ product: productIds }).populate('product')
    .then(function(products) {
        productsToHydrate = _manualPagination(products, pageNumber);

        return Promise.map(productsToHydrate, function (productMetaData) {
            return productMetaData.product.getJSON(relativeToUser, relativeToUser)
            .catch(function(err){
                sails.log.error("Failed to hydrate product data", {error: err});
                return undefined;
            });
        })
        .filter(function(productData) {
            var gearCollection = { title: "gearCollection", products: productData };

            return gearCollection;
        })
    })
}

function _getDiscoverFeaturedMoments(relativeToUser, pageNumber){
    return MomentServices.getMostPopularMomentsFeed(relativeToUser)
    .then(function(moments){

        var promises = [];

        moments.forEach(function(moment){
            promises.push(moment);
        });

        return Promise.settle(promises);
    }).
    then(function(results){
        var moments = [];

        results.forEach(function(result){
            if(result.isFulfilled()){
                moments.push(result.value());
            }
            else{
                sails.log.error('Error hydrating moment when fetching featured moments', {error: result.error()});
            }
        });
        return moments;
    });
}

/**
 * Service Public Interface
 */
module.exports = {
    /**
     * Fetches a collection of "Trending" users, currently the users with the most fans (followers)
     *
     * @param relativeToUser - The person usually performing the request, used for things like 'userFollows'
     * @param page
     * @returns {Promise} resolving with array of user objects
     */
    getDefaultDiscoverPeople: _getDefaultDiscoverPeople,

    /**
     * Fetches a collection of "Trending" gear/products, currently this includes gear which appears in the most lockers
     * simultaneously
     *
     * @param relativeToUser - The person usually performing the request, used for things like 'existsInLocker'
     * @param page
     * @returns {Promise} resolving with array of products
     */
    getDefaultDiscoverGear: _getDefaultDiscoverGear,

    /**
     * Fetches the Default Music Search results (the public Spotify playlist)
     * @param relativeToUser
     * @param page
     * @returns {Promise} resolving with array of music
     */
    getDefaultDiscoverMusic: _getDefaultDiscoverMusic,

    /**
     * Fetches Featured Phenoms
     * @param relativeToUser
     * @param page
     * @returns {Promise} resolving with array of user objects
     */
    getDiscoverFeaturedPeople: _getDiscoverFeaturedPeople,

    /**
     * Fetches Featured Products
     * @param relativeToUser
     * @param page
     * @returns {Promise} resolving with array of featured product objects
     */
    getDiscoverFeaturedGear: _getDiscoverFeaturedGear,

    /**
     * Fetches Featured Moments
     * @param relativeToUser
     * @param page
     * @returns {Promise} resolving with array of featured moment objects
     */
    getDiscoverFeaturedMoments: _getDiscoverFeaturedMoments
}