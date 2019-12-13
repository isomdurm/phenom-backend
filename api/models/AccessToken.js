/**
 *
 * AccessToken Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a persisted Access Token
 *
 **/

var Promise = require('bluebird');

var _types = {
	PHENOM:   0,
	FACEBOOK: 1,
	TWITTER:  2
};

module.exports = {
	connection: ['mongo'],

	TokenTypes: _types,

	attributes: {
		user: {
			model: 'user',
			required: true
		},
		client: {
			model: 'client',
			required: true
		},
		token: {
			type: 'string',
			unique: true,
			required: true
		},
		type: {
			type: 'integer',
			defaultsTo: _types.PHENOM
		},
		twitterAccessToken:{
			type: 'string',
			defaultsTo: ''
		},
		twitterTokenSecret: {
			type: 'string',
			defaultsTo: ''
		},
		facebookAccessToken:{
			type: 'string',
			defaultsTo: ''
		}
	},

	beforeDestroy: function(criteria, next){
		//this shouldn't happened, but who knows
		if(!(criteria.hasOwnProperty('where'))
			|| !(criteria.where)
			|| !(criteria.where.hasOwnProperty('id'))
			|| !(criteria.where.id))
		{
			next();
			return;
		}

		var thisToken = undefined;

		AccessToken.findOne({id: criteria.where.id})
			.then(function(token){
				if(token){
					thisToken = token;
					NotificationTarget.find({accessTokenId:  token.id})
						.then(function(targets){
							//since this token is going away, we can remove the notification targets
							var removePending = [];

							targets.forEach(function(target){
								removePending.push(target.destroy());
							});

							return Promise.settle(removePending);
						})
						.then(function(){
							next();
						})
						.catch(function(err){
							throw err;  //throw to outer chain
						});
				}
				else{
					next();
				}
			})
			.catch(function(err){
				//log and error and keep going
				sails.log.error(err);
				next();
			})
	}
};