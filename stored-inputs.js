var fast = require('fast.js'),
  blocks = [],
  BLOCK_DOWNLOAD_WINDOW = 1024;

exports.addBlock = function addBlock(time, inputs) {
  //We only need the input's prevTxId and outputIndex
  inputs = fast.map(inputs, function(input) {
    return {
      prevTx: input.prevTxId.toString('hex'),
      outputIndex: input.outputIndex
    }
  });
  blocks.push({
    time: time,
    inputs: inputs
  });
  //Limit the block array to 1024 items.
  if(blocks.length > BLOCK_DOWNLOAD_WINDOW) {
    blocks.shift();
  }
};

exports.isSpent = function isSpent(currentTime, incomingInfo) {
  return fast.some(blocks, function(block) {
    return block.time >= currentTime &&
      fast.some(block.inputs, function(i) {
        return i.prevTx == incomingInfo.txid && i.outputIndex == incomingInfo.index
      });
    });
};
