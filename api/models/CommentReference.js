/**
 *
 * Comment Reference Model
 *
 * @module      :: CommentReference
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Defines a Reference contained in a comment
 *
 **/

var _referenceTypes = {
    USER: 0,
    REFERENCE_VALID: 1
};

module.exports = {
    connection: ['mongo'],

    commentReferenceTypes: _referenceTypes,

    attributes: {
        sourceComment: {
            model: 'comment',
            required: true
        },

        type: {
            type: 'integer',
            required: true
        },

        targetUser: {
            model: 'user'
        }
    }
};
