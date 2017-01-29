'use strict';

var AWS = require("aws-sdk");
var loader = require("./loader.js");
// TODO: Change to your region
var dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-west-1'});
const querystring = require('querystring');

exports.handler = (event, context, callback) => {
  loader.load(event, context, function(env_config){

    const redirect = function(err){
        context.done(err, {});
    };

    var twitterAPI = require('node-twitter-api');

    var twitter = new twitterAPI({
      consumerKey: env_config.consumer_key,
      consumerSecret: env_config.consumer_secret,
      callback: env_config.twitter_api_callback
    });

    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
        if (error) {
          console.log("Error getting OAuth request token:");
          console.log(error);
        } else {
            dynamo.put({
              TableName:env_config.twitter_session_table_name,
              Item:{
                request_token : requestToken,
                request_secret : requestTokenSecret,
                follow : JSON.parse(querystring.parse(event['body-json']).follow),
              }
            },  function(err, res){
                  var error = new Error("Twitter.MovedPermanently : Redirecting.");
                  // If we have an error, we'll redirect back to our landing page
                  // Note - feel free to add error params to this call
                  if (err){
                    console.log(err);
                    error.name = env_config.twitter_api_callback;
                    redirect(error);
                  } else {
                    // We will redirect to the site
                    error.name = twitter.getAuthUrl(requestToken);
                    redirect(error);
                  }
                }
            );
          }
      }
    );
  });
};
