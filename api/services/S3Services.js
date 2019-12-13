/**
 *
 * S3 Services
 *
 * @module      :: S3 Services
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for uploading and downloading images from Amazon AWS S3
 *
 **/
var Promise = require('bluebird');
var AWS = require('aws-sdk');
var cf = require('aws-cloudfront-sign');
var lwip = require('lwip');
// var Moment = require('moment');
var ExifImage = require('exif').ExifImage;
var util = require('util');

// global Config

var _imageSizes = {
    ORIGINAL:   0,
    CROPPED:    1,
    THUMBNAIL:  2,
    TINY:       3
};

/**
 * Square-crops and then resizes JPEG image data
 *
 * @param imageData - image data to resize
 * @param imageSize - target size
 * @param croppingRect - opt {Left, Top, Right, Bottom}
 * @returns {Promise} resolves with resized image data (square-cropped and then resized)
 * @private
 */
function _resizeImage(imageData, imageSizeMax, croppedRect) {

    var _openBuffer = function (buffer) {

        return new Promise(function (resolve, reject) {
            lwip.open(buffer, 'jpg', function (err, image) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(image);
                }
            });
        });
    };

    var _centerCrop = function (image) {
        //pick either the smallest height or width
        var edgeLength = image.height() <= image.width() ? image.height() : image.width();

        return new Promise(function (resolve, reject) {
            if(croppedRect
                && croppedRect.hasOwnProperty('top')
                && croppedRect.hasOwnProperty('left')
                && croppedRect.hasOwnProperty('bottom')
                && croppedRect.hasOwnProperty('right')
            ){
                image.crop(croppedRect.left, croppedRect.top, croppedRect.right, croppedRect.bottom, function (err, croppedImage) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(croppedImage);
                    }
                });
            }
            else if (image.height() == image.width()) {
                resolve(image);
            }
            else {
                image.crop(edgeLength, edgeLength, function (err, croppedImage) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(croppedImage);
                    }
                });
            }
        });
    };

    var _resize = function (image) {
        return new Promise(function (resolve, reject) {

            if(!imageSizeMax.hasOwnProperty('height') || !imageSizeMax.hasOwnProperty('width')){
                reject(new Error('Target image size not in proper format'));
            }
            else if(image.width() > imageSizeMax.width || image.height() > imageSizeMax.height)
            {
                image.resize(imageSizeMax.height, imageSizeMax.width, function (err, resizedImage) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(resizedImage);
                    }
                });
            }
            else{
                //we're already within the sizing limit
                resolve(image);
            }

        });
    };

    var _toBuffer = function(image){
        return new Promise(function(resolve, reject){
            image.toBuffer('jpg', function(err, buffer){
                if(err){
                    reject(err);
                }
                else{
                    resolve(buffer);
                }
            });
        });
    };

    var _normalizeRotation= function(imageBuffer){
        return new Promise(function(resolve, reject){
            try {
                new ExifImage({ image : imageBuffer }, function (error, exifData) {
                    if (error){
                        reject(error);
                    }
                    else{

                        _openBuffer(imageData)
                        .then(function(image){

                            //if we have orientation data, lets make sure it's normalized (no rotation)
                            if(exifData.hasOwnProperty('image') && exifData.image.hasOwnProperty('Orientation') && exifData.image['Orientation'] > 0){

                                var rotationAmount = 0.0;

                                switch(exifData.image['Orientation']) {
                                    case 3:
                                        rotationAmount = 180.0;
                                        break;
                                    case 6:
                                        rotationAmount = 90.0;
                                        break;
                                    case 8:
                                        rotationAmount = -90.0;
                                    default:
                                        break;
                                }

                                if(rotationAmount > 0){
                                    image.rotate(rotationAmount, function(err, rotatedImage){
                                        if(err){
                                            reject(err);
                                        }
                                        else{
                                            resolve(rotatedImage);
                                        }
                                    });
                                }
                                else {
                                    resolve(image);
                                }
                            }
                            else{
                                resolve(image);
                            }
                        })
                        .catch(function(err) {
                            reject(err);
                        });
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    };

    return new Promise(function (resolve, reject) {
        _normalizeRotation(imageData)
        .then(function (image) {
            return _centerCrop(image);
        })
        .then(function (image) {
            return _resize(image);
        })
        .then(function(image){
            //resolve with a raw Buffer
            return _toBuffer(image);
        })
        .then(function(imageBuffer){
            resolve(imageBuffer);
        })
        .catch(function (err) {
            reject(err);
        });
    });

}

function _getAWSConfig(){
	return {
		accessKeyId:     Config.AWS.config.accessKeyId,
		secretAccessKey: Config.AWS.config.secretAccessKey
	};
}

function _getAWSCloudfrontConfig(lifetime){
	var newLifetime = Config.AWS.cloudfront.linkExpiration();
	if(lifetime){
		newLifetime = lifetime;
	}

	return {
		keypairId:  		Config.AWS.cloudfront.publicKey,
		privateKeyString: 	Config.AWS.cloudfront.privateKey,
		expireTime:         new Date(newLifetime)
	};
}

function _getUserCloudfrontURL(key, imageSize, type, lifetime){
	var endpoint = Config.AWS.getUserCloudFrontUrl() + "/" + type + "/" + key;

    if(imageSize == _imageSizes.THUMBNAIL){
        endpoint = endpoint + '_thumb';
    }
    else if(imageSize == _imageSizes.TINY){
        endpoint = endpoint + '_tiny';
    }
    else if (imageSize == _imageSizes.CROPPED){
        endpoint = endpoint + '_cropped';
    }
    else{
        // no modification
    }

    //Signed URLs are currently disabled due to their extreme expense
	//return Promise.resolve(cf.getSignedUrl(endpoint, _getAWSCloudfrontConfig(lifetime)));
    return Promise.resolve(endpoint);
}

function _getProductCloudfrontURL(key)
{
    return util.format("%s/%s/%s",
        Config.AWS.getProductCloudFrontUrl(), Config.AWS.getProductS3FolderPrefix(), key
    );
}

function _getBrandCloudfrontURL(brand){
    return util.format("%s/%s/%s",
        Config.AWS.getProductCloudFrontUrl(), Config.AWS.getBrandS3FolderPrefix(), brand
    );
}

function _uploadUserData(folderPrefix, key, data){
	var s3 = new AWS.S3();

	return new Promise(function(resolve, reject){
		s3.putObject({
			Bucket: 	Config.AWS.getUserS3Bucket(),
			Key: 		folderPrefix + "/" + key,
			Body: 		data
		}, function(err, res){
			if(err){
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
}

function _uploadProfileImage(key, data){
    //we need image size variants for profile images including:
    //  -Thumbnail
    //  -Tiny

    var responses = {};

	return _uploadUserData(Config.AWS.getProfileImageFolderPrefix(), key, data)
        .then(function(resp){
            responses.original = resp;
            return _resizeImage(data, {height: 250, width: 250});
        })
        .then(function(resizedImage){
            return _uploadUserData(Config.AWS.getProfileImageFolderPrefix(), key + '_thumb', resizedImage);
        })
        .then(function(resp){
            responses.thumb = resp;
            return _resizeImage(data, {height: 75, width: 75});
        })
        .then(function(resizedImage){
            return _uploadUserData(Config.AWS.getProfileImageFolderPrefix(), key + '_tiny', resizedImage);
        })
        .then(function(resp){
            responses.tiny = resp;
            return Promise.resolve(responses);
        });
}

function _uploadMomentVideoImage(key, croppedRect, moment, data){

    var responses = {};

    return _uploadUserData(Config.AWS.getMomentVideoImageFolderPrefix(), key, data)
        .then(function(resp){
            responses.original = resp;
            return _resizeImage(data, {height: 250, width: 250}, croppedRect);
        })
        .then(function(resizedImage){
            return _uploadUserData(Config.AWS.getMomentVideoImageFolderPrefix(), key + '_thumb', resizedImage);
        })
        .then(function(resp){
            responses.thumb = resp;
            return _resizeImage(data, {height: 125, width: 125}, croppedRect);
        })
        .then(function(resizedImage){
            return _uploadUserData(Config.AWS.getMomentVideoImageFolderPrefix(), key + '_tiny', resizedImage);
        })
        .then(function(resp){
            responses.tiny = resp;
            return _resizeImage(data, {height: 750, width: 750}, croppedRect);
        })

        .then(function(resizedImage){
            return _uploadUserData(Config.AWS.getMomentVideoImageFolderPrefix(), key + '_cropped', resizedImage);
        })
        .then(function(resp){
            responses.cropped = resp;
            return Promise.resolve(responses);
        });

}


function _uploadMomentVideo(key, croppedRect, moment, data) {

    var responses = {};

    return _uploadUserData(Config.AWS.getMomentVideoFolderPrefix(), key + '.mp4', data)
        .then(function(resp) {
            responses.original = resp;
            return Promise.resolve(responses);
        });

}

function _uploadMomentImage(key, croppedRect, moment, data){

    var responses = {};

    return _uploadUserData(Config.AWS.getMomentImageFolderPrefix(), key, data)
    .then(function(resp){
        responses.original = resp;
        return _resizeImage(data, {height: 250, width: 250}, croppedRect);
    })
    .then(function(resizedImage){
        return _uploadUserData(Config.AWS.getMomentImageFolderPrefix(), key + '_thumb', resizedImage);
    })
    .then(function(resp){
        responses.thumb = resp;
        return _resizeImage(data, {height: 125, width: 125}, croppedRect);
    })
    .then(function(resizedImage){
        return _uploadUserData(Config.AWS.getMomentImageFolderPrefix(), key + '_tiny', resizedImage);
    })
    .then(function(resp){
        responses.tiny = resp;
        return _resizeImage(data, {height: 750, width: 750}, croppedRect);
    })
    .then(function(resizedImage){
        return _uploadUserData(Config.AWS.getMomentImageFolderPrefix(), key + '_cropped', resizedImage);
    })
    .then(function(resp){
        responses.cropped = resp;
        return Promise.resolve(responses);
    });
    
}

function _copyUserObject(key, sourceFolder, destinationFolder){
	var s3 = new AWS.S3();

	return new Promise(function(resolve, reject){
		s3.copyObject({
			Bucket:  Config.AWS.getUserS3Bucket(),
			Key: destinationFolder + "/" + key,
			CopySource:  Config.AWS.getUserS3Bucket() + '/' + sourceFolder + '/' + key
		}, function(err, res){
			if(err){
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
}

function _deleteUserImage(key, folderPrefix){
	var s3 = new AWS.S3();

    var _deleteImage = function(key, imageSize){

        if(imageSize == _imageSizes.CROPPED){
            key = key + '_cropped';
        }
        else if(imageSize == _imageSizes.THUMBNAIL){
            key = key + '_thumb'
        }
        else if(imageSize == _imageSizes.TINY){
            key = key + '_tiny';
        }
        else{
            key = key;
        }

        //first we make a copy of the object in our deleted container, and then delete the original
        return new Promise(function(resolve, reject) {
            _copyUserObject(key, folderPrefix, 'deleted/' + folderPrefix)
                .then(function () {
                    s3.deleteObject({
                        Bucket: Config.AWS.getUserS3Bucket(),
                        Key: folderPrefix + "/" + key

                    }, function (err, res) {
                        if (err) {
                            throw err;
                        }
                        else {
                            resolve(res);
                        }
                    });
                })
                .catch(function (err) {
                    reject(err);
                });
        });
    };

    var responses = {};

    return _deleteImage(key, _imageSizes.ORIGINAL)
        .then(function(resp){
            responses.original = resp;

            if(folderPrefix.indexOf(Config.AWS.getMomentImageFolderPrefix()) > -1){
                return _deleteImage(key, _imageSizes.CROPPED);
            }
            else{
                return Promise.resolve("No cropped image");
            }
        })
        .then(function(resp){
            responses.cropped = resp;
            return _deleteImage(key, _imageSizes.THUMBNAIL);
        })
        .then(function(resp){
            responses.thumb = resp;
            return _deleteImage(key, _imageSizes.TINY);
        })
        .then(function(resp){
            responses.tiny = resp;
            return Promise.resolve(responses);
        });
}

module.exports = {
    ImageSizes: _imageSizes,

	init: function(){
		AWS.config.update(_getAWSConfig());
	},
	
	uploadProfileImage: _uploadProfileImage,

	uploadMomentImage: _uploadMomentImage,

    uploadMomentVideoImage: _uploadMomentVideoImage,

    uploadMomentVideo: _uploadMomentVideo,

	getProfileImageSignedUrl: function(key, imageSize, lifetime){
		return _getUserCloudfrontURL(key, imageSize, Config.AWS.getProfileImageFolderPrefix(), lifetime);
	},

	getMomentImageSignedUrl: function(key, imageSize, lifetime){
		return _getUserCloudfrontURL(key, imageSize, Config.AWS.getMomentImageFolderPrefix(), lifetime);
	},

    getMomentVideoSignedUrl: function(key, videoSize, lifetime){
        return _getUserCloudfrontURL(key, videoSize, Config.AWS.getMomentVideoFolderPrefix(), lifetime);
    },

    getMomentVideoImageSignedUrl: function(key, videoSize, lifetime){
        return _getUserCloudfrontURL(key, videoSize, Config.AWS.getMomentVideoImageFolderPrefix(), lifetime);
    },

    getProductImageUrl: _getProductCloudfrontURL,

    getBrandImageUrl: _getBrandCloudfrontURL,

	deleteMomentImage: function(key){
		return _deleteUserImage(key, Config.AWS.getMomentImageFolderPrefix());
	},

	deleteUserImage: function(key){
		return _deleteUserImage(key, Config.AWS.getProfileImageFolderPrefix());
	}
};