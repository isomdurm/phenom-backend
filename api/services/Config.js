/**
 *
 * Global App Configuration
 *
 * @module      :: Config
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 *
 **/

var momentjs = require('moment');

function _S3UserBucketName(){
	//sails config var available globally at this point
	if(sails.config.environment === 'production'){
		return "phenomapp";
	}
	else{
		return "phenomapp";
	}
}

function _userCloudFrontUrl(){
	return "https://d1m9cftgf9ypai.cloudfront.net";
}

function _S3ProductBucketName(){
	return "phenomapp-product-prod";
}

function _S3ProductImageFolderPrefix(){
	return 'productImages';
}

function _S3BrandImageFolderPrefix(){
	return 'brandImages';
}

function _productCloudFrontUrl() {
	return "https://d244enpr8fckgo.cloudfront.net";
}

function _S3ProfileImageFolderPrefix(){
	if(sails.config.environment === 'production'){
		return "profileImages";
	}
	else{
		return "profileImages";
	}
}

function _S3MomentImageFolderPrefix(){
	if(sails.config.environment === 'production'){
		return "momentImages";
	}
	else{
		return "momentImages";
	}
}

function _S3MomentVideoFolderPrefix(){
	if(sails.config.environment === 'production'){
		return "momentVideos";
	}
	else{
		return "momentVideos";
	}
}

function _S3MomentVideoImageFolderPrefix(){
	if(sails.config.environment === 'production'){
		return "momentVideoImages";
	}
	else{
		return "momentVideoImages";
	}
}

function _iOSArn(){
	if(process.env.APNS_ENV && process.env.APNS_ENV === 'production'){
		return 'a';
	}
	else{
		return 'arn:aws:sns:us-east-1:503450129555:app/APNS_SANDBOX/IOS-DEV';
	}
}

function _ElasticsearchEndpoint() {
    return "ec2-54-152-70-166.compute-1.amazonaws.com:9200";
}

function _getKeenConfig(){
	return {
		projectId: "5537e8e996773d61efc68404",
		writeKey: "70b168233cdd34440a97319636a750c1d98ab9fba1ef1aabf7903293a3caa0cc803b62be1809e01d85e28a8ff1a946dfb452e09fbde0228fc06ebc500824ad3d4932a539762324dbb907db00ffd5e52306093f4d5856c9162ae6eedbe81dee208b2ae9ed32046ac4932519b87288ab8a"
	};
}

function _getMixpanelConfig() {
	if (process.env.APNS_ENV && process.env.APNS_ENV === 'production'){
		return {
			token: '42667009a478dcd7aa28a9341489f482',
			key: '6396b97b00f7ae29cbd20257518fa91e',
			secret: 'cf8d381c3867f674f529f6c93184a10c'
		};
	}

	return {
		token: 'a3cf511b5b60d4b50c2e230a9d4f3de8',
		key: '5a0054a4baabba3daa861b213d1bac1d',
		secret: '6884b00ac2e919cffb6d74df1f70172c'
	};
}

