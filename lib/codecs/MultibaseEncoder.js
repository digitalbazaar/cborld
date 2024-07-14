/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as base64url from 'base64url-universal';
import {Token, Type} from 'cborg';
import {Base64} from 'js-base64';
import {CborldEncoder} from './CborldEncoder.js';
import {decode as decodeBase58} from 'base58-universal';

// this class is used to encode a multibase encoded value in CBOR-LD, which
// actually means transforming a multibase-encoded string to bytes
export class MultibaseEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;

    let prefix;
    let suffix;
    if(value[0] === 'z') {
      // 0x7a === 'z' (multibase code for base58btc)
      prefix = 0x7a;
      suffix = decodeBase58(value.slice(1));
    } else if(value[0] === 'u') {
      // 0x75 === 'u' (multibase code for base64url)
      prefix = 0x75;
      const buffer = base64url.decode(value.slice(1));
      suffix = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
    } else if(value[0] === 'M') {
      // 0x4d === 'M' (multibase code for base64pad)
      prefix = 0x4d;
      suffix = Base64.toUint8Array(value.slice(1));
    }

    const bytes = new Uint8Array(1 + suffix.length);
    bytes[0] = prefix;
    bytes.set(suffix, 1);
    return new Token(Type.bytes, bytes);
  }

  static createEncoder({value} = {}) {
    if(typeof value !== 'string') {
      return;
    }
    // supported multibase encodings:
    // 0x7a === 'z' (multibase code for base58btc)
    // 0x75 === 'u' (multibase code for base64url)
    // 0x4d === 'M' (multibase code for base64pad)
    if(value[0] === 'z' || value[0] === 'u' || value[0] === 'M') {
      return new MultibaseEncoder({value});
    }
  }
}
