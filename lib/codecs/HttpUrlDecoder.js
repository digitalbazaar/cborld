/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
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
      return;
    }
    const scheme = transformer.reverseUrlSchemeTable.get(value[0]);
    if(scheme === undefined) {
      return;
    }
    return new HttpUrlDecoder({scheme});
  }
}
