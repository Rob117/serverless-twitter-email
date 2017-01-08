'use strict';

// This is the correct way to reference the DynamoDB sdk
var AWS = require("aws-sdk");
// S3 Config Loader
var loader = require("./loader.js");
//Change location to your location
var dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-1'});
// We need to use this because our email will be passed as escaped html from
// our static pages, and we need to restore it to a more usable format.
const querystring = require('querystring');
// Require mail libraries for Mailgun
var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
// Require Filesystem to Read Emails
var fs = require('fs');

var options = {
  auth: {
    // Mailgun API Key
    api_key: env_config.mail_api_key,
    // Mailgun domain here. See mailgun site / domains
    domain: env_config.mailgun_domain_name
  }
}

//Mailgun boilerplate for client/email creation
var client = nodemailer.createTransport(mg(options));
var email = {
  from: env_config.from_email,
  subject: 'Hello',
  text: 'This is the test email',
  html: '<b>This is the test email in bold, and html!</b>'
};

// This is the standard entry method for lambdas.
exports.handler = (event, context, callback) => {
    // This is our custom loader function
    loader.load(event, context, function(env_config){

  const redirect = function(params){
    // The only way to redirect in lambda is to throw an error
      var error = new Error("Email.MovedPermanently : Redirecting.");
      // We add params to let us know if the email was successful or not on callback
      error.name = env_config.email_callback + params
      context.done(error, {});
  }

  // set encryption settings using node.js build-in encryption library
  var crypto = require('crypto'),
        algorithm = 'aes-256-cfb',
        password = env_config.aes_password;

    // After encrypting, return a json object with the content and iv
    function encrypt(text) {
        var iv = crypto.randomBytes(8).toString("hex");
        var cipher = crypto.createCipheriv(algorithm, password, iv)
        var encrypted = cipher.update(text.toString(), 'utf8', 'hex')
        encrypted += cipher.final('hex');

        return {
        content : encrypted,
        iv : iv
        }
    }
        
    // Because of the way x-www-form works, and because of api gateway settings,
    // to get the email we have to pull it from the event.body-json object,
    // then we have to undo the html escaping by parsing with querystring,
    // then we can finally encrypt it
    var raw_email = querystring.parse(event['body-json']).email;
    var encrypted_email = encrypt(raw_email);
    // Use dynamo SDK to save the email and its IV in the db
    dynamo.put({
      TableName: env_config.email_table_name,
      Item: {
          email: encrypted_email.content,
          email_iv: encrypted_email.iv
      }
    },  function(err, res){
      // On failure, log to console and redirect back to landing page with
      // failure param
          if(err){
              console.log(err);
              redirect('result=fail&type=email')
          }else{
            // Read the email from a file and try to send it. Return success either way because user email was saved.
            fs.readFile('./email.html', 'utf8', function(errmail,html){
               if (errmail){
                 console.log("Error with reading html file for mail!");
                 console.log(err)
                 redirect('result=success&type=email');
               }
               else{
                // Replace keywords in email with the correct values
                email.text = html.replace('RECIPIENT', raw_email);
                client.sendMail(email, function(error,info){
                   // SUPER NOTE: No email exists !＝ error here. This will pretty much only fail with wrong API keys / bad account
                   if (error){
                       console.log("Error with sending mail!");
                       console.log(error);
                   }
                   redirect('result=success&type=email');
               });
             }
             });
          }
        }
    );
    }
}
