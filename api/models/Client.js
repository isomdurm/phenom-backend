/**
 *
 * Client Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a persisted Client for OAtuh purposes
 *
 **/

var bcrypt = require('bcrypt');

module.exports = {
	connection: ['mongo'],
	
	attributes: {
		name: {
			type: 'string',
			unique: true,
			required: true
		},
		clientId: {
			type: 'string',
			unique: true, 
			required: true
		},
		clientSecret: {
			type: 'string',
			required: true
		},
		compareSecret: function(secret, next){
			bcrypt.compare(secret, this.clientSecret, function(err, match){
				if(err){
					sails.log.error("BCrypt failure", err);
				}

				next(match);
			});
		}
	},
	beforeCreate: function(client, next){     //best to not leave this around as plain text
		bcrypt.genSalt(10, function(err, salt){
			bcrypt.hash(client.clientSecret, salt, function(err, hash){
				if(err){
					sails.log.error(err);
					next(err);
				}
				else{
					client.clientSecret = hash;

					next(null, client);
				}
			});
		});
	},

	beforeUpdate: function(user, next){     //best to not leave this around as plain text
		bcrypt.genSalt(10, function(err, salt){
			bcrypt.hash(client.clientSecret, salt, function(err, hash){
				if(err){
					sails.log.error(err);
					next(err);
				}
				else{
					client.clientSecret = hash;
					next(null, user);
				}
			});
		});
	}
};