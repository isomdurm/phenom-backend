/**
 *
 * Email Support Services
 *
 * @module      :: Output
 * @author      :: Isom Durm (isom@phenomapp.com)
 *
 * Provides support for sending email
 *
 **/

var Promise = require('bluebird');
var nodemailer = require('nodemailer');
var util = require('util');
var sendgrid  = undefined;
var RateLimiter = require('limiter').RateLimiter;
var limiter = undefined;
var request = require('superagent');

/*
    globals Config
 */

function _init(){
    try {
        (function () {
            sendgrid = require('sendgrid')(Config.Sendgrid.APIKey);
            limiter = new RateLimiter(3, 2);
        })();
    }
    catch(err){
        sails.log.error("Failed to init EmailServices.",  {error: err});
    }
}

function _addNewMailRecipient(user){
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        limiter.removeTokens(1, function(){
            request.post('https://api.sendgrid.com/v3/contactdb/recipients', [{
                hometown: user.hometown,
                sport: user.sport,
                phenomId: user.username,
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                userId: user.id
            }])
            .set('Authorization', util.format('Bearer %s', Config.Sendgrid.APIKey))
            .end(function(err, resp){
                if(err){
                    sails.log.error('Failed to create mailchimp contact', {error: err});
                    return reject(err);
                }

                sails.log.info(util.format("Added new Sendgrid user:  %s", resp));
                resolve(resp);
            })
        });
    });
}

function _updateMailRecipient(user, oldEmail){
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        limiter.removeTokens(1, function(){
            request.delete('https://api.sendgrid.com/v3/contactdb/recipients', [
                new Buffer(oldEmail).toString('base64')
            ])
            .set('Authorization', util.format('Bearer %s', Config.Sendgrid.APIKey))
            .end(function(err, resp){
                if(err){
                    sails.log.error('Failed to update Sengrid contact', {error: err});
                    return reject(err);
                }

                sails.log.info(util.format("Updated Sendgrid user:  %s", resp));
                resolve(resp);
            });
        });
    })
        .then(function(){
            return _addNewMailRecipient(user);
        });
}

function _sendMail(message){
    return new Promise(function(resolve, reject){
        // create reusable transporter object using SMTP transport
        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: Config.Email.support.address,
                pass: Config.Email.support.pass
            }
        });

        transporter.sendMail(message, function(err, response){
            if(err){
                reject(new Error(err));
            }
            else{
                resolve(response.response);
            }
        });
    });
}

function _sendWelcomeEmail(user){

    var phenomId = user.username;
    
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        var email = new sendgrid.Email({
            to: user.email,
            toname: util.format('%s %s', user.firstName, user.lastName),
            from: 'support@phenomapp.com',
            subject: ' ',
            html: ' '
        });

        email.setFilters({
            templates: {
                settings: {
                    enabled: 1,
                    template_id: 'c1ca6c04-99da-4453-97fc-bff025076b65'
                }
            }
        });

        email.addSubstitution('-COMPANY-', 'Phenom');
        email.addSubstitution('-DESCRIPTION-', '');
        email.addSubstitution('-PHENOMID-', phenomId);

        sendgrid.send(email, function(err, response){
            if(err){
                reject('Failed to send email', {'error': err});
            }
            else{
                sails.log.info(util.format("Sent Sendgrid Email From Template:  %s to address:  %s", 'new-user-template', user.email));
                resolve(response);
            }
        });
    });
}

function _sendResetPasswordEmail(user, resetUrl){
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        var phenomId = user.username;

        if(phenomId.length > 20){
            phenomId = phenomId.substring(0, 20);
            phenomId = phenomId + '...';
        }

        var email = new sendgrid.Email({
            to: user.email,
            toname: util.format('%s %s', user.firstName, user.lastName),
            from: 'support@phenomapp.com',
            subject: ' ',
            html: ' '
        });

        email.setFilters({
            templates: {
                settings: {
                    enabled: 1,
                    template_id: '5f0b0a4e-17b9-4839-840c-595b4f2d7a8c'
                }
            }
        });

        email.addSubstitution('-COMPANY-', 'Phenom');
        email.addSubstitution('-DESCRIPTION-', '');
        email.addSubstitution('-RESETURL-', resetUrl);
        email.addSubstitution('-PHENOMID-', phenomId);
        sendgrid.send(email, function(err, response){
            if(err){
                reject('Failed to send email', {'error': err});
            }
            else{
                sails.log.info(util.format("Sent Sendgrid Email From Template:  %s to address:  %s", 'reset-password', user.email));
                resolve(response);
            }
        });
    });
}

