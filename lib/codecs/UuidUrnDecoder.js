/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {stringify} from 'uuid';

export class UuidUrnDecoder extends CborldDecoder {
  decode({encoded} = {}) {
    // FIXME: remove logging
    console.log('decoding urn:uuid URI', encoded);
    const uuid = typeof encoded[1] === 'string' ?
      encoded[1] : stringify(encoded[1]);
    return `urn:uuid:${uuid}`;
  }

  static createDecoder({encoded} = {}) {
    if(encoded.length === 2 &&
      (typeof encoded[1] === 'string' || encoded[1] instanceof Uint8Array)) {
      return new UuidUrnDecoder();
    }
  }
}
