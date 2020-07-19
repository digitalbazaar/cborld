/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
// map of future CBOR-LD codec registry of known CBOR-LD codecs
const codecEncodeMap = new Map();
const codecDecodeMap = new Map();
_setEncodeDecodeMap(1, 'url');
_setEncodeDecodeMap(2, 'base64Pad');
_setEncodeDecodeMap(3, 'dateTime');

export class CodecMapCodec {
  constructor() {
  }

  set({value, termCodecMap}) {
    this.value = value;
    this.encodingMap = termCodecMap;
  }

  encodeCBOR(gen) {
    const encodedValue = new Map();

    // convert terms and codecs to small values
    for(const [key, value] of Object.entries(this.value)) {
      encodedValue.set(this.encodingMap.get(key).value,
        codecEncodeMap.get(value));
    }

    return gen.pushAny(encodedValue);
  }
}

function _setEncodeDecodeMap(id, codec) {
  codecEncodeMap.set(codec, id);
  codecDecodeMap.set(id, codec);
}
