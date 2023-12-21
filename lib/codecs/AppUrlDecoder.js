/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';

const ID = 1026;

export class AppUrlDecoder extends CborldDecoder {
  constructor({reverseAppContextMap} = {}) {
    super();
    this.reverseAppContextMap = reverseAppContextMap;
  }

  decode({value} = {}) {
    // handle compressed app URL
    const url = this.reverseAppContextMap.get(value[1]);
    if(url === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_APP_URL',
        `Undefined compressed app URL "${value}".`);
    }
    return url;
  }

  static createDecoder({value, transformer} = {}) {
    if(!(Array.isArray(value) && value.length === 2)) {
      return false;
    }
    if(!(value[0] === ID)) {
      return false;
    }
    const {reverseAppContextMap} = transformer;
    return new AppUrlDecoder({reverseAppContextMap});
  }
}
