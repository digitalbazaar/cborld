/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateTimeDecoder extends CborldDecoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  decode({value} = {}) {
    if(typeof value === 'number') {
      return new Date(value * 1000).toISOString().replace('.000Z', 'Z');
    }
    return new Date(value[0] * 1000 + value[1]).toISOString();
  }

  static createDecoder({value} = {}) {
    if(typeof value === 'number') {
      return new XsdDateTimeDecoder();
    }
    if(Array.isArray(value) && value.length === 2 &&
      (typeof value[0] === 'number' || typeof value[1] === 'number')) {
      return new XsdDateTimeDecoder();
    }
  }
}
