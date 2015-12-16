var blocks = [],
  BLOCK_DOWNLOAD_WINDOW = 1024;


function each (obj, func, context) {
  var kindex,
    length;
  for (kindex = 0, length = obj.length; kindex < length; kindex++) {
    func.call(context, obj[kindex], kindex, obj);
  }
}

exports.addBlock = function addBlock(time, inputs) {
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
};

exports.isSpent = function isSpent(currentTime, incomingInfo) {
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
};
