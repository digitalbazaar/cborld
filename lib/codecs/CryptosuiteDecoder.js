/*!
 * Copyright (c) 2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {ID_TO_STRING} from './registeredTermCodecs.js';

export class CryptosuiteDecoder extends CborldDecoder {
  constructor({reverseAppContextMap} = {}) {
    super();
    this.reverseAppContextMap = reverseAppContextMap;
  }

  decode({value} = {}) {
    // handle uncompressed cryptosuite string
    if(typeof value !== 'number') {
      return value;
    }

    // handle compressed cryptosuite string
    const str = this.reverseAppContextMap.get(value) || ID_TO_STRING.get(value);
    if(str === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_CRYPTOSUITE_STRING',
        `Undefined compressed context "${value}".`);
    }
    return str;
  }

  static createDecoder({transformer} = {}) {
    const {reverseAppContextMap} = transformer;
    return new CryptosuiteDecoder({reverseAppContextMap});
  }
}
