/**  Elasticsearch API Services
 *
 *   @module      :: ElasticsearchServices
 *   @author      :: Isom Durm (isom@phenomapp.com)
 *
 *      <Description>
 *
 *
 **/

var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');
var client = undefined;

function _init() {
    client = new elasticsearch.Client({
        host: Config.Elasticsearch.url()
        // TODO: SSL
    });
}

/**
 * Attaches user information to the candidate products.  We prefer this over Product.toJSON because it's much
 * cheaper to perform.  Avoid adding too many ORM queries since we have lots of Product candidates coming through.
 *
 * @param product
 * @param user
 * @returns {Promise} resolving with the updated product on completion
 * @private
 */
function _hydrateProduct(product, user){
    return LockerServices.attachExistsInLocker(product, user)
        .then(function(products){
            return Product.hydrateImages(products);
        })
        .then(function(){
            return Product.attachGlobalProductData(product);
        });
}

/** Search for products with given text and return results for the given page
 *  using the default page size
 *
 * @param searchString - free form text
 * @param pageNumber - 1 based page number
 * @returns {Promise}
 */
function _searchProductsFreeform(searchString, scrollId, user){
    function _startPromise(){
        if(scrollId && scrollId !== ''){
            return client.scroll({
                    scroll_id: scrollId,
                    scroll: '2m'
                }
            );
        }
        else{
            return client.search({
                index: 'products',                          // 'Index' in elasticsearch to search
                scroll: "2m",
                size: 50,
                body: {
                    "query":{
                        "filtered": {
                            "query": {
                                "multi_match": {
                                    "query": searchString,
                                    "type": "cross_fields",
                                    "fields": ["name.autocomplete", "name^2", "brand.autocomplete", "brand^2", "colors.autocomplete", "colors^2", "categories^2", "categories.autocomplete"]
                                }
                            },
                            "filter": {
                                "and": {
                                    "filters": [
                                        {
                                            "not": {
                                                "filter": {
                                                    "term": {
                                                        "imageUrl": ""
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            "not": {
                                                "filter": {
                                                    "term": {
                                                        "brand": ""
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    return _startPromise().then(function(results) {

        if(results.hasOwnProperty('hits') && results.hits.hasOwnProperty('hits')) {

            return Promise.map(results.hits.hits, function(hit){
                if(hit.hasOwnProperty('_source')
                    && hit._source.hasOwnProperty('id')
                ){
                    return _hydrateProduct(hit._source, user);
                }
                else{
                    return Promise.resolve([]);
                }
            }).then(function(hydratedProducts){
                var scrollId = results.hasOwnProperty('_scroll_id') ? results._scroll_id : '';

                return {
                    products: hydratedProducts,
                    scrollId: scrollId
                }
            });
        }
        else{
            return {
                products: [],
                scrollId: ''
            };
        }
    });
};

////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// MODULE EXPORTS /////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

module.exports = {

    /**
     * Initialize this service
     */
    init: _init,

    /** Search for products with given text and return results for the given page
     *  using the default page size
     *
     * @param searchString - free form text
     * @param pageNumber - 1 based page number
     * @returns {Promise}
     */
    searchProductsFreeform: _searchProductsFreeform
};

