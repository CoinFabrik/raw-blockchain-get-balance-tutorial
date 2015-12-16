var getBlocks = require('./get-blocks'),
	bitcore = require('bitcore-lib');

var addressString = process.argv[2];

if(!addressString) {
	console.log('Usage: \n node lookup <address>');
	process.exit();
}
try {
	var searchedAddress = (new bitcore.Address.fromString(addressString)).toBuffer();
} catch (e) {
	console.log('Invalid address "' + addressString + "'");
	process.exit();
}

console.log('Getting transactions related to address ' + addressString +' ...');

function each (obj, func, context) {
  var kindex,
    length;
  for (kindex = 0, length = obj.length; kindex < length; kindex++) {
    func.call(context, obj[kindex], kindex, obj);
  }
}

var incoming = [],
  finalBalance = 0,
  blockCache = require('./block-cache');

getBlocks(function(block) {
  var unmatchedInputs = [];
  each(block.rawTransactions, function(raw) {
    var tx = new bitcore.Transaction(raw);

	  each(tx.outputs, function(o, index) {
      var address = o.script.toAddress();
      if (!address) {
        return;
      }
      if(searchedAddress.compare(address.toBuffer()) === 0) {
        var incomingInfo = {
          txid: tx.id,
          index: index,
          satoshis: o.satoshis
        };
        console.log('Found incoming: ' + o.satoshis + ' satoshis. (txid: ' + tx.id + ' )');
        finalBalance += o.satoshis;
        incoming.push(incomingInfo);
        if (blockCache.isSpent(block.time, incomingInfo)) {
          console.log('Found outgoing: ' + o.satoshis + ' satoshis in block cache.');
          finalBalance -= o.satoshis;
        }
      }
    });

     //Check outgoing funds

    each(tx.inputs, function(input) {
      var prevTx = input.prevTxId.toString('hex'),
        i, length, hasMatchingSpend = false;
      for(i = 0, length = incoming.length; i < length; i++) {
        if (incoming[i].txid === prevTx && incoming[i].index === input.outputIndex) {
          console.log('Found outgoing: ' + incoming[i].satoshis + ' satoshis. (txid: ' + tx.id + ' )');
          finalBalance -= incoming[i].satoshis;
          hasMatchingSpend = true;
        }
      }
      if (!hasMatchingSpend) {
        unmatchedInputs.push(input);
      }
    });
  });
  blockCache.addBlock(block.time, unmatchedInputs);
});

console.log('Final balance: ' + finalBalance + ' satoshis.');
