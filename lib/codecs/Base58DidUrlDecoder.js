/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {encode as encodeBase58} from 'base58-universal';

const ID_TO_SCHEME = new Map([
  // Note: only v1 mainnet is supported
  [1024, 'did:v1:nym:'],
  [1025, 'did:key:']
]);

export class Base58DidUrlDecoder extends CborldDecoder {
  decode({encoded} = {}) {
    let url = ID_TO_SCHEME.get(encoded[0]);
    if(typeof encoded[1] === 'string') {
      url += encoded[1];
    } else {
      url += `z${encodeBase58(encoded[1])}`;
    }
    if(encoded.length > 2) {
      if(typeof encoded[2] === 'string') {
        url += `#${encoded[2]}`;
      } else {
        url += `#${encodeBase58(encoded[2])}`;
      }
    }
    return url;
  }

  static createDecoder({encoded} = {}) {
    if(!(Array.isArray(encoded) &&
      encoded.length > 1 && encoded.length <= 3)) {
      return false;
    }
    if(!ID_TO_SCHEME.has(encoded[0])) {
      return false;
    }
    return new Base58DidUrlDecoder();
  }
}
