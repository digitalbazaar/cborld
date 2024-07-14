/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateDecoder extends CborldDecoder {
  constructor({decoded} = {}) {
    super();
    this.decoded = decoded;
  }

  decode({value} = {}) {
    const {decoded} = this;
    if(decoded !== undefined) {
      return decoded;
    }
    const dateString = new Date(value * 1000).toISOString();
    return dateString.slice(0, dateString.indexOf('T'));
  }

  static createDecoder({value, transformer} = {}) {
    const decoded = transformer.reverseStringTable.get(value);
    if(typeof value === 'number' || decoded !== undefined) {
      return new XsdDateDecoder({decoded});
    }
  }
}

