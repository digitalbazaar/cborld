/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
// map of future CBOR-LD codec registry of known CBOR-LD codecs
import {MultibaseCodec} from './MultibaseCodec.js';
import {UrlCodec} from './UrlCodec.js';
import {XsdDateTimeCodec} from './XsdDateTimeCodec.js';
import {XsdDateCodec} from './XsdDateCodec.js';

const codecEncodeMap = new Map();
const codecDecodeMap = new Map();
_setEncodeDecodeMap(1, 'url');
_setEncodeDecodeMap(2, 'multibase');
_setEncodeDecodeMap(3, 'dateTime');
_setEncodeDecodeMap(4, 'date');

// all term codecs available to use when transforming term values
export const termCodecs = new Map();
termCodecs.set('url', UrlCodec);
termCodecs.set(1, UrlCodec);
termCodecs.set('multibase', MultibaseCodec);
termCodecs.set(2, MultibaseCodec);
termCodecs.set('dateTime', XsdDateTimeCodec);
termCodecs.set(3, XsdDateTimeCodec);
termCodecs.set('date', XsdDateCodec);
termCodecs.set(4, XsdDateCodec);

export class CodecMapCodec {
  constructor() {
  }

  set({value, termCodecMap}) {
    this.value = value;
    this.termCodecMap = termCodecMap;
  }

  encodeCBOR(gen) {
    const encodedValue = new Map();

    // convert terms and codecs to small values
    for(const [key, value] of this.value.entries()) {
      encodedValue.set(
        this.termCodecMap.get(key).value, codecEncodeMap.get(value));
    }

    return gen.pushAny(encodedValue);
  }

  decodeCBOR() {
    const decodedValue = new Map();

    this.value.forEach((value, key) =>
      decodedValue.set(key, termCodecs.get(value)));

    return decodedValue;
  }
}

function _setEncodeDecodeMap(id, codec) {
  codecEncodeMap.set(codec, id);
  codecDecodeMap.set(id, codec);
}
