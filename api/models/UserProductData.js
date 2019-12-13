/**
 *
 * User Product Data Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines user-specific information for products
 *
 **/

module.exports = {
	connection: ['mongo'],
	
	attributes: {
		userId: {
			type: 'String',
			required: true,
			notEmpty: true
		},
		product: {
			model: 'product',
			required: true
		},
		momentCount: {
			type: 'Integer',
			defaultsTo: 0
		},
		userUploadedImage: {
			type: 'String'
		}
	}
};