 /**
 *
 * Phenom Backend Integration Tests
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Performs Integration tests over the varios Model/Controller actions with a running
 * instance of Sails.js.  
 *
 * To run the test suite, make sure the sails-disk sails adapter is installed, and execute
 *		sudo mocha testMain.js
 *
 **/


var Sails = require('sails');
var app = undefined;
var resources = require('./testResources.js')();
var fs = require('fs');
var chai = require('chai');

//Lift sails (global)
before(function(done){
	//remove any old test artifacts
	fs.unlink('./.tmp/mongo.db', function(err){
		//ignore any error
		fs.unlink('./.tmp/productDB.db', function(err) {
			Sails.lift({
				csrf: false,
				log:{
					level:'error'
				},

				// turn down the log level so we can view the test results
				log: {
					level: 'silent'
				},

				// redirect persistence to local disk
				connections: {
					mongo: {      //redirect db calls to a local file for testing
						module: 'sails-disk'
					},
					productDB: {
						module: 'sails-disk'
					}
				},

				models: {
					migrate: 'safe'  //prevent annoying menu when lifting
				},

				globals: {
					sails: true
				}
			}, function(err, sails){
				//override SQLish stuff, we divert to local disk adapter
				sails.models.product.attributes.id.defaultsTo = 0;

				if(!resources.getSails()){
					resources.setSails(sails);
					done(err, sails);
				}
			});
		});
	});

});

//////////////////////////  Test Modules /////////////////////////////
describe("Verify Sails", function(){
	it("Test is sails app is up and running", function(done){
		chai.expect(resources.getSails()).to.be.an('object');
		done();
	});
});

describe("User Tests", require('./userTests.js')(resources));
describe("OAuth Tests", require('./authTests.js')(resources));
describe("Change Password Tests", require('./changePasswordTests.js')(resources));
describe("Locker Tests", require('./lockerTests.js')(resources));
describe("Moment Tests", require('./momentTests.js')(resources));
describe("AWS Tests", require('./awsTests.js')(resources));
describe("Discover Tests", require('./discoverTests.js')(resources));
describe("Spotify Tests", require('./spotifyTests.js')(resources));
describe("Comment Tests", require('./commentTests.js')(resources));
describe("Product Tests", require('./productTests.js')(resources));

/**
 * DEPRECATED
 *   describe("Indix Service Tests", require('./indixTests.js')(resources));
*/

// Things to do after tests finish
after(function(done){
	//Lower Sails
	resources.getSails().lower(function(){
		//clear the temporary database
		fs.unlink('./.tmp/mongo.db', function (err) {
			fs.unlink('./.tmp/productDB.db', function (err) {
				done()
			});
		});
	});
});