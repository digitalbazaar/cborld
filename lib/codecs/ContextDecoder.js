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

  decode({encoded} = {}) {
    // FIXME: remove logging
    console.log('decoding context', encoded);

    // FIXME: determine if `this.appContextMap` will include both numbers
    // and strings as keys
    const url = ID_TO_URL.get(encoded) || this.appContextMap.get(encoded);
    if(url === undefined) {
      // FIXME: change to CBOR-LD error
      throw new Error('unknown context ID');
    }
    return url;
  }

  static createDecoder({encoded, appContextMap} = {}) {
    if(typeof encoded !== 'number') {
      return false;
    }
    return new ContextDecoder({appContextMap});
  }
}
