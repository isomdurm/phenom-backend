/**
 * Bootstrap
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * An asynchronous boostrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * In our case, we ensure that the default iOS client credentials are in the database.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#documentation
 */

var Promise = require('bluebird');

/**
 * Ensures that we have all of your default OAuth clients persisted properly
 * @returns {*}
 * @private
 */
function _ensureClientCredentials(){
	return Client.findOne({name: Config.oauth.client_name})
		.then(function(client){
			if(!client){
				return Client.create({
					name: Config.oauth.client_name,
					clientId: Config.oauth.client_id,
					clientSecret: Config.oauth.client_secret
				});
			}
			else{
				return Promise.resolve();
			}
		});
}

module.exports.bootstrap = function (cb) {
	_ensureClientCredentials()
	.then(function(){
		//make sure that AWS is configured
		S3Services.init();

		//Make that Notifications are up and working
		NotificationServices.init();

		//Make sure email is ready
		EmailServices.init();

		//Make sure Authorization logic is ready
		AuthServices.init();

		//Make sure FB is ready to go
		FacebookServices.init();

		//Make sure Twitter is ready to go
		TwitterServices.init();

		//Initialize the elastic search services
        ElasticsearchServices.init();

		//and we're done
		cb();
	})
	.catch(function(err){
		cb(err);
	});
};