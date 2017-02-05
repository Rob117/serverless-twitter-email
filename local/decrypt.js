var crypto = require('crypto'),
   algorithm = 'aes-256-cfb',
   password = 'ADD PASSWORD';

if (password === ''){
 throw new Error('SET THE PASSWORD in decrypt.js');
}
function decrypt(text, iv){
 var decipher = crypto.createDecipheriv(algorithm,password, iv);
 var dec = decipher.update(text,'hex','utf8');
 dec += decipher.final('utf8');
 return dec;
}
// In Node, arg 1 is proccess.execPath
// arg two the second is the file being executed.
// Hence, we take the third and fourth arguments (text, iv)
// https://nodejs.org/docs/latest/api/process.html#process_process_argv
process.stdout.write(decrypt(process.argv[2], process.argv[3]));
