/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class XsdDateTimeEncoder extends CborldEncoder {
  constructor({value, parsed, compressionMap} = {}) {
    super();
    this.value = value;
    this.parsed = parsed;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value, parsed, compressionMap} = this;
    // check string table first
    if(compressionMap.has(value)){
      return compressionMap.get(value);
    }

    const secondsSinceEpoch = Math.floor(parsed / 1000);
    const secondsToken = new Token(Type.uint, secondsSinceEpoch);
    const millisecondIndex = value.indexOf('.');
    if(millisecondIndex === -1) {
      const expectedDate = new Date(
        secondsSinceEpoch * 1000).toISOString().replace('.000Z', 'Z');
      if(value !== expectedDate) {
        // compression would be lossy, do not compress
        return new Token(Type.string, value);
      }
      // compress with second precision
      return secondsToken;
    }

    const milliseconds = parseInt(value.slice(millisecondIndex + 1), 10);
    const expectedDate = new Date(
      secondsSinceEpoch * 1000 + milliseconds).toISOString();
    if(value !== expectedDate) {
      // compress would be lossy, do not compress
      return new Token(Type.string, value);
    }

    // compress with subsecond precision
    const entries = [
      secondsToken,
      new Token(Type.uint, milliseconds)
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value, transformer} = {}) {
    if(transformer.stringTable.has(value)){
      return new XsdDateTimeEncoder({value, parsed, compressionMap: transformer.stringTable});
    }
    if(!value.includes('T')) {
      // no time included, cannot compress
      return false;
    }
    const parsed = Date.parse(value);
    if(isNaN(parsed)) {
      // no date parsed, cannot compress
      return false;
    }

    return new XsdDateTimeEncoder({value, parsed, compressionMap: transformer.stringTable});
  }
}
