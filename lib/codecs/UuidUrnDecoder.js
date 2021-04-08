/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {stringify} from 'uuid';

export class UuidUrnDecoder extends CborldDecoder {
  decode({value} = {}) {
    // FIXME: remove logging
    console.log('decoding urn:uuid URI', value);
    const uuid = typeof value[1] === 'string' ?
      value[1] : stringify(value[1]);
    return `urn:uuid:${uuid}`;
  }

  static createDecoder({value} = {}) {
    if(value.length === 2 &&
      (typeof value[1] === 'string' || value[1] instanceof Uint8Array)) {
      return new UuidUrnDecoder();
    }
  }
}
