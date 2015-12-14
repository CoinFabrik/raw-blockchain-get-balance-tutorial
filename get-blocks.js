var fs = require('fs'),
  bitcore = require('bitcore-lib'),
  bitcoinDataDir = 'D:/bitcoin-blockchain';

function readVarInt(stream) {
  var size = stream.read(1);
  var sizeInt = size.readUInt8();
  if (sizeInt < 253) {
    return size;
  }
  var add;
  if (sizeInt == 253) add = 2;
  if (sizeInt == 254) add = 4;
  if (sizeInt == 255) add = 8;
  if (add) {
    return Buffer.concat([size, stream.read(add)], 1 + add);
  }
  return -1;
}

function toInt(varInt) {
  if (!varInt) {
    return -1;
  }
  if (varInt[0] < 253) return varInt.readUInt8();
  switch(varInt[0]) {
    case 253: return varInt.readUIntLE(1, 2);
    case 254: return varInt.readUIntLE(1, 4);
    case 255: return varInt.readUIntLE(1, 8);
  }
}


function getRawTx(reader) {
  var txParts = [];
  txParts.push(reader.read(4)); //Version

  //Inputs
  var inputCount = readVarInt(reader);
  txParts.push(inputCount);
  for(var i = toInt(inputCount) - 1; i >= 0; i--) {
    txParts.push(reader.read(32)); //Previous tx
    txParts.push(reader.read(4)); //Index
    var scriptLength = readVarInt(reader);
    txParts.push(scriptLength);
    txParts.push(reader.read(toInt(scriptLength))); //Script Sig
    txParts.push(reader.read(4)); //Sequence Number
  }

  //Outputs
  var outputCount = readVarInt(reader);
  txParts.push(outputCount);
  for(i = toInt(outputCount) - 1; i >= 0; i--) {
    txParts.push(reader.read(8)); //Value
    var scriptLen = readVarInt(reader);
    txParts.push(scriptLen);
    txParts.push(reader.read(toInt(scriptLen))); //ScriptPubKey
  }
  txParts.push(reader.read(4)); //Lock time

  return Buffer.concat(txParts);
}

function bufferReader(buffer) {
  var index = 0;
  return {
    read: function read(bytes) {
      if (index + bytes > buffer.length) {
        return null;
      }
      var result = buffer.slice(index, index + bytes);
      index += bytes;
      return result;
    }
  }
}

function readHeader(reader) {
  var version = reader.read(4);
  if (version == null) {
    return null;
  }
  if (version.toString('hex') == 'f9beb4d9') {
    //It's actually the magic number of a different block (previous one was empty)
    reader.read(4); //block size
    return readHeader(reader);
  }
  reader.read(64); //previous hash + merkle hash
  var time = reader.read(4); //time
  if (time == null) {
    return null;
  }
    //console.log((new Date(time.readUInt32LE() * 1000)).toDateString());
  reader.read(8); //bits + nonce
  return {
    time: time.readUInt32LE()
  }
}

module.exports = function getBlocks(onBlock) {
  for(var i = 341; i < 388; i++) {
    var fileNumber = ('0000' + i).slice(-5),
      data = fs.readFileSync(bitcoinDataDir + '/blocks/blk' + fileNumber + '.dat'),
      reader = bufferReader(data),
      magic = reader.read(4),
      blockSize = reader.read(4),
      blockHeader = readHeader(reader);
    console.log('Reading file ' + fileNumber);
    while(blockHeader !== null) {
      var txCount = toInt(readVarInt(reader)),
        txs = [];
      for(var j = 0; j < txCount; j++) {
        txs.push(getRawTx(reader));
      }
      onBlock({
        time: blockHeader.time,
        rawTxs: txs
      });
      magic = reader.read(4);
      blockSize = reader.read(4);
      blockHeader = readHeader(reader);
    }
  }
};

