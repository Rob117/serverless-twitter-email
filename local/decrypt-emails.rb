require 'json'
require 'csv'
require 'pry'

# NOTE: ARGV 0 is our encrypted email file name

CSV.open("processed_emails.csv", 'wb') do |csv|
 csv << ['Email']
 File.readlines((ARGV[0]).to_s).each do |line|
   # We have specify which value we need because DynamoDB keys are not
   # guaranteed to be in any order, and the data isn't guaranteed to have only
   # the keys we need
   # Also, the contents of just hash["email"] look like:
   # ["s", "60032f4aef47a9eed2c75b8fe6f262ced194a4"]
   # so we take the value there and then remove it from the array
   email = JSON.parse(line)["email"].first[1]
   email_iv = JSON.parse(line)["email_iv"].first[1]
   csv << [`node decrypt.js #{email} #{email_iv}`]
 end
end
