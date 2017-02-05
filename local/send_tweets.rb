require 'mysql2'
require 'twitter'

client = Mysql2::Client.new(
 host: 'localhost',
 username: 'root',
 password: '',
 database: 'twitter')

twitter = Twitter::REST::Client.new do |tclient|
 tclient.consumer_key        = 'CLIENT_KEY'
 tclient.consumer_secret     = 'CLIENT_SECRET'
end

if (twitter.consumer_key == '')
 raise StandardError, 'Set the consumer key in sendtweet.rb'
end

# We check for null sents because that column defaults to null and we didn't set it on upload
while (result = client.query("SELECT * FROM users WHERE sent IS NULL LIMIT 1000")).count > 0
 result.each do |row|
   message = ''
   begin
   twitter.access_token = `node decrypt.js #{row['token']} #{row['token_iv']}`
   twitter.access_token_secret = `node decrypt.js #{row['secret']} #{row['secret_iv']}`
   uid = row['uid']
   # I would recommend actually having this read from a file instead, but this was faster.
   twitter.create_direct_message(uid, ARGV[0])
   rescue => e
     message = e.message
   end
   # If there was an error, we want to know about it so we can try to retweet / troubleshoot later.
   client.query("UPDATE users SET sent = 1, message = '#{message}' WHERE uid = #{uid}")
 end
end
