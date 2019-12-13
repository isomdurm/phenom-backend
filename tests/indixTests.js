/**  Tests the Indix API Wrapper
 *   
 * @author      :: Isom Durm (isom@phenomapp.com)
 *  
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');
var Config = require('../api/services/Config.js');
var _ = require('underscore');
var Promise = require('bluebird');

module.exports = function(resources){
	return function(){
		before(function(next){
			next()
		});

 		describe('Indix Service Product Details', function(){
 			it("Should be able to get imageURL from test product", function(done){
 				IndixService.getImageURL(resources.testProduct.itemId)
 				.then(function(imageUrl){
 					//make sure we're getting a url back
 					chai.expect(imageUrl.match('http://')).to.not.be.empty;
 					done();
 				})
 				.catch(function(err){
 					done(err);
 				});
 			});
		});

		describe('Indix Service Product Search', function(){
			it("Should be able to search for products with a simple search string", function(done){
				//lets fire off a single request
				IndixService.searchProductsFreeform(resources.testProduct.name)
				.then(function(results){
					chai.assert(results.length <= Config.Indix.pageSize && results.length > 0);
					done();
				})
				.catch(function(err){
					done(err);
				})
			});

			it("Should be able to get page several pages worth of products (with unique keys) by altering the pageNumber parameter", function(done){
				var requests = [
					IndixService.searchProductsFreeform(resources.testProduct.name, 1),
					IndixService.searchProductsFreeform(resources.testProduct.name, 2)
				];

				var products = [];

				Promise.settle(requests)
				.then(function(results){
					results.forEach(function(result){
						//make sure we have fullfilled promises
						if(result.isRejected()){
							done(result.reason());
						}
						
						//result should be an array of products
						result.value().forEach(function(product){
							products.push(product);
						});
					});

					var uniqueProducts = _.uniq(products, function(product){
						return product.itemId;
					});

					//we should have more than one pages worth of data (but maybe not exactly two)
					chai.assert(uniqueProducts.length > Config.Indix.pageSize);
					chai.assert(uniqueProducts.length < Config.Indix.pageSize * 2);
					done();
				})
			});
		});
	};
};
