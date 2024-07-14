/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as base64url from 'base64url-universal';
import {Base64} from 'js-base64';
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {encode as encodeBase58} from 'base58-universal';

// this class is used to encode a multibase encoded value in CBOR-LD, which
// actually means transforming bytes to a multibase-encoded string
export class MultibaseDecoder extends CborldDecoder {
  constructor({string} = {}) {
    super();
    this.string = string;
  }
  decode({value} = {}) {
    const {buffer, byteOffset, length} = value;
    const suffix = new Uint8Array(buffer, byteOffset + 1, length - 1);
    if(this.string !== undefined) {
      return this.string;
    }
    if(value[0] === 0x7a) {
      // 0x7a === 'z' (multibase code for base58btc)
      return `z${encodeBase58(suffix)}`;
    }
    if(value[0] === 0x75) {
      // 0x75 === 'u' (multibase code for base64url)
      return `u${base64url.encode(suffix)}`;
    }
    if(value[0] === 0x4d) {
      // 0x4d === 'M' (multibase code for base64pad)
      return `M${Base64.fromUint8Array(suffix)}`;
    }
    return value;
  }

  static createDecoder({value, transformer} = {}) {
    // use decompression map even if value is not a uint8array
    const {reverseStringTable} = transformer;

    if(typeof value === 'number') {
      const string = reverseStringTable.get(value);
      if(string === undefined) {
        throw new CborldError(
          'ERR_UNKNOWN_COMPRESSION_VALUE',
          `Multibase compressed value "${string}" not found`);
      }
      return new MultibaseDecoder({string});
    }

    if(!(value instanceof Uint8Array)) {
      return;
    }

    // supported multibase encodings:
    // 0x7a === 'z' (multibase code for base58btc)
    // 0x75 === 'u' (multibase code for base64url)
    // 0x4d === 'M' (multibase code for base64pad)
    if(value[0] === 0x7a || value[0] === 0x75 || value[0] === 0x4d) {
      return new MultibaseDecoder();
    }
  }
}
