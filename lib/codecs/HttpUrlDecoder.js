/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class HttpUrlDecoder extends CborldDecoder {
  constructor({secure} = {}) {
    super();
    this.secure = secure;
  }

  decode({encoded} = {}) {
    // FIXME: remove logging
    console.log('decoding HTTP(S) URL', encoded);
    const scheme = this.secure ? 'https://' : 'http://';
    return `${scheme}${encoded[1]}`;
  }

  static createEncoder({encoded} = {}) {
    if(!(encoded.length === 2 && typeof encoded[1] === 'string')) {
      return false;
    }
    return new HttpUrlDecoder({secure: encoded[0] === 2});
  }
}
