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

function each (obj, func, context) {
  var kindex,
    length;
  for (kindex = 0, length = obj.length; kindex < length; kindex++) {
    func.call(context, obj[kindex], kindex, obj);
  }
}

var incoming = [];
var outgoing= [];

var blockCache = (function(){
  var blocks = [],
    BLOCK_DOWNLOAD_WINDOW = 1024;

  return {
    addBlock: function addBlock(time, inputs) {
      inputs = inputs.map(function(input) {
        return {
          prevTx: input.prevTxId.toString('hex'),
          outputIndex: input.outputIndex
        }
      });
      blocks.push({
        time: time,
        inputs: inputs
      });
      if(blocks.length > BLOCK_DOWNLOAD_WINDOW) {
        blocks.shift();
      }
    },
    isSpent: function isSpent(currentTime, incomingInfo) {
      var isSpent = false;
      each(blocks, function(block) {
        if (block.time >= currentTime) {
          each(block.inputs, function(i) {
            if(i.prevTx == incomingInfo.txid && i.outputIndex == incomingInfo.index) {
              isSpent = true;
            }
          });
        }
      });
      return isSpent;
    }
  };
}());

getBlocks(function(block) {
  var unmatchedInputs = [];
  each(block.rawTransactions, function(raw) {
    var tx = new bitcore.Transaction(raw);

	  each(tx.outputs, function(o, index) {
      var address = o.script.toAddress();
      if (!address) {
        return;
      }
      if(addressBuffer.compare(address.toBuffer()) === 0) {
        var incomingInfo = {
          txid: tx.id,
          index: index,
          satoshis: o.satoshis
        };
        console.log('Found incoming: ' + o.satoshis + ' satoshis. (txid: ' + tx.id + ' )');
        incoming.push(incomingInfo);
        if (blockCache.isSpent(block.time, incomingInfo)) {
          console.log('Found outgoing: ' + o.satoshis + ' in block cache.');
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
