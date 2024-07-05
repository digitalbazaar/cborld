/*!
 * Copyright (c) 2023-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {CRYPTOSUITE_ID_TO_STRING} from './registeredTermCodecs.js';

export class CryptosuiteDecoder extends CborldDecoder {
  constructor({reverseCompressionMap} = {}) {
    super();
    this.reverseCompressionMap = reverseCompressionMap;
  }

  decode({value} = {}) {
    // handle uncompressed cryptosuite string
    if(typeof value !== 'number') {
      return value;
    }

    // handle compressed cryptosuite string
    const str = this.reverseCompressionMap.get(value) ??
      CRYPTOSUITE_ID_TO_STRING.get(value);
    if(str === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_CRYPTOSUITE_STRING',
        `Undefined compressed context "${value}".`);
    }
    return str;
  }

  static createDecoder({transformer} = {}) {
    const {reverseCompressionMap} = transformer;
    return new CryptosuiteDecoder({reverseCompressionMap});
  }
}
