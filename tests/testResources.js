 /**
 *
 * Phenom Backend Integration Tests Resource Bundle
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Generates a bundle which can be passed to each controller/service test which
 * provides access to configuration, the models, and http services which can
 * be configured automatically with oauth 
 *
 **/

var config = require('./testConfig.js');
var requestMod = require('supertest');
var request = undefined;
var Promise = require('bluebird');

function _sleep(time) {
	var stop = new Date().getTime();
	while(new Date().getTime() < stop + time) {
		;
	}
}

function Resources(){
	//test user
	this.testUser = config.testUser;
	this.testUser2 = config.testUser2;
				
	//auth stuff
	this.clientSecret = config.auth['client-secret'];
	this.clientId = config.auth['client-id'];
	
	this.sails = undefined;
	this.bearerToken = undefined;
	this.refreshToken = undefined;

	//Indix stuff
	this.Indix = config.Indix;

	//Product stuff
	this.testProduct = config.testProduct;
	this.testProduct2 = config.testProduct2;
	this.testProductInternalId = undefined;
    this.testProductInternalId2 = undefined;

	//Moment stuff
	this.testMoment = config.testMoment;
};

Resources.prototype.getBearerToken = function(){
	return this.bearerToken;
};

Resources.prototype.getRefreshToken = function(){
	return this.refreshToken;
};

Resources.prototype.getSails = function(){
	return this.sails;
};

//create these hooks once the sails app has been lifted
Resources.prototype.setSails = function(app){
	this.sails = app;
	request = requestMod(sails.hooks.http.app);
}

Resources.prototype.setBearerToken = function(token, refreshToken){
	this.bearerToken = token;
	this.refreshToken = refreshToken;
}

Resources.prototype.GET = function(uri, queryArgs, next){
	request.get(uri)
		.query(queryArgs)
		.set('Authorization', 'Bearer ' + this.getBearerToken())
		.set('APIVersion', config.APIVersion)
		.end(next);
}

Resources.prototype.POST = function(uri, postData, next){
	request.post(uri)
		.set('Content-Type', 'application/json')
		.send(postData)
		.set('Authorization', 'Bearer ' + this.getBearerToken())
		.set('APIVersion', config.APIVersion)
		.end(next);
}

Resources.prototype.POSTPromise = function(uri, postData){
	var self = this;
	return new Promise(function(resolve, reject){
		request.post(uri)
			.set('Content-Type', 'application/json')
			.send(postData).set('Authorization', 'Bearer ' + self.getBearerToken())
			.set('APIVersion', config.APIVersion)
			.end(function(err, resp){
				if(err){
					reject(err);
				}
				else{
					resolve(resp);
				}
			});
	});
}

Resources.prototype.PUT = function(uri, putData, next){
	request.put(uri)
		.set('Content-Type', 'application/json')
		.set('APIVersion', config.APIVersion)
		.send(putData)
		.set('Authorization', 'Bearer ' + this.getBearerToken())
		.end(next);
}

Resources.prototype.DELETE = function(uri, delData, next){
	request.del(uri)
		.set('APIVersion', config.APIVersion)
		.set('Content-Type', 'application/json')
		.send(delData).set('Authorization', 'Bearer ' + this.getBearerToken())
		.end(next);
}

//////////////////// Helper for user-related tests and setup //////////////////
Resources.prototype.deleteAllUsers = function(){
	var self = this;

	return self.getSails().models.user.find({})
	.then(function(users){
		var destroyPromises = [];

		users.forEach(function(user){
			destroyPromises.push(user.destroy());
		});

		return Promise.settle(destroyPromises);
	})
	.then(function(results){
		return self.getSails().models.userprivate.find({});
	})
	.then(function(users){
		var destroyPromises = [];

		users.forEach(function(user){
			destroyPromises.push(user.destroy());
		});

		return Promise.settle(destroyPromises);
	});
}

/*
 *   Creates two test users
 */
