// https://www.concurrencylabs.com/blog/configure-your-lambda-function-like-a-champ-sail-smoothly/
var AWS = require('aws-sdk');
var s3 = new AWS.S3({"signatureVersion":"v4"});

/*
PRE-REQUISITES:
- Become familiar with AWS Lambda function aliases and versions: http://docs.aws.amazon.com/lambda/latest/dg/aliases-intro.html
- Create one or more aliases for your Lambda function (i.e. DEV, TEST, PROD)
- Create an S3 bucket and create one folder per stage (i.e. mybucket/DEV, mybucket/TEST, mybucket/PROD)
- Create one config file in each folder (i.e. env-config.json) and create relevant entries.

For example:
  {
    "s3bucket": "mydevbucket",
    "snstopic": "mydevtopic"
  }

This function loads config values from a JSON file (env-config.json) stored in S3.
It fetches a config file based on the Lambda function alias you are executing. For example,
if you are running the function's "DEV" alias, the function will fetch config file stored
in the "/DEV" folder of your config bucket.
The function knows which configuration to grab based on the function alias we are running,
which is available in the invoked function ARN. For example, in function ARN
arn:aws:lambda:us-east-1:123456789012:function:helloStagedWorld:DEV,  "DEV" indicates the
function alias we are running.
*/

function loadConfig(s3bucket, configFile, context, callback){

	functionName = context.functionName;
	functionArn = context.invokedFunctionArn;
	alias = functionArn.split(":").pop();

	//the ARN doesn't include an alias token, therefore we must be executing $LATEST
	if (alias == functionName)
		alias = "$LATEST";

	obj_key = alias + "/" + configFile;
	console.log('S3 object key:['+obj_key+']');

    var params = {
        Bucket: s3bucket,
        Key: obj_key
    };

    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err);
            var message = "Error getting object from S3";
            console.log(message);
            context.fail(message);
        } else {
			env_config = JSON.parse(String(data.Body));
			callback(env_config);
        }
    });
}


exports.load = function(event, context, callback) {
	var configBucket = "CONFIG BUCKET NAME";
	var configFile = "env-config.json";
	loadConfig(configBucket, configFile, context, callback);
};

/*THIS SINGLE FILE is protected under the MIT License, explained below:

Copyright (c) 2016 Concurrency Labs
Changes Copyright (c) 2017 Robert Sherling

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---------------
The original file: https://github.com/ConcurrenyLabs/lambda-env-config/blob/master/s3-config/index.js
*/
