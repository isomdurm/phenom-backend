/**
 *
 * Session Removal Policy
 *
 * @module      :: DisableSession
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Policy used to force removal of sessions, as Phenom API is sessionless
 *
 **/

 module.exports = function(req, res, next){
 	req.session = null;
 	next();
};
