/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateTimeDecoder extends CborldDecoder {
  constructor({compressedValue} = {}) {
    super();
    this.compressedValue = compressedValue;
  }

  decode({value} = {}) {
    if(this.compressedValue) {
      return this.compressedValue;
    }
    if(typeof value === 'number') {
      return new Date(value * 1000).toISOString().replace('.000Z', 'Z');
    }
    return new Date(value[0] * 1000 + value[1]).toISOString();
  }

  static createDecoder({value, transformer} = {}) {
    const compressedValue = transformer.reverseStringTable.get(value);
    if(compressedValue) {
      return new XsdDateTimeDecoder({compressedValue});
    }
    if(typeof value === 'number') {
      return new XsdDateTimeDecoder();
    }
    if(Array.isArray(value) && value.length === 2 &&
      (typeof value[0] === 'number' || typeof value[1] === 'number')) {
      return new XsdDateTimeDecoder();
    }
  }
}
