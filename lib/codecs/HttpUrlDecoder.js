/*!
 * Copyright (c) 2021-2026 Digital Bazaar, Inc.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {REVERSE_URL_SCHEME_TABLE} from '../tables.js';

export class HttpUrlDecoder extends CborldDecoder {
  constructor({scheme} = {}) {
    super();
    this.scheme = scheme;
  }

  decode({value} = {}) {
    return `${this.scheme}${value[1]}`;
  }

  static createDecoder({value} = {}) {
    if(value.length === 2 && typeof value[1] === 'string') {
      const scheme = REVERSE_URL_SCHEME_TABLE.get(value[0]);
      return new HttpUrlDecoder({scheme});
    }
  }
}
