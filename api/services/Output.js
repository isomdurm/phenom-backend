/**
 *
 * Response Rendering Services
 *
 * @module      :: Output
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for rendering JSON via the Express 'res' parameter.
 * Functions assume that an Errors error is supplied.
 *
 **/

// Internal properties and functions
var Promise = require('bluebird');

var _mergeObjects = function(a, b){
	var merged = {};

	for(attr in a){
		merged[attr] = a[attr];
	}

	for(attr in b){
		merged[attr] = b[attr];
	}

	return merged;
};

//External functions
module.exports = {
	// Emits an error made by the client (>400)
	sendJSON: function(res, error, data){
		var toSend = _mergeObjects(error, {});
		
		//merge data properties with the error object
		if(data){
			toSend = _mergeObjects(toSend, data);
		}

		//emit response with JSON
		res.json(toSend);
	},

	renderDefaultControllerActionView: function(res, title){
		res.view({
			title: title
		});
	},

	renderSuccess: function(res){
		res.view("success", {
			title: 'SUCCESS'
		});
	},

	renderFailure: function(res, error){
		var errorMessage = "";
		
		if(error.pipeToUser){
			errorMessage = error.errorMessage;
		}

		res.view("failure", {
			title: 'ERROR',
			error: errorMessage
		});
	}
};