var getBlocks = require('./get-blocks'),
	bitcore = require('bitcore-lib');

var addressString = process.argv[2];

if(!addressString) {
	console.log('Usage: \n node lookup <address>');
	process.exit();
}
try {
	var addressBuffer = (new bitcore.Address.fromString(addressString)).toBuffer();
} catch (e) {
	console.log('Invalid address "' + addressString + "'");
	process.exit();
}

console.log('Getting transactions related to address ' + addressString +' ...');

