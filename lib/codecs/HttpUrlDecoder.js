/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class HttpUrlDecoder extends CborldDecoder {
  constructor({decompressionMap} = {}) {
    super();
    this.decompressionMap = decompressionMap
  }

  decode({value} = {}) {
    const scheme = this.decompressionMap.get(value[0]);
    return `${scheme}${value[1]}`;
  }

  static createDecoder({value, transformer} = {}) {
    if(!(value.length === 2 && typeof value[1] === 'string')) {
      return false;
    }
    return new HttpUrlDecoder({decompressionMap: transformer.reverseUrlSchemeTable});
  }
}
