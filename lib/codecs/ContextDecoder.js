/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {ID_TO_URL} from './registeredContexts.js';

export class ContextDecoder extends CborldDecoder {
  constructor({appContextMap} = {}) {
    super();
    this.appContextMap = appContextMap;
  }

  decode({value} = {}) {
    // FIXME: remove logging
    console.log('decoding context', value);

    // FIXME: determine if `this.appContextMap` will include both numbers
    // and strings as keys
    const url = ID_TO_URL.get(value) || this.appContextMap.get(value);
    if(url === undefined) {
      // FIXME: change to CBOR-LD error
      throw new Error('unknown context ID');
    }
    return url;
  }

  static createDecoder({value, appContextMap} = {}) {
    if(typeof value !== 'number') {
      return false;
    }
    return new ContextDecoder({appContextMap});
  }
}
