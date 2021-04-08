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
  decode({value} = {}) {
    let url = ID_TO_SCHEME.get(value[0]);
    if(typeof value[1] === 'string') {
      url += value[1];
    } else {
      url += `z${encodeBase58(value[1])}`;
    }
    if(value.length > 2) {
      if(typeof value[2] === 'string') {
        url += `#${value[2]}`;
      } else {
        url += `#${encodeBase58(value[2])}`;
      }
    }
    return url;
  }

  static createDecoder({value} = {}) {
    if(!(Array.isArray(value) && value.length > 1 && value.length <= 3)) {
      return false;
    }
    if(!ID_TO_SCHEME.has(value[0])) {
      return false;
    }
    return new Base58DidUrlDecoder();
  }
}
