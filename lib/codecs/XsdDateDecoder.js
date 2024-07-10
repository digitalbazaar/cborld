/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateDecoder extends CborldDecoder {
  constructor({decompressionMap} = {}) {
    super();
    this.decompressionMap = decompressionMap;
  }

  decode({value} = {}) {
    if(this.decompressionMap.has(value)){
      return this.decompressionMap.get(value);
    }
    const dateString = new Date(value * 1000).toISOString();
    return dateString.slice(0, dateString.indexOf('T'));
  }

  static createDecoder({value, transformer} = {}) {
    if(typeof value === 'number' || transformer.reverseStringTable.has(value)) {
      return new XsdDateDecoder({decompressionMap: transformer.reverseStringTable});
    }
  }
}
