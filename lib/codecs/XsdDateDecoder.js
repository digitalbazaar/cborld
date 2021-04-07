/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateDecoder extends CborldDecoder {
  decode({encoded} = {}) {
    // FIXME: remove logging
    console.log('decoding Xsd Date', encoded);
    const dateString = new Date(encoded[0] * 1000).toISOString();
    return dateString.substring(0, dateString.indexOf('T'));
  }

  static createDecoder({encoded} = {}) {
    if(!(Array.isArray(encoded) && encoded.length === 1 &&
      typeof encoded[0] === 'number')) {
      return false;
    }
    return new XsdDateDecoder();
  }
}
