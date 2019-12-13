/**
 *
 * User Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a persisted User object along with convience functions and passwork salting
 * hooks on create, save.
 *
 **/

var bcrypt = require('bcrypt');

var User = {
	connection: ['mongo'],
	
	attributes: {
		password: {
			type: 'STRING',
			defaultsTo: ''
		},
		passwordCompare: {
			type: 'STRING',
			defaultsTo: ''
		},
		userId: {
			type: 'STRING',
			required: true,
			notEmpty: true
		},
		forgotPasswordToken: {
			type: 'STRING',
			required: false,
			notEmpty: false,
			uuidv4:   true
		},
		forgotPasswordTokenTimestamp: {
			type: 'DATE',
			required: false,
			notEmpty: false
		},
		toJSON: function(){   //strip the password text out
			var obj = this.toObject();
			delete obj.password;
			delete obj.forgotPasswordToken;
			return obj;
		},
		comparePassword: function(password, next){
			bcrypt.compare(password, this.password, function(err, match){
				if(err){
					sails.log.error("BCrypt failure", err);
				}

				next(match);
			});
		}
	},

	beforeCreate: function(user, next){     //best to not leave this around as plain text
		bcrypt.genSalt(10, function(err, salt){
			bcrypt.hash(user.password, salt, function(err, hash){
				if(err){
					sails.log.error(err);
					next(err);
				}
				else{
					user.password = hash;
					user.passwordCompare = hash;
					next(null, user);
				}
			});
		});
	},

	beforeUpdate: function(user, next){ 
		//first make sure that the password has been changed
		if(user.password == user.passwordCompare){
			next(null, user);
		}
		else{
			//the password has been changed, let's salt the new one
			bcrypt.genSalt(10, function(err, salt){
				bcrypt.hash(user.password, salt, function(err, hash){
					if(err){
						sails.log.error(err);
						next(err);
					}
					else{
						user.password = hash;
						user.passwordCompare = hash;
						next(null, user);
					}
				});
			});
		}
	}
};

module.exports = User;