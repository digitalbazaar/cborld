/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class HttpUrlDecoder extends CborldDecoder {
  constructor({secure} = {}) {
    super();
    this.secure = secure;
  }

  decode({value} = {}) {
    const scheme = this.secure ? 'https://' : 'http://';
    return `${scheme}${value[1]}`;
  }

  static createEncoder({value} = {}) {
    if(!(value.length === 2 && typeof value[1] === 'string')) {
      return false;
    }
    return new HttpUrlDecoder({secure: value[0] === 2});
  }
}
