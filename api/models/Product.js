/**
 *
 * Product Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Product, which can be referenced by Moments and Lockers
 *
 **/

/*
	globals ProductServices, UserProductData, ProductMetadata, LockerServices
*/

var Promise = require('bluebird');
var validator = require('validator');
var fs = require("fs");
var _ = require('lodash');

/**
 * Used to hydrate product image urls, some products are stored with image keys if they're hosted by Phenom,
 * and others store URLs directly (products with images we do not store ourselves). This function
 * ensures all imageUrl properties point to urls.
 *
 * @param product to check for non-hydrated image urls
 * @returns {Promise} resolving with fully hydrated product image urls
 * @private
 */
function _hydrateImages(product){
	if(product.hasOwnProperty('imageUrl')){
		if(!validator.isURL(product.imageUrl)){
			//the image is hosted through CloudFront
			product.imageUrl = S3Services.getProductImageUrl(product.imageUrl);
		}
	}

	if(product.hasOwnProperty('alternateImages')  && product.alternateImages != "") {
		var alternateImages = product.alternateImages.split(",");

		product.alternateImages = _.map(alternateImages, function(key){
			if(!validator.isURL(key)) {
				return S3Services.getProductImageUrl(key);
			}

			return key;
		});
	}

	return Promise.resolve(product);
}

/**
 * Attaches 'logged-in' user information to a product, things such
 * as existsInLocker
 *
 * @param product
 * @param user - relative to this user
 * @returns {Promise} resolves with a product hydrated with user-related information
 * @private
 */
function _attachLoggedInUserData(product, user){
	return LockerServices.attachExistsInLocker(product, user);
}

/**
 * Adds user-specific data to a product
 * @param product to hydrate
 * @param user User for which this product is relative
 * @returns {Promise} transformed products with user data
 * @private
 */
function _attachUserProductData(product, user){

	return UserProductData.findOne({
			product: product.id,
			userId: user.id}
	)
		.then(function(userData){
			if(userData){
				product.momentCount = userData.momentCount;
			}

			return Promise.resolve(product);
		});
}

function _attachGlobalProductData(product){
	return ProductMetadata.findOne({
		product: product.id
	}).then(function(productMetadata){
		if(productMetadata){
			product.stylingMomentCount = productMetadata.stylingMomentCount;
			product.trainingMomentCount = productMetadata.trainingMomentCount;
			product.gamingMomentCount = productMetadata.gamingMomentCount;
			product.lockerCount = productMetadata.lockerCount;
		}

		//attach brand logo url if supported
		if(product.brand){
			var brandLogoURL = Product.getBrandImageUrl(product.brand.toLowerCase());
			if(brandLogoURL){
				product.brandLogoImageUrl = brandLogoURL;
			}
			else{
				product.brandLogoImageUrl = '';
			}
		}

		return product;
	});
}

/**
 * Yields a brand lookup table where the object is structured as:
 *
 * {
 *     'adidas': {
 *         imageKey: 'adidas.jpeg'
 *     },
 *     'adidas originals': {
 *         imageKey: 'adidas.jpeg'
 *     },...
 * }
 *
 * Meant to be a blocking call while the app is starting up, needs to be hydrated before any requests.
 *
 * @private
 */
function _getBrandsLookup(){
	var csv = "";

	try{
		csv = fs.readFileSync("./api/models/products/brand_image_lookup.csv",  "utf-8");
	}
	catch(err){
		sails.log.error("Failed to parse brand image lookup table", {error: err});
	}

	if(!csv){
		return {};
	}

	var lines=csv.split("\n");
	var headers=lines[0].split(",");
	var brands = {};

	for(var i=1; i<lines.length; i++){

		var obj = {};
		var currentLine=lines[i].split(",");

		//supported headers
		//  -1 - imageKey
		obj[headers[1].replace(/^[\r\n\s]*|[\r\n\s]*$/g, '')] = currentLine[1].toLowerCase().replace(/^[\r\n\s]*|[\r\n\s]*$/g, '');

		brands[currentLine[0].toLowerCase().toLowerCase().replace(/^[\r\n\s]*|[\r\n\s]*$/g, '')] = obj;
	}

	return brands;
}

var __brandsLookup = _getBrandsLookup();
function _getBrandImageUrl(brand){
	if(__brandsLookup.hasOwnProperty(brand)
		&& __brandsLookup[brand].hasOwnProperty('imageKey'))
	{
		return S3Services.getBrandImageUrl(__brandsLookup[brand].imageKey);
	}

	return undefined;
}

/**
 * Serializes this product (and associated information) to JSON
 * @private
 */
function _getJSON(relativeToUser, loggedInUser){

	var json = {
		id:                 this.id,
		sourceId:       	this.sourceId,
		sourceProductId:    this.sourceProductId,
		name:               this.name,
		description:        this.description,
		sku:                this.sku,
		imageUrl:     		this.imageUrl,
		alternateImages:    this.alternateImages,
		brand:              this.brand,
		productUrl:			this.productUrl
	};

	return _attachLoggedInUserData(json, loggedInUser)
		.then(function(product){
			return _attachUserProductData(product, relativeToUser);
		})
		.then(function(product){
			return _attachGlobalProductData(product);
		})
		.then(function(product){
			return _hydrateImages(product)
		})
		.then(function(product){
			return ProductServices.getComments(product.id, Date.now(), 3, loggedInUser)
				.then(function(comments){
					product.mostRecentComments = comments.comments;
					product.commentCount = comments.commentCount;
					return product;
				});
		});
}

module.exports = {
	connection: ['productDB'],
    tableName:   'products',
	
	attributes: {
        id: {
            type: 'integer',
            autoIncrement: true,
            primaryKey: true,
            defaultsTo: 'AUTO_INCREMENT'
        },

		sourceId: {
			type: 'integer',
			required: true
		},

		sourceProductId: {
			type: 'string',
			required: true
		},

		name: {
			type: 'String',
			required: true
		},

		description: {
			type: 'String',
			required: false
		},

		productUrl: {
			type: 'String',
			required: true
		},

		sku: {
			type: 'string',
			required: true
		},

        model: {
            type: 'string',
            defaultsTo: ""
        },

		imageUrl: {
			type: 'string'
		},

        alternateImages: {
            type: 'string'
        },

		brand: {
			type: 'String',
			defaultsTo: ''
		},

        reviewCount: {
            type: 'integer',
            defaultsTo: 0
        },

        averageRating:{
            type: 'float',
            defaults: 0.0
        },

        categories: {
            type: 'string',
            defaultsTo: ''
        },

        colors: {
            type: 'string',
            defaultsTo: ''
        },

		/**
		 * Serializes this product (and associated information) to JSON
		 *
		 * @param relativeToUser
		 * @param loggedInUser
		 * @returns {Promise}
		 */
		getJSON: _getJSON
	},

	/**
	 *   Used to ensure incoming Product has fully populated imageUrl and alternateImages
	 *   attributes.  If they're hosted by Phenom, we'll ensure the referenced imaged ID is
	 *   replaced with a CDN URL.
	 */
	hydrateImages: _hydrateImages,

	/**
	 *    Used to attach global product metadata to a product without fully hydrating the backing
	 *    SQL model
	 *
	 *    @param product an id containing a field 'id' where that field maps to some product Model
	 */
	attachGlobalProductData: _attachGlobalProductData,

	/**
	 *    Fetches a URL for a given brand's logo
	 *    @param {string} brand
	 *    @return {string} brand URL if supported brand, undefined otherwise
	 */
	getBrandImageUrl:  _getBrandImageUrl
};