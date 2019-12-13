/**
 *
 * PhenomApp API
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Main entrypoint
 *
 **/

var cluster = require('express-cluster');

var options = {};

if(process.env.CLUSTER_COUNT_OVERRIDE){
	options.count = process.env.CLUSTER_COUNT_OVERRIDE;
}

cluster(function(worker){
	require('sails').lift({
		hooks: {
			sockets: false,
			pubsub: false,
			session: false
		}
	});
}, options);


