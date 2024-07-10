/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class XsdDateEncoder extends CborldEncoder {
  constructor({value, parsed, compressionMap} = {}) {
    super();
    this.value = value;
    this.parsed = parsed;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value, parsed, compressionMap} = this;

    //use string table if possible
    if(compressionMap.has(value)){
      return compressionMap.get(value);
    }

    const secondsSinceEpoch = Math.floor(parsed / 1000);
    const dateString = new Date(secondsSinceEpoch * 1000).toISOString();
    const expectedDate = dateString.slice(0, dateString.indexOf('T'));
    if(value !== expectedDate) {
      // compression would be lossy, do not compress
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, secondsSinceEpoch);
  }

  static createEncoder({value, transformer} = {}) {
    if(transformer.stringTable.has(value)){
      return new XsdDateEncoder({value, compressionMap: transformer.stringTable})
    }
    
    if(value.includes('T')) {
      // time included, cannot compress
      return false;
    }
    const parsed = Date.parse(value);
    if(isNaN(parsed)) {
      // no date parsed, cannot compress
      return false;
    }

    return new XsdDateEncoder({value, parsed, compressionMap: transformer.stringTable});
  }
}
