/**
 *
 * Product Services
 *
 * @module      :: ProductServices
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for Product-bound operations
 *
 **/

/*
    globals Product, ElasticsearchServices, LockerServices, ProductMetadata, CommentServices, AnalyticsServices
*/

var Promise = require('bluebird');

/**
 * Search for products in the product db, then attach the appropriate 'existsInLocker' attribute
 * to each product
 * @private
 */
function _searchForProducts(searchString, pageNumber, relativeToUser){

    // Ask DataServices to search for our products, then check to see if any of them
    // exist in the logged in user's locker
    return ElasticsearchServices.searchProductsFreeform(searchString, pageNumber, relativeToUser)
        .then(function(results){
            if(results.hasOwnProperty('products')){
                return Promise.map(results.products, function(result){
                    return LockerServices.attachExistsInLocker(result, relativeToUser);
                }).then(function(products){
                    return {
                        products: products,
                        scrollId: results.scrollId
                    };
                });
            }

            return [];
        });
}

/**
 * Fetches a set of products by id, not paginated
 * @private
 */
function _getProducts(productIds, relativeToUser, loggedInUser)
{
    return Product.find({
        id:  productIds
    })
        .then(function(products){
            var promises = [];

            products.forEach(function(product){
                promises.push(product.getJSON(relativeToUser, loggedInUser));
            });

            return Promise.settle(promises);
        })
        .then(function(results){

            var productsToReturn = [];

            results.forEach(function(result){
                if(result.isRejected()){
                    sails.log.error('Could not fetch product while hydrating product set:  ', {error:  result.error()});
                }
                else{
                    productsToReturn.push(result.value());
                }
            });

            return productsToReturn;
        });
}

/**
 * Create a product comment, and increments to the product comment count
 * @private
 */
function _createComment(productId, commentText, commentReferences, commentAuthor){
    //make sure productId is of integer type
    if(_.isString(productId)){
        productId = parseInt(productId);

        if(_.isNaN(productId)){
            return Promise.reject(new Error('productId invalid'));
        }
    }

    return ProductMetadata.findOne({
        product: productId
    }).then(function(productMetadata){
        if(!productMetadata){
             throw new Error('Product not found with id:  ' + productId);
         }

        return CommentServices.createComment(commentText, Comment.commentTypes.PRODUCT, productId,
            commentReferences, commentAuthor)
             .then(function(hydratedComment){

                 //update the moment comment count
                 if (!productMetadata.commentCount) {
                     productMetadata.commentCount = 0;
                 }

                productMetadata.commentCount = productMetadata.commentCount + 1;
                 return productMetadata.save()
                     .then(function(){
                         return hydratedComment;
                     });
             });
        });
}

/**
 * Deletes a product comment if requesting user is the comment owner
 * @private
 */
function _deleteComment(comment, requestingUser){
    // we can delete moment comments under following conditions:
    //   1.  requestingUser is the comment author
    return ProductMetadata.findOne({
        product: comment.targetProduct
    })
        .then(function(targetProduct) {
            var authorId = comment.author.hasOwnProperty('id') ? comment.author.id : comment.author;
            if (targetProduct && authorId == requestingUser.id)
            {
                // Decrement the product metadata's Comment Count, be sure not to drop below 0
                targetProduct.commentCount = Math.max(0, targetProduct.commentCount - 1);

                return targetProduct.save()
                    .then(function(){
                        return Comment.destroy({id: comment.id});
                    })
                    .then(function(results){
                        //fire and forget analytics
                        AnalyticsServices.reportCommentRemoved(comment, requestingUser, false);

                        return true;
                    });
            }
            else{
                //user is not authorized to delete this moment
                throw new Errors.PMError(Errors.clientErrors.ERROR_CLIENT_INVALID_ACCESS);
            }
        });
}

/**
 * Fetches comments for a product that were created before 'since'
 * @private
 */
function _getComments(productId, since, limit, requestingUser){
    //make sure productId is of integer type
    if(_.isString(productId)){
        productId = parseInt(productId);

        if(_.isNaN(productId)){
            return Promise.reject(new Error('productId invalid'));
        }
    }

    return ProductMetadata.findOne({
        product: productId
    })
        .then(function(productMetadata){
            if(!productMetadata){
                throw new Error('Product not found with id:  ' + productId);
            }

            return CommentServices.fetchCommentsByDate(productId, Comment.commentTypes.PRODUCT,
                since, limit, requestingUser).then(function(comments){
                    return {
                        comments:       comments.comments,
                        cursor:         comments.cursor,
                        commentCount:   productMetadata.commentCount
                    };
                });
        });
}

module.exports = {
    /**
     * Search for products in the product db, then attach the appropriate 'existsInLocker' attribute
     * to each product
     * @param searchString
     * @param pageNumber
     * @param relativeToUser
     * @returns {Promise} resolving with a collection of searchResults with the existsInLocker attribute attached
     */
    search: _searchForProducts,

    /**
     * Fetches a set of products by id, not paginated
     *
     * Do not use with large sets of products, since this method doesn't paginate, you will run the risk
     * of keeping a lot of data in memory simultaneously.
     *
     * @param productIds
     * @param relativeToUser
     * @param loggedInUser
     * @return {Promise} resolving with hydrated set of product information, relative to a user as well as an
     *                   authenticated user
     */
    getProducts: _getProducts,

    /**
     * Create a product comment, and increments to the product comment count
     *
     * @param productId
     * @param commentText
     * @param commentReferences
     * @param commentAuthor
     * @returns {Promise} resolves with hydrated comment
     */
    createComment: _createComment,

    /**
     * Deletes a product comment if requesting user is the comment owner
     *
     * @param comment
     * @param requestingUser
     * @returns {Promise}
     */
    deleteComment: _deleteComment,

    /**
     * Fetches comments for a product that were created before 'since'
     *
     * @param productId
     * @param since
     * @param limit
     * @param requestingUser
     * @returns {Promise} resolving with fully hydrated comments
     */
    getComments: _getComments
};