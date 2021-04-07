/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateTimeDecoder extends CborldDecoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  decode({encoded} = {}) {
    // FIXME: remove logging
    console.log('decoding Xsd DateTime', encoded);
    if(typeof encoded === 'number') {
      return new Date(encoded * 1000).toISOString().replace('.000Z', 'Z');
    }
    return new Date(encoded[0] * 1000 + encoded[1]).toISOString();
  }

  static createDecoder({encoded} = {}) {
    if(typeof encoded === 'number') {
      return new XsdDateTimeDecoder();
    }
    if(Array.isArray(encoded) && encoded.length === 2 &&
      (typeof encoded[0] === 'number' || typeof encoded[1] === 'number')) {
      return new XsdDateTimeDecoder();
    }
  }
}
