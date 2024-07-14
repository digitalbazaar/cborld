/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {encode as encodeBase58} from 'base58-universal';
import {REVERSE_URL_SCHEME_TABLE} from '../tables.js';

export class Base58DidUrlDecoder extends CborldDecoder {
  constructor({prefix} = {}) {
    super();
    this.prefix = prefix;
  }

  decode({value} = {}) {
    let url = this.prefix;
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

  static createDecoder({value} = {}) {
    if(value.length > 1 && value.length <= 3) {
      const prefix = REVERSE_URL_SCHEME_TABLE.get(value[0]);
      return new Base58DidUrlDecoder({prefix});
    }
  }
}
