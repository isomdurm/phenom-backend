/**
 *
 * Utility to Import New Users from SquareSpace
 *
 * @author      :: Isom Durm (isom@phenomapp.com)
 * @dateCreated :: 7/30/2014
 *
 * Given an XML export, import new users into the Phenom API backend
 *
 **/

var Q = require("q");
var fs = require('fs')
var csv = require('fast-csv');
var guid = require('node-uuid');

var request = require('request'), 
    qs = require('querystring'), 
    newUserEndpoint = 'https://api.phenomapp.com:8081/user';

var filePath = "";
process.argv.forEach(function(val, index, array){
	if(index == 2){
		filePath = val;
	}
});

//1. Parse the inputs into a DOM
//2. Verify unique email AND user, fail otherwise
//3. Write public User model
//4. Write private User model
readFile(filePath)
.then(function(data){
	return parseCSV(data);
})
.then(function(result){
	return addTempPasswords(result);
})
.then(function(results){
	return saveRecords(results);
})
.then(function(results){
	return writeResults(results);
})
.then(function(result){
	console.log("Done.");
})
.fail(function(err){
	console.log(err);
});


//helper functions
function readFile(filePath){
	var deferred = Q.defer();

	console.log('Reading file:  ' + filePath);

	fs.readFile(filePath, function(err, data){
		if(err){
			deferred.reject(err);
		}
		else{
			deferred.resolve(data);
		}
	});

	return deferred.promise;
};

function parseCSV(csvString){
	var deferred = Q.defer();
	var records = [];

	console.log('Parsing xml...');

	csv.fromString(csvString, {headers: true})
	.on("record", function(data){
		records.push(data);
	})
	.on('end', function(){
		deferred.resolve(records);
	});

	return deferred.promise;
};

function addTempPasswords(records){
	return Q.fcall(function(){
		records.forEach(function(record){
			record.password = guid.v4().replace(/-/g, "").substring(0,12);
		});

		return records;
	});
};

function saveRecords(records){
	var deferred = Q.defer();

	var promises = [];
	var completed = [];

	records.forEach(function(record){
		promises.push(saveRecord(record));
	});

	Q.allSettled(promises)
	.then(function (results) {
    	results.forEach(function (result) {
    	    if (result.state === "fulfilled") {
    	       completed.push(result.value);
    	    } 
    	    else {
    	        console.log(result.reason);
    	    }
    	});

    	deferred.resolve(completed);
    });

	return deferred.promise;
};

function saveRecord(record){
	var deferred = Q.defer();

	
	makeRequest(record)
	.then(function(result){
		console.log("Saved 1 new record");
		deferred.resolve(record);
	})
	.fail(function(err){
		deferred.reject(err);
	});

	return deferred.promise;
};

function makeRequest(record){
	var deferred = Q.defer();

	var pass = new Buffer(record.password, 'utf8').toString('base64');

	var qs = {
		firstName: record['First Name'],
		lastName: record['Last Name'],
		password: pass,
		username: record['Desired Username'],
		email: record['Email Address'],
		client_secret: 'NGI3YTE1NWItNjEyOC00NDVhLWEwNTMtMjg0MDY5MTY2MDc4',
		client_id:  '1c8f8395-bb98-4eca-9c6c-07a58ccd7e65',
		supressEmail: true
	};

	var options = {
		url:  newUserEndpoint,
		method: "POST",
		strictSSL: false,
		rejectUnhauthorized : false,
		qs: qs
	};

	request(options, function(err, resp, body){
		body = JSON.parse(body);
		if(err){
			deferred.reject(err);
		}
		else if(!body.hasOwnProperty('errorCode'))
		{
			deferred.reject(new Error('Unrecognized response from the phenom backend'));
		}
		else if(body.hasOwnProperty('errorCode')
			& body.errorCode != 200)
		{
			deferred.reject(new Error(body.errorCode + ' Error from phenom backend, ' +  body.errorMessage + ' for Desired Username:  ' + options.qs.username + ' , ' + options.qs.email));
		}
		else{
			deferred.resolve(body);
		}
	});

	return deferred.promise;
}

function writeResults(results){
	var deferred = Q.defer();

	csv.writeToPath("./results.csv", results, {headers: true,
		transform: function(row){
			return {
				'Submitted On': row['Submitted On'],
				'First Name': row['First Name'],
				'Last Name': row['Last Name'],
				'Email Address': row['Email Address'],
				'Instagram Handle': row['Instagram Handle'],
				'Desired Username': row['Desired Username'],
				'Temporary Password': row.password
			};
		}})
	.on('finish', function(){
		deferred.resolve(true);
	});

	return deferred.promise;
}
