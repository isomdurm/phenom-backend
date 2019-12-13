 /**
 *
 * Phenom Backend Integration Tests Global Configuration
 *

 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Global test configuration
 *
 **/

var config = require('../api/services/Config.js');

module.exports = {
	testUser: {
		username: 'testUserName',
		password: 'testUserPassword',
		firstName: 'testFirstName',
		lastName: 'testLastName',
		email: 'stephen@phenomapp.com',
		hometown: {
			city: 'Cleveland',
			state: 'OH'
		},
		sport: 'baseball'
	},

	testUser2: {
		username: 'testUserName2',
		password: 'testUserPassword2',
		firstName: 'testFirstName2',
		lastName: 'testLastName2',
		email: 'cory@phenomapp.com',
		hometown: {
			city: 'Cleveland',
			state: 'OH'
		},
		sport: 'baseball'
	},

	auth: {
		'client-id': 'id',
		'client-secret': 'secret'
	},	

	Indix: {
		testProductStoreName: "Nike"
	},

	testProduct:{
        sourceId:	 		1,
        sourceProductId:	"12345",
        name: 				"Nike",
        description: 		"Nike Test Product 1",
        imageUrl: 			"http://www.google.com",
        productUrl: 		"http://www.google.com",
        sku: 		    	"123456789",
		model:              "12345667",
        brand:          	'Nike',
		colors:         	'',
		categories:     	'',
		alternateImages:    ''
    },

    testProduct2:{
        sourceId:	 		2,
		sourceProductId:	"54321",
        name: 				"Adidas Product 1",
        description: 		"Test Product",
        imageUrl: 			"http://www.google.com",
        productUrl: 		"http://www.google.com",
        sku: 		    	"543215",
        upc:            	"12341234",
        brand:          	'Adidas',
		colors:				'',
		categories:         '',
		alternateImages: 	''
    },

	testMoment:{
		headline: "headline"
	},

	APIVersion: config.API.minimumSupportedVersion
};