module.exports = {
	oauth: {
		client_name: 'phenomapp-ios-v2',
		client_id: 'chLsgAqWLqXGPsWDKACcAhobUmZrxpdZowOOwyPpFEBPHDQYGO',
		client_secret: 'bUlnLZxQmeXCcvZSgHEaBbkTqfaqqObWlObRiMMgkcrmLXEJzJ',
		tokenLifeTime:  3600
	},

	API: {
		minimumSupportedVersion: '1.2.3'
	},

	User: {
		userPageSize: 50
	},

	passwordReset: {
		tokenLifetime:  86400000 //24 hours
	},

	dataSourceIds: {
		Indix:   0,
		ITMS:    1,
		Spotify: 2,
        Elasticsearch: 3
	},

	Indix: {
		pageSize: 10   //note that the current Indix API hard codes this value to 10, not much we can do about that
	},

	AWS: {
		config:  {
			accessKeyId:       "AKIAI2IRGRNQ5WPGVMMA",
			secretAccessKey:   "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",
			region: 		   ""
		},
		getUserS3Bucket:                 _S3UserBucketName,
		getProfileImageFolderPrefix:     _S3ProfileImageFolderPrefix,
		getMomentImageFolderPrefix:      _S3MomentImageFolderPrefix,
		getMomenVideoFolderPrefix:       _S3MomentVideoFolderPrefix,
		getMomentVideoFolderPrefix: 	 _S3MomentVideoFolderPrefix,
		getMomentVideoImageFolderPrefix: _S3MomentVideoImageFolderPrefix,
		getUserCloudFrontUrl:            _userCloudFrontUrl,
		getProductS3Bucket:              _S3ProductBucketName,
		getProductS3FolderPrefix:        _S3ProductImageFolderPrefix,
		getProductCloudFrontUrl:         _productCloudFrontUrl,
		getBrandS3FolderPrefix:          _S3BrandImageFolderPrefix,
		cloudfront : {
			publicKey:   'APKAICX5P3L4OJ4DYBUQ',
			privateKey:  "-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEAka8F6zzw7+0u1pFoThnPBRM9oM81BRzsQOyi+GQaJq5pRpVo\nhcz31rn3zBQgVsaeGt9glYf6dD1BxNEYGb791Own3TTctZxUqMbn3bpGqN48mpEp\nIIgpie6S3iJK3H13glKdNa8FFP8g5ylY9HtJnsE4H+2ut2TyB78qlSEzlSr9tNyJ\npntrhuiJM1DhLtU0rpL7OgAwNo48Y8hAPhXfaKIcT+Z4aQ6kWtYKD0QRwN3VYFAQ\nQggWdwg4xfHJnWPMuP8gwxL18cu78OXamOYgAOAkoS6WTrvVx10fyKzJP3eiIH6x\nY/MlbiX68N4Tr07+mcTJJ3Q37Zbpz0C+je9DSwIDAQABAoIBAQCFtOI0zaDAQ6qK\nSbg2fh9vpAIa9jHOOIZo7AaC/LS3rbl3i6b7rmwFCndwOUSY//+Z4Ewv0TY/uv0C\n23lIH++tnPTVZC/xCsL0iGHEMbOqRxXOMs5RSkb9jhYDg+u7Q/gMhzA8Vh7O731O\nS7eV4xVlfCa7vxRsw1wTWhOF/YvvKbT1zjBOgcIO0V5yklX8/VqIq7pwWw2lp/37\nk0BA4nsCSpmxbnexih0XA5Cra7qsALzyvdUD9bj3MVqbdlvx1i/ZArYY2IZP6UDr\nb7MJXbV0WvDqw6fW53ovzI0eEWIDqoej6Iwkn0eCOgZan3f4lwYoU9Jn7suj5V7/\n6cmxm4GxAoGBAOztYADMfynHIaUKk1XW70iLdvuinL2GWgfl/tWVQ/d/4meU8HFO\nYzv3GDw+n6yT689PGISHhmZo7UfS6dW5jKbhU+tZGQzWXlfy4EV5vG2IEVfFp6aQ\nl2pDlNMw1MNpp4WR6MJzRtVPHONZ7NkkNwtD+JJ+yfGrRc8qZ6KPE7/5AoGBAJ1p\nSjXC0bTLEh7y6QOCNOAC7HP8m/BtazVH07VnioKj/BiG82sRLeWkSnX4HrpS/kBt\n1+ZKaR4Z4n9pA7Unf8EkcTBm9LwHaaihtWvQ5yDYUkuimW9oAHOJTb7G/9AM+mhH\nk36Qz6wNAAqM6VOrzCRZ403RO7/qqZWjwmnLmbZjAoGBAK6D1nAgMRaDz/tyQ745\nuD0WRUjqqUtMt+oTdla6QLsAXrLvWQAMvjmAM0DE2/ZRaqNj3mpYLR4n8YczCvxb\nVQfi915mXXZAPHPJuXpTRgDj9epR88BTxsQGDYxV7pIVs8hGBk2cfbNHN78bEMOM\n0mKg6Wp2q6cwAharZHSvsNt5AoGAcHDrn6eAYOLGGPFvXSA/YNz1xoxlX8LpV+/s\n3KIPoO4+f862Rn7JCEbpIYeRe4sZLzDHjisNF4Fp95UuHtMOQQslB2wj2cR5xwls\nLI3W6/FaJ8kITTo/SEiGDobb6OO8Y4ztYPVUQxQuOVsauLf5ZOYIpmeVhKu9Y7TM\nhQH41P0CgYEAmmz2ksRr1VxA0MHAg8deUnZ2qqBdmnBJ4XOY/iFOfbj8nvWN8fTI\nM9In9rqKAApgpB9n6x1DRNvCZtQf8qzPHv1cLanL0ORK4CU3jIxvDCroiE6IRChm\nef4sh1w3cnb4zaEo+L+IT9lK1ZnFmMiEPkej4ELAt1JI88kJaNIB6NE=\n-----END RSA PRIVATE KEY-----",
			linkExpiration:  function(){
				return (momentjs()).add(10, 'minutes').valueOf();
			}
		},
		SNS:{
			defaultRegion:       "us-east-1",
			apiVersion:          "2010-03-31",
			getiOSARN:           _iOSArn
		}
	},

	iTMS:{
		lookupUrl:  "http://itunes.apple.com/lookup",
		searchUrl:  "http://itunes.apple.com/search"
	},

	Spotify:{
        id: "phenomapp",
        defaultPlaylistId: "1QHuNn2F6ai4uIlkLweFfg",
		searchUrl:  "https://api.spotify.com/v1/search",
		lookupUrl:  "https://api.spotify.com/v1/tracks",
		searchLimit:  50,
        clientId:     '9d895ca79e0c498dba30324125aa8c8a',
        clientSecret: 'a102f0bcc02d4d9fa9445cf9a049508c'
	},

	Moment: {
		inappropriateEmailRecipient: "isom@phenomapp.com",
		inappropriateEmailMessage: function(photoUrl, song, momentId, user){
			return "A user (" + user.username + ") has flagged the following moment as inappropriate:\n\n\tmomentId: " + momentId + "\n\tphotoUrl:  " + photoUrl + "\n\tsong contents:  " + JSON.stringify(song) + "\n\tuserEmail:  " + user.email + "\n\nPlease verify that moment is indeed inappropriate, and delete if necessary.\n\nPhenom Support";
		},
		likesPageSize: 50,
		momentPageSize: 50
	},

	Notification:{
		pageSize: 50,
		defaultNotificationTimeBufferInMinutes: 10,
		defaultNotificationLimitBuffer:         5,
	},

	Email: {
		support: {
			address:  'support@phenomapp.com',
			pass: 'me904351'
		}
	},

	Locker:{
		lockerPageSize: 50
	},

	Elasticsearch: {
        url: _ElasticsearchEndpoint,
        defaultSize: 50
    },

    Discover:{
        defaultResultsPageSize: 50
    },

	Mailchimp:{
		APIKey:  "f0e599faefc2eabff76317e4a74ef1a8-us3"
	},

	Mandrill:{
		APIKey:  "MTGsRgI_hNkomaxzoG89iw"
	},

	Sendgrid: {
		APIKey: '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'
	},

	Facebook:{
		APIVersion: '2.3',
		clientId: '760934690591933',
		clientSecret: 'b2eeb76e707f31eb62ef2b73a1a29f8f',
		oauth: {
			tokenLifeTime: 2592000/* 30 days */
		},
		defaultPageSize: 50
	},

	Twitter:{
		APIVersion: '1.1',
		consumerKey: '6BSvm1jZxi6GJhxEYzCh0gHJZ',
		consumerSecret: 'UQncmgue4ZXh2DS22hjoXolJn3my1UJBwVpqkKYhjlf5pDOHbs',
		oauth: {
			tokenLifeTime: 2592000/* 30 days */
		},
		defaultPageSize: 50
	},

	Keen: _getKeenConfig(),

	MixPanel: _getMixpanelConfig()
};
