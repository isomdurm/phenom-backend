/**
 *
 * Filtered Products Model
 *
 * @module      :: Locker
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Models that keeps track of products we've filtered out from search results.
 *
 **/

module.exports = {
	connection: ['mongo'],
	
	attributes: {
		dataSourceId: {
			type: 'String',
			required: true
		},

		itemId: {
			type: 'String',
			required: true
		},

		name: {
			type: 'String',
			required: true
		},

		imageUrl: {
			type: 'String'
		},

		category: {
			type: 'String'
		},

		/**  
		*    @return A promise returning the image URL
		*    
		**/
		getImageSource:  function(){
			throw new Error('Deprecated');
		}
	}
};
