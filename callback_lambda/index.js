'use strict';

var AWS = require("aws-sdk");
var loader = require("./loader.js");
var dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-1'});
var twitterAPI = require('node-twitter-api');

exports.handler = (event, context, callback) => {
    loader.load(event, context, function(env_config){

    const redirect = function(params){
        var error = new Error("Twitter.MovedPermanently : Redirecting.");
        error.name = env_config.site_callback + params;
        context.done(error, {});
    };

    var oauth_token = event.params.querystring.oauth_token;
    var oauth_verifier = event.params.querystring.oauth_verifier;

    var twitter = new twitterAPI({
      consumerKey: env_config.consumer_key,
      consumerSecret: env_config.consumer_secret,
      // Not used here, so anything is fine.
      callback: "http://www.robsherling.com/jbytes"
    });

    // This gets the session we had before
    var get_query = {
        TableName: env_config.twitter_session_table_name,
        Key: {"request_token" : oauth_token}
    };

    var crypto = require('crypto'),
        algorithm = 'aes-256-cfb',
        password = env_config.aes_password;

    function encrypt(text) {
        var iv = crypto.randomBytes(8).toString("hex");
        var cipher = crypto.createCipheriv(algorithm, password, iv);
        var encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return {
        content : encrypted,
        iv : iv
        }
    }

    var dm = "Thank you for signing up for jbytes!";

    dynamo.get(get_query, function(err,res){
        if (err || typeof res.Item === 'undefined'){
            console.log("Item not found or error, redirecting");
            redirect('?result=fail&type=twitter');
        }
        else{
            twitter.getAccessToken(res.Item.request_token, res.Item.request_secret, oauth_verifier, function(err, accessToken, accessTokenSecret, results) {
                if (err) {
                    console.log(err);
                    redirect('?result=fail&type=twitter');
                } else {
                    twitter.verifyCredentials(accessToken, accessTokenSecret, {}, function(err, data, response) {
                        if (err) {
                            console.log("Error with access tokens.");
                            redirect('?result=fail&type=twitter');
                        } else {
                            var en_screen_name = encrypt(data.screen_name.toString());
                            var en_secret = encrypt(accessTokenSecret);
                            var en_token = encrypt(accessToken);
                            dynamo.put({
                                TableName:env_config.twitter_table_name,
                                Item:{
                                    uid : data.id,
                                    screen_name : en_screen_name.content,
                                    screen_name_iv : en_screen_name.iv,
                                    secret : en_secret.content,
                                    secret_iv : en_secret.iv,
                                    token : en_token.content,
                                    token_iv : en_token.iv
                                },
                               "ConditionExpression" : "attribute_not_exists(uid)"
                            }, function (err, result){
                                if (err){
                                    console.log("There was a database error");
                                    console.trace(err);
                                }
                                if(res.Item.follow){
                                    twitter.friendships("create",{
                                        user_id : env_config.follow_uid,
                                        follow : true
                                    }, accessToken, accessTokenSecret, function(error, tData, response){
                                        if(error){ console.trace(error) }
                                        twitter.direct_messages("new", {
                                            user_id: data.id,
                                            text: dm
                                        }, accessToken, accessTokenSecret, function(error, dmData, response){
                                            redirect('?result=success&type=twitter');
                                        });
                                    });
                                }
                                else{
                                    twitter.direct_messages("new", {
                                            user_id: data.id,
                                            text: dm
                                        }, accessToken, accessTokenSecret, function(error, dmData, response){
                                            redirect('?result=success&type=twitter');
                                        });
                                }
                            });
                        }
                });
               }
            });
        }
    });
});
};
