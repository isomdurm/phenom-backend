/**
 * Global adapter config
 * 
 * The `adapters` configuration object lets you create different global "saved settings"
 * that you can mix and match in your models.  The `default` option indicates which 
 * "saved setting" should be used if a model doesn't have an adapter specified.
 *
 * Keep in mind that options you define directly in your model definitions
 * will override these settings.
 *
 * For more information on adapter configuration, check out:
 * http://sailsjs.org/#documentation
 */

/**
 * In production environments, lets talk to the real database, otherwise, use the local
 * one on the box development and testing purposes
 *
 * Note:    Ideally we'd like to get this from sails.config.getEnvironment, but at 'lift' time,
 *          that function may not have been exported by the 'local' module yet, so we're forced
 *          to replicate the logic here.
 *
 * @returns {string}
 * @private
 */

var fs = require('fs');

function _getMongoAddress(){
    if(process.env.MONGO_ADDRESS){
        return process.env.MONGO_ADDRESS;
    }
    else{
    }
    return "ec2-54-174-159-246.compute-1.amazonaws.com"; //Production DB
    // return "ec2-54-84-227-113.compute-1.amazonaws.com";  //Test DB
}

function _getSQLAddress(){
    return "phenomapp-product-prod.caa7mgt2wqzg.us-east-1.rds.amazonaws.com";
}

module.exports.connections = {
    /**
     * Default data source, contains information such as
     *   -Lockers
     *   -Moments
     *   -Notifications
     *   -OAuth tokens
     *   -User data
     */
    mongo: {
        adapter: 'sails-mongo',
        host: _getMongoAddress(),
        port: 27017,
        user: 'phenomReadWrite',
        password: '__N0d13h$__',
        database: 'phenom-data'
    },

    /**
     * Internal Product data source, RDS-hosted, VK-backed
     */
    productDB: {
        module: 'sails-mysql',
        host:     _getSQLAddress(),
        port:     3306,
        user:     "phenomRead",
        password: "__N0d13h$__",
        database: "product",
        ssl:      "Amazon RDS"
    }
};