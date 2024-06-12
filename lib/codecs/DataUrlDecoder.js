/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64} from 'js-base64';
import {CborldDecoder} from './CborldDecoder.js';

export class DataUrlDecoder extends CborldDecoder {
  constructor() {
    super();
  }

  decode({value} = {}) {
    if(value.length === 3) {
      return `data:${value[1]};base64,${Base64.fromUint8Array(value[2])}`;
    } else {
      return `data:${value[1]}`;
    }
  }

  static createDecoder({value} = {}) {
    if(value.length === 3 && typeof value[1] === 'string' &&
      value[2] instanceof Uint8Array) {
      return new DataUrlDecoder({value});
    }
    if(value.length === 2 && typeof value[1] === 'string') {
      return new DataUrlDecoder({value});
    }
    return false;
  }
}
