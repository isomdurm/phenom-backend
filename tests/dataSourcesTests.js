/**  Tests DataSources
 *   
 * @author      :: Isom Durm (isom@phenomapp.com)
 *  
 **/

var chai = require('chai');
var errors = require('../api/services/Errors.js');

module.exports = function(resources){
	return function(){
		before(function(next){
			resources.GetSails().models.Product.create({
				dataSourceId:  resources.getSails().Config.dataSourceIds.Indix,
				itemId:  resources.resources.Indix.testProductId
			})
			.then(function(product){
				next()
			})
			.catch(function(err){
				next(err);
			});
		});

 		describe('DataSources Test Getters', function(){
 			it("Should be able to get imageURL from test product", function(done){
 				done();
 			});
		});
	};
};