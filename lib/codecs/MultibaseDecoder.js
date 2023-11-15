/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64} from 'js-base64';
import {CborldDecoder} from './CborldDecoder.js';
import {encode as encodeBase58} from 'base58-universal';

// this class is used to encode a multibase encoded value in CBOR-LD, which
// actually means transforming bytes to a multibase-encoded string
export class MultibaseDecoder extends CborldDecoder {
  decode({value} = {}) {
    const {buffer, byteOffset, length} = value;
    const suffix = new Uint8Array(buffer, byteOffset + 1, length - 1);
    if(value[0] === 0x7a) {
      // 0x7a === 'z' (multibase code for base58btc)
      return `z${encodeBase58(suffix)}`;
    }
    if(value[0] === 0x4d) {
      // 0x4d === 'M' (multibase code for base64pad)
      return `M${Base64.fromUint8Array(suffix)}`;
    }
    return value;
  }

  static createDecoder({value} = {}) {
    if(!(value instanceof Uint8Array)) {
      return false;
    }
    // supported multibase encodings:
    // 0x7a === 'z' (multibase code for base58btc)
    // 0x4d === 'M' (multibase code for base64pad)
    if(value[0] === 0x7a || value[0] === 0x4d) {
      return new MultibaseDecoder();
    }
  }
}
