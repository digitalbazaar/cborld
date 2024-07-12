/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class HttpUrlDecoder extends CborldDecoder {
  constructor({scheme} = {}) {
    super();
    this.scheme = scheme;
  }

  decode({value} = {}) {
    return `${this.scheme}${value[1]}`;
  }

  static createDecoder({value, transformer} = {}) {
    if(!(value.length === 2 && typeof value[1] === 'string')) {
      return false;
    }
    const scheme = transformer.reverseUrlSchemeTable.get(value[0]);
    if(scheme === undefined) {
      return false;
    }
    return new HttpUrlDecoder({
      scheme
    });
  }
}
