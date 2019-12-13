/**
*
* Locker Services
*
* @module      :: LockerServices
* @author      :: Isom Durm (isom@phenomapp.com)
*
* Provides support for Locker-bound operations
*
**/

/*
	globals Product, UserProductData, LockerItem, ProductMetadata
*/

var Promise = require('bluebird');
var _ = require('lodash');

/**
 *  Removes user specific product data when removing a product from a user's locker
 *
 */
function _removeUserProductData(productId, userId){
	var productId = parseInt(productId);
	return UserProductData.findOne({
		userId: userId,
		product: productId
	})
	.then(function(userProductData){
		if(!userProductData){
			//log a message, we shouldn't get here, but don't crash if we do (some unit tests exercise this code path)
			sails.log.info("user/product data not found when trying to remove product from locker");
			return Promise.resolve("deleted");
		}
		else{
			//if there are still moment reference, don't remove this object.  This object hosts data
			//that's necessary to display the moment like user uploaded product image and moment count.
			if(userProductData.momentCount > 0){
				return Promise.resolve("not deleted");
			}
			else{
				return userProductData.destroy();
			}
		}
	});
}

/**
 *  Removes many user-specific product data when removing several products from a user's locker
 */
function _removeManyUserProductData(productIds, userId){
	var promises = [];

	productIds.forEach(function(productId){
		promises.push(_removeUserProductData(productId, userId));
	});

	return Promise.settle(promises)
	.then(function(results){
		results.forEach(function(result){
			if(result.isRejected()){
				sails.log.error('Promise failed in allSettled when trying to remove user/product data', result.error());
			}
		});

		return Promise.resolve("all deleted");
	});
}

/**
 * Increments lockerCount ProductMetadata for a collection of product ids
 *
 * @param productIds
 * @returns {Promise}
 * @private
 */
function _incrementLockerCount(productIds){
    function __incrementLockerCount(productId){
		var productId = parseInt(productId);

        return ProductMetadata.findOne({
            product: productId
        })
            .then(function(productMetadata){
                //if we have metadata, update the lockerCount, otherwise create the metadata
                if(productMetadata){
                    productMetadata.lockerCount = productMetadata.lockerCount + 1;
                    return productMetadata.save();
                }
                else{
                    return ProductMetadata.create({
                        product: productId,
                        lockerCount: 1
                    });
                }
            });
    }

    var promises = [];

    productIds.forEach(function(productId){
        promises.push(__incrementLockerCount(productId));
    });

    return Promise.settle(promises)
        .then(function(results){
            results.forEach(function(result){
                if(result.isRejected()){
                    //log error and keep going
                    sails.error.log(result.error());
                }
            });

            return Promise.resolve();
        });
}

/**
 * Decrements global 'lockerCount' information for each product in productIds
 *
 * @param productIds
 * @returns {Promise} resolves when the 'lockerCount' has been updated for each product in productIds
 * @private
 */
function _decrementLockerCount(productIds){

    function __decrementLockerCountForProduct(productId){
		var productId = parseInt(productId);

        return ProductMetadata.findOne({
            product: productId
        })
            .then(function(productMetadata){
                if(productMetadata){
                    productMetadata.lockerCount = Math.max(0, productMetadata.lockerCount - 1);
					return productMetadata.save();
                }

				return Promise.resolve();
            });
    }

    var promises = [];

    productIds.forEach(function(productId){
        promises.push(__decrementLockerCountForProduct(productId));
    })

    return Promise.settle(promises)
        .then(function(results){
            results.forEach(function(result){
                if(result.isRejected()){
                    //log error and keep going
                    sails.error.log(result.error());
                }
            });

            return Promise.resolve(productIds);
        });
}

/**
 *  Removes productIds from user's locker, updates global 'lockerCount' information
 *
 *  @return {Promise} An array of products removed from the users locker
 */
function _removeProducts(productIds, user){
	var deleted = [];

	var _removeLockerItem = function(productId){
		var productId = parseInt(productId);

		return LockerItem.findOne({
			sourceUser: user.id,
			entryType:  LockerItem.lockerEntryTypes.PRODUCT,
			targetProduct: productId
		})
		.then(function(entry){
			if(!entry){
				return Promise.resolve();
			}

			return entry.destroy()
			.then(function(){
				return productId;
			})
		});
	};

	var _removeManyLockerItems = function(){
		var promises = [];

		productIds.forEach(function(productId){
			promises.push(_removeLockerItem(productId))
		});

		return Promise.settle(promises)
		.then(function(results){

			var deleted = [];

			results.forEach(function(result){
				if(result.isRejected()){
					sails.log.error('Failed to remove product from users locker', {error:  result.error()});
				}
				else if(result.value()){
					//output the items that were actually deleted
					deleted.push(result.value());
				}
			});

			return deleted;
		})
	}

	//if productIds is atomic, turn it into an array for consistency
	if(!(productIds instanceof Array))
	{
		var temp = productIds;
		productIds = [ temp ];
	}

	return _removeManyUserProductData(productIds, user.id)
	.then(function(){
		return _removeManyLockerItems();
	})
	.then(function(deletedIds) {
		return _decrementLockerCount(deletedIds);
    })
    .then(function(deleted){
        return Promise.resolve(deleted);
    });
}

/**
 * Caches product metadata for a user when added to a locker
 *
 * @param productId
 * @param userId
 * @returns {Promise} resolves with momentCount on success
 * @private
 */
