/**
 *
 * RefreshToken Model
 *
 * @module      :: User
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a persisted RefreshToken
 *
 **/

module.exports = {
    connection: ['mongo'],
    
	attributes: {
		user: {
            model: 'user',
            required: true
        },
        client: {
            model: 'client',
            required: true
        },
        token: {
            type: 'string',
            unique: true,
            required: true
        },
        created: {
            type: 'date',
            default: Date.now
        },
        accessToken: {
            model: 'accesstoken',
            required: true
        }
	}
};