/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {encode as encodeBase58} from 'base58-universal';


export class Base58DidUrlDecoder extends CborldDecoder {
  constructor({decompressionMap} = {}) {
    super();
    this.decompressionMap = decompressionMap;
  }

  decode({value} = {}) {
    let url = this.decompressionMap.get(value[0]);
    if(typeof value[1] === 'string') {
      url += value[1];
    } else {
      url += `z${encodeBase58(value[1])}`;
    }
    if(value.length > 2) {
      if(typeof value[2] === 'string') {
        url += `#${value[2]}`;
      } else {
        url += `#z${encodeBase58(value[2])}`;
      }
    }
    return url;
  }

  static createDecoder({value, transformer} = {}) {
    let decompressionMap = transformer.reverseUrlTable;
    if(!(Array.isArray(value) && value.length > 1 && value.length <= 3)) {
      return false;
    }
    if(!decompressionMap.has(value[0])) {
      return false;
    }
    return new Base58DidUrlDecoder({decompressionMap});
  }
}