function _cacheUserProductData(productId, userId){
	var productId = parseInt(productId);

	//first see if we already have an userProductData edge for this product, if so, don't add another one
	return UserProductData.findOne({
		product: productId,
		userId: userId
	})
	.then(function(userProductData){
		if(userProductData){
			return Promise.resolve(userProductData.momentCount);
		}
		else{
			//add the edge
			return UserProductData.create({
				product: productId,
				userId: userId
			})
			.then(function(userData){
				return Promise.resolve(userData.momentCount);
			});
		}
	});
}

/**
 * Adds an existing product 'product' to a users locker
 *
 * @param product
 * @param userId
 * @returns {Promise} resolving to {momentCount, productId} on success, rejecting otherwise
 * @private
 */
function _addProductToLocker(product, user){

	var targetProduct = undefined;

	if (typeof product === 'string') {
		product = eval("(" + product + ')');
	};

	return Product.findOne({
		id: product.id
	})
	.then(function(product){
		if(!product){
			throw new Error('Unrecognized product');
		}

		targetProduct = product;
		return _cacheUserProductData(targetProduct.id, user.id);
	})
	.then(function(momentCount){
		return LockerItem.findOne({
			sourceUser: user.id,
			entryType: LockerItem.lockerEntryTypes.PRODUCT,
			targetProduct: targetProduct.id
		})
			.then(function(lockerEdge){
				if(lockerEdge){
					//already in locker
					return Promise.resolve({
						productId:   targetProduct.id,
						momentCount: momentCount
					});
				}
				else{
					//add to locker
					return LockerItem.create({
						entryType: LockerItem.lockerEntryTypes.PRODUCT,
						sourceUser: user.id,
						targetProduct: targetProduct.id
					})
						.then(function() {
							//we need to increment 'lockerCount' on the product if necessary
							return _incrementLockerCount([ targetProduct.id ]);
						})
						.then(function(){
							return Promise.resolve({
								productId:  targetProduct.id,
								momentCount: momentCount
							});
						});
				}
			})
	});
}

/**
 * Fetches Products in a user's locker
 *
 * @param user
 * @param pageNumber
 * @returns {Promise} resolving with paged products for a user's locker
 * @private
 */
function _getProductsByCursorDate(userId, since, limit, loggedInUser){

	var cursorDate = new Date(since);
	var relativeToUser = undefined;

	return User.findOne({
		id: userId
	})
	.then(function(user){
		if(!user){
			throw new Error('No user found while fetching products for userId:  ' + userId);
		}

		relativeToUser = user;

		if(limit < 1){
			resolve([]);
		}

		return LockerItem.find({
			where: {
				sourceUser: userId,
				entryType: LockerItem.lockerEntryTypes.PRODUCT,
				createdAt: {
					'<': new Date(since)
				}
			},
			sort: 'createdAt DESC'
		})
		.limit(limit)
		.populate('targetProduct');
	})
	.then(function(lockerEntries){

		if(lockerEntries.length > 0){
			cursorDate = _.last(lockerEntries).createdAt;
		}

		//fetch the public data for this product
		var promises = [];

		lockerEntries.forEach(function(entry){
			promises.push(entry.targetProduct.getJSON(relativeToUser, loggedInUser));
		});

		return Promise.settle(promises);
	})
	.then(function(results){

		var productsToReturn = [];

		results.forEach(function(result){
			if(result.isRejected()){
				sails.log.error('Failed to fetch product JSON while getting products in a users locker' + {error:  result.error()});
			}
			else{
				productsToReturn.push(result.value());
			}
		});

		return new Promise(function(resolve, reject){
			LockerItem.count({
				sourceUser: userId,
				entryType: LockerItem.lockerEntryTypes.PRODUCT
			}).exec(function(error, count){
				if(error){
					return reject(error);
				}
				resolve({
					products:     productsToReturn,
					productCount: count,
					cursor:       cursorDate.getTime()
				});
			});
		});
	});
}

/**
 * Attaches the 'existsInLocker' attribute to each product
 *
 * @param product       - raw product
 * @param relativeToUser - logged in user
 * @returns {Promise} resolving with the same passed in product
 * but also attached is the 'existsInLocker' flag
 * @private
 */
function _attachExistsInLocker(product, relativeToUser) {

	//if the product already has an id, match by id, otherwise, try to match by (sourceId, sourceProductId)
	//composite key
	return (function(){
		if(product.hasOwnProperty("id")){
			return LockerItem.find({
				sourceUser: relativeToUser.id,
				entryType: LockerItem.lockerEntryTypes.PRODUCT,
				targetProduct: product.id
			});
		}
		else{
			return LockerItem.find({
				sourceUser: relativeToUser.id,
				entryType: LockerItem.lockerEntryTypes.PRODUCT
			}).populate('targetProduct', {
				where: {
					sourceId: product.sourceId,
					sourceProductId: product.sourceProductId
				}
			});
		}
	})().then(function(lockerItems){
		product.existsInLocker = lockerItems.length > 0;
		return product;
	});
}

module.exports = {
	/**
	 * Fetches products from userId's locker, paginated
	 * @param userId
	 * @param pageNumber
	 * @returns {Promise}
	 */
	getProducts: _getProductsByCursorDate,

	/**
	 * Removes products from userIds locker
	 */
	removeProducts:  _removeProducts,

	/**
	 * Adds a product to userId's locker
	 */
	addProduct:  _addProductToLocker,

	/**
	 *   Attaches the 'existsInLocker' attribute to each product
	 */
	attachExistsInLocker: _attachExistsInLocker
};
