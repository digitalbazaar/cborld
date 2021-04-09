/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {ID_TO_URL} from './registeredContexts.js';

export class ContextDecoder extends CborldDecoder {
  constructor({reverseAppContextMap} = {}) {
    super();
    this.reverseAppContextMap = reverseAppContextMap;
  }

  decode({value} = {}) {
    // FIXME: remove logging
    console.log('decoding context', value);
    const url = ID_TO_URL.get(value) || this.reverseAppContextMap.get(value);
    if(url === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_CONTEXT',
        `Undefined compressed context "${value}".`);
    }
    return url;
  }

  static createDecoder({value, transformer} = {}) {
    if(typeof value !== 'number') {
      return false;
    }
    const {reverseAppContextMap} = transformer;
    return new ContextDecoder({reverseAppContextMap});
  }
}
