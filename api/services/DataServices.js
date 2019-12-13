/**  Data Sources Services
 *   
 *   @module      :: DataServices
 *   @author      :: Isom Durm (isom@phenomapp.com)
 *  
 *   This service is used to hydrate Product model attributes as well as Moment music support.  It knows to 
 *   hook into the various data sources such as Indix to hydrate attributes.
 **/
var Promise = require('bluebird');

function _getImageSource(serviceId, itemId){
	if(serviceId == Config.dataSourceIds.Indix){
		return Indix.getImageUrl(itemId)
		.then(function(result){
			return Promise.resolve(result);
		});
	}
	else if(serviceId == Config.dataSourceIds.Spotify){
		return SpotifyServices.getLatestArtwork(trackId)
		.then(function(url){
			return Promise.resolve(url);
		});
	}
	else{
		Promise.reject(new Error('No service available'));
	}
};

/** 
*   Gets a collection of products matching the criteria in search string, currently this is a raw string
*
*    @return A promise returning the image URL
*    
**/
function _searchProductsByService(serviceId, searchString, pageNumber, user){
	if(serviceId == Config.dataSourceIds.Indix){
		return IndixServices.searchProductsFreeform(searchString, pageNumber)
		.then(function(result){
			return Promise.resolve(result);
		});
	}
    else if(serviceId == Config.dataSourceIds.Elasticsearch) {

    }
	else{
		return Promise.reject(new Error('No service available'));
	}
};

module.exports = {
	///**
	//*   Used to construct a product from any data source.  This function will help ensure that products
	//*   are served up from each service consistently.
	//*
	//*    @return A product object
	//**/
	//createProduct: function(id, name, description, imageUrl, productUrl, sku, upc, brand, banned){
	//	return {
	//		id:      		id,
	//		name: 			name,
	//		description: 	description,
	//		imageUrl: 		imageUrl,
	//		productUrl: 	productUrl,
	//		sku: 		    sku,
	//		upc:            upc,
	//		brand:          brand,
	//		banned:         banned
	//	};
	//},
    //
	///**
	//*   Used to construct a Moment music object, containsing previewUrl, artworkUrl, trackId, albumName,
	//*   and trackName.  Possible sources include the Spotify Web API and iTMS
	//*
	//*    @return a Moment music object
	//**/
	//createSong: function(serviceId, trackId, trackName, artistName, albumName, previewUrl, artworkUrl, publicUrl)
	//{
	//	return {
	//		serviceId:   serviceId,
	//		trackId:     trackId,
	//		trackName:   trackName,
	//		artistName:  artistName,
	//		albumName:   albumName,
	//		previewUrl:  previewUrl,
	//		artworkUrl:  artworkUrl,
	//		publicUrl:   publicUrl
	//	};
	//},
    //
	///**
	//*   Gets the image for the the item described by itemId via the serviceId service
	//*
	//*    @return A promise returning the image URL
	//*
	//**/
	//getImageSource: function(serviceId, itemId){
	//	return _getImageSource(serviceId, itemId);
	//},
    //
	///**
	//*   Gets a collection of products matching the criteria in search string, currently this is a raw string
	//*
	//*    @return A promise returning the image URL
	//*
	//**/
	//searchProducts: _searchProductsByService
};