Resources.prototype.ensureTestUser = function(){
	var self = this;

	return self.deleteAllUsers()
	.then(function(){
		//the cleanest way to create a user is just to go through the API, but we assume that everything
		//worked for this step, it's tested elsewhere
		return self.POSTPromise('/user', {
			client_id: config.auth['client-id'],
			client_secret: Buffer(config.auth['client-secret'], 'utf8').toString('base64'),
			firstName: config.testUser.firstName,
			lastName: config.testUser.lastName,
			username: config.testUser.username,
			password: Buffer(config.testUser.password, 'utf8').toString('base64'),
			email: config.testUser.email,
			suppressEmail: true
		});
	})
	.then(function(resp){
		return self.POSTPromise('/user', {
			client_id: config.auth['client-id'],
			client_secret: Buffer(config.auth['client-secret'], 'utf8').toString('base64'),
			firstName: config.testUser2.firstName,
			lastName: config.testUser2.lastName,
			username: config.testUser2.username,
			password: Buffer(config.testUser2.password, 'utf8').toString('base64'),
			email: config.testUser2.email,
			suppressEmail: true
		});
	})
	.then(function(resp){
		return Promise.resolve(true);
	});
}

Resources.prototype.ensureTestClient = function(){
	var self = this;

	//destroy all the clients
	return self.getSails().models.client.destroy({})
		.then(function() {
			//make sure that the client db has the appropriate credentials
			return self.getSails().models.client.create({
				name: "test",
				clientId: config.auth['client-id'],
				clientSecret: config.auth['client-secret']
			});
		})
		.then(function(client){
			return Promise.resolve('something');
		});
}

Resources.prototype.ensureTestProduct = function() {
	var self = this;

	return self.getSails().models.product.destroy({})
		.then(function(){
			var toCreate = {
				sourceId: config.testProduct.sourceId,
				sourceProductId: config.testProduct.sourceProductId,
				name: config.testProduct.name,
				description: config.testProduct.description,
				imageUrl: config.testProduct.imageUrl,
				productUrl: config.testProduct.productUrl,
				sku: config.testProduct.sku,
				brand: config.testProduct.brand,
				colors: config.testProduct.colors,
				categories: config.testProduct.categories,
				alternateImages: config.testProduct.alternateImages
			};

			return self.getSails().models.product.create(toCreate);
		})
        .then(function(product){
            //cache the model id for future tests
            self.testProductInternalId = product.id;

            var toCreate = {
                sourceId: config.testProduct2.sourceId,
                sourceProductId: config.testProduct2.sourceProductId,
                name: config.testProduct2.name,
                description: config.testProduct2.description,
                imageUrl: config.testProduct2.imageUrl,
                productUrl: config.testProduct2.productUrl,
                sku: config.testProduct2.sku,
                brand: config.testProduct2.brand,
                colors: config.testProduct2.colors,
				categories: config.testProduct2.categories,
				alternateImages: config.testProduct2.alternateImages
            };

            return self.getSails().models.product.create(toCreate);
        })
		.then(function(product) {
            self.testProductInternalId2 = product.id;

			return Promise.resolve(product.id);
		});
}

