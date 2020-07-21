/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
// map of future CBOR-LD codec registry of known CBOR-LD codecs
import {Base64PadCodec} from './Base64PadCodec';
import {UrlCodec} from './UrlCodec';
import {XsdDateTimeCodec} from './XsdDateTimeCodec';

const codecEncodeMap = new Map();
const codecDecodeMap = new Map();
_setEncodeDecodeMap(1, 'url');
_setEncodeDecodeMap(2, 'base64Pad');
_setEncodeDecodeMap(3, 'dateTime');

// all term codecs available to use when transforming term values
export const termCodecs = new Map();
termCodecs.set('url', UrlCodec);
termCodecs.set(1, UrlCodec);
termCodecs.set('base64Pad', Base64PadCodec);
termCodecs.set(2, Base64PadCodec);
termCodecs.set('dateTime', XsdDateTimeCodec);
termCodecs.set(3, XsdDateTimeCodec);

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
