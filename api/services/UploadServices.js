/**
 *
 * UploadServices
 *
 * @module      :: Upload Services
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Support for up-stream multi-part form processing, used to access files, coupled to multiparty/express/skipper
 *
 **/

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));

/**
 * Get the file from the filesystem, and remove it after it's been read into a
 * buffer
 *
 * @param file
 * @returns promise resolving to the file data, otherwise rejects with error
 * @private
 */
function _readAndDelete(file){
    return new Promise(function(resolve, reject){
        fs.readFileAsync(file)
        .then(function(data) {
            _delete(file)
                .then(function(){
                    resolve(data);
                })
                .catch(function(err){
                    reject(err);
                });
        })
        .catch(function(err){
            reject(err);
        });
    });
}

/**
 * Delete a file from the file system
 *
 * @param file
 * @returns promise resolving to undefined on success, rejects with error otherwise
 * @private
 */
function _delete(file){
    //delete the file from the file system, and then return the data
    return fs.unlinkAsync(file)
        .then(function(){
            return Promise.resolve();
        });
}

/**
 *
 * @param req - Express request
 * @param fileName - file field name
 * @returns buffer containing file data if it's available, otherwise, undefined
 * @private
 */
function _getFileFromRequest(req, fileName){
    //first we need to see if multiparty touched the express request, if not, we don't
    //have any files associated with this request
    return new Promise(function(resolve, reject){
        if(req.file === undefined){
            resolve(undefined);
        }
        else{
            //see if there is a file available with identifier fileName
            req.file(fileName).upload(function(err, files){
                if(err){
                    reject(err);
                }
                else if(files.length < 1){
                    //we don't have a file called fileName, return empty
                    resolve(undefined);
                }
                else{
                    //read the file from the filesystem into a buffer, delete if from the
                    // filesystem, and then return the data
                    _readAndDelete(files[0].fd)
                        .then(function(data){
                            resolve(data);
                        })
                        .catch(function(err){
                            reject(err);
                        });
                }
            });
        }
    });
}

/**
 * Module Interface
 * @type {{getFileFromRequest: Function}}
 */
module.exports = {
    getFileFromRequest: function(req, fileName){
        return _getFileFromRequest(req, fileName);
    }
};