Resources.prototype.ensureTestLocker = function(){
	var self = this;
	var testProduct1 = undefined;
    var testProduct2 = undefined;
	var user = undefined;
    var user2 = undefined;

	return self.getTestProduct()
	.then(function(thisTestProduct) {
        testProduct1 = thisTestProduct;

        return self.getTestProduct2();
    })
    .then(function(testProduct){
        testProduct2 = testProduct;

		return self.getTestUser();
	})
	.then(function(thisUser){
        user = thisUser;

        return self.getTestUser2();
    })
    .then(function(testUser){
        user2 = testUser;

        return self.getSails().models.lockeritem.destroy({});
	})
	.then(function(){
		return self.getSails().models.lockeritem.create({
			targetProduct: testProduct1.id,
			sourceUser: user.id,
			entryType: self.getSails().models.lockeritem.lockerEntryTypes.PRODUCT
		});
	})
	.then(function(){
		return self.getSails().models.lockeritem.create({
			targetProduct: testProduct1.id,
			sourceUser: user2.id,
			entryType: self.getSails().models.lockeritem.lockerEntryTypes.PRODUCT
		});
	})
	.then(function(){
		return self.getSails().models.lockeritem.create({
			targetProduct: testProduct2.id,
			sourceUser: user.id,
			entryType: self.getSails().models.lockeritem.lockerEntryTypes.PRODUCT
		});
	})
	.then(function(){
		return self.getSails().models.userproductdata.create({
			userId: user.id,
			product: testProduct1.id
		});
	})
	.then(function(){
		return self.getSails().models.userproductdata.create({
			userId: user.id,
			product: testProduct2.id
		});
	})
	.then(function(){
		return self.getSails().models.userproductdata.create({
			userId: user2.id,
			product: testProduct1.id
		});
	})
    .then(function(){
        return self.getSails().models.productmetadata.create({
            product: testProduct1.id,
            lockerCount: 2
        });
    })
    .then(function(){
        return self.getSails().models.productmetadata.create({
            product: testProduct2.id,
            lockerCount: 1
        });
    })
	.then(function(){
		return Promise.resolve('something');
	});
}

/*
 *   Requires ensureTestLocker to make sure product is in user's locker
 */
Resources.prototype.ensureTestMoment = function(){
	var self = this;
	var testProduct = undefined;

	self.getSails().models.moment.destroy({})
	.then(function(){
		return self.getTestProduct();
	})
	.then(function(thisTestProduct){
		testProduct = thisTestProduct;
		return self.getTestUser();
	})
	.then(function(user){
		return self.getSails().models.moment.create({
			productIds: [testProduct.id],
			headline: config.testMoment.headline,
			song:  "someSong",
			createdAt:  (new Date()).getTime()
		});
	})
	.then(function(newMoment){
		return Promise.resolve(newMoment);
	});
}


Resources.prototype.getTestUser = function() {
	return this.getSails().models.user.findOne({username: config.testUser.username});
}

Resources.prototype.getTestUser2 = function() {
	return this.getSails().models.user.findOne({username: config.testUser2.username});
}

Resources.prototype.getTestProduct = function(){
	return this.getSails().models.product.findOne({sourceProductId: config.testProduct.sourceProductId});
}

 Resources.prototype.getTestProduct2 = function(){
     return this.getSails().models.product.findOne({sourceProductId: config.testProduct2.sourceProductId});
 }

Resources.prototype.ensureAllTheThings = function(){
	var self = this;

	return self.ensureTestClient()
	.then(function(){
		return self.ensureTestUser();
	})
	.then(function(){
		return self.ensureTestProduct();
	})
	.then(function(){
		return self.ensureTestLocker();
	});
}

Resources.prototype.ensureTestUserAuthorized = function(){
	var self = this;	

	return new Promise(function(resolve, reject){
		self.POST('/oauth/token', {
			client_id: config.auth['client-id'],
			client_secret: Buffer(config.auth['client-secret'], 'utf8').toString('base64'),
			username: config.testUser.username,
			password: Buffer(config.testUser.password, 'utf8').toString('base64'),
			grant_type: 'password'
		}, function(err, res){
			if(err){
				reject(err);
				return;
			}

			var resJSON = JSON.parse(res.text);
			self.setBearerToken(resJSON.access_token, resJSON.refresh_token);
			resolve('something');
		});
	});
}

Resources.prototype.cloneObject = function(obj){
	var newObj = {};

	for(var attr in obj){
		if(obj.hasOwnProperty(attr)){
			newObj[attr] = obj[attr];
		}
	}

	return newObj;
};

Resources.prototype.getImagePath = function(){
	var imageData = "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";
    return new Buffer(imageData, 'base64');
}

Resources.prototype.deleteAllMomentImages = function(){
	var promises = [];

	return this.getSails().models.moment.find({})
	.then(function(moments){
		moments.forEach(function(moment){
			promises.push(moment.deleteAWSImage());
		});

		return Promise.settle(promises);
	});
}

module.exports = function(){
	return new Resources();
};