function _sendForgotPhenomIdEmail(user){
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        var phenomId = user.username;

        if(phenomId.length > 20){
            phenomId = phenomId.substring(0, 20);
            phenomId = phenomId + '...';
        }

        var email = new sendgrid.Email({
            to: user.email,
            toname: util.format('%s %s', user.firstName, user.lastName),
            from: 'support@phenomapp.com',
            subject: ' ',
            html: ' '
        });

        email.setFilters({
            templates: {
                settings: {
                    enabled: 1,
                    template_id: '5f4d0644-ebc0-43b2-b67d-4d4db2a60bb5'
                }
            }
        });

        email.addSubstitution('-COMPANY-', 'Phenom');
        email.addSubstitution('-DESCRIPTION-', '');
        email.addSubstitution('-PHENOMID-', phenomId);
        email.addSubstitution('-subject', '');
        sendgrid.send(email, function(err, response){
            if(err){
                reject('Failed to send email', {'error': err});
            }
            else{
                sails.log.info(util.format("Sent Sendgrid Email From Template:  %s to address:  %s", 'phenom-id-request', user.email));
                resolve(response);
            }
        });
    });
}

function _sendInviteEmail(user, to, firstName, lastName)
{
    return new Promise(function(resolve, reject){
        if(!user){
            return reject(new Error('User required for this transaction'));
        }

        var phenomId = user.username;

        if(phenomId.length > 20){
            phenomId = phenomId.substring(0, 20);
            phenomId = phenomId + '...';
        }

        var email = new sendgrid.Email({
            to: to,
            toname: util.format('%s %s', user.firstName, user.lastName),
            from: 'support@phenomapp.com',
            subject: ' ',
            html: ' '
        });

        email.setFilters({
            templates: {
                settings: {
                    enabled: 1,
                    template_id: '11b88e6e-3ec6-46c5-9b4d-5d894c211100'
                }
            }
        });

        email.addSubstitution('-COMPANY-', 'Phenom');
        email.addSubstitution('-DESCRIPTION-', '');
        email.addSubstitution('-FNAME-', firstName);
        email.addSubstitution('-LNAME-', lastName);
        email.addSubstitution('-PHENOMID-', phenomId);
        sendgrid.send(email, function(err, response){
            if(err){
                reject('Failed to send email', {'error': err});
            }
            else{
                sails.log.info(util.format("Sent Sendgrid Email From Template:  %s to address:  %s", 'invite-friends', user.email));
                resolve(response);
            }
        });
    });
}

function _sendPlainMail(to, subject, message){
    var thisMessage = {
        from: 'support@phenomapp.com',
        to: to,
        subject: subject,
        text: message
    };

    //return the promise
    return _sendMail(thisMessage);
}

function _sendHTMLMail(to, subject, htmlRaw, textRaw){
    var message = {
        from: 'hello@phenomapp.com',
        to: to,
        subject: subject,
        html: htmlRaw,
        text: textRaw
    };

    //return the promise
    return _sendMail(message);
}

module.exports = {
    init: _init,
    addNewMailRecipient:        _addNewMailRecipient,
    updateMailRecipient:        _updateMailRecipient,
    sendWelcomeEmail:           _sendWelcomeEmail,
    sendResetPasswordEmail:     _sendResetPasswordEmail,
    sendForgotPhenomIdEmail:    _sendForgotPhenomIdEmail,
    sendInviteEmail:            _sendInviteEmail,
    sendPlainMail:              _sendPlainMail,
    sendHTMLMail:               _sendHTMLMail
};