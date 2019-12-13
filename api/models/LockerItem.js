/**
 *
 * Locker Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a User's locker
 *
 **/

var _lockerEntryTypes = {
	PRODUCT: 0
};

module.exports = {
	connection: ['mongo'],

	lockerEntryTypes: _lockerEntryTypes,

	attributes: {
		sourceUser: {
			model: 'user',
			required: true
		},

		entryType: {
			type: 'integer',
			required: true
		},

		targetProduct: {
			model: 'product'
		}
	}
};
