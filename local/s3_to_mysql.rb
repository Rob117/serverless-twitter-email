require 'json'
require 'mysql2'

client = Mysql2::Client.new(
 host: 'localhost',
 username: 'root',
 password: '',
 database: 'twitter')

File.readlines((ARGV[0]).to_s).each do |line|
 hash = JSON.parse(line)
 begin
   # If you can't gauruntee data integrity, this is a bad way to do this.
   # you would instead do something like keys = ['key1', 'key2'],
   # then get each value from the hash using only our whitelisted keys
   keys = hash.keys.join(',')
   values = hash.values.map(&:values).flatten.map do |v|
     # If bool, return as is. Else, add '' for the mysql query syntax
     ([true, false].include? v) ? v : "'" + client.escape(v) + "'"
   end.flatten.join(',')
   client.query("INSERT INTO users (#{keys}) VALUES (#{values})")
 rescue => e
   # NOTE: If somehow duplicate, just continue (for example, the process was
   # interrupted part way through and we had to re-upload from the S3 dump).
   raise e unless e.message.include? 'Duplicate'
 end
end
