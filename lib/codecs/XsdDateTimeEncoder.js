/*!
 * Copyright (c) 2021-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class XsdDateTimeEncoder extends CborldEncoder {
  constructor({value, parsed} = {}) {
    super();
    this.value = value;
    this.parsed = parsed;
  }

  encode() {
    const {value, parsed} = this;
    const secondsSinceEpoch = Math.floor(parsed / 1000);
    const tokenType = secondsSinceEpoch >= 0 ? Type.uint : Type.negint;
    const secondsToken = new Token(tokenType, secondsSinceEpoch);
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

  static createEncoder({value} = {}) {
    if(!value.includes('T')) {
      // no time included, cannot compress
      return;
    }
    const parsed = Date.parse(value);
    if(isNaN(parsed)) {
      // no date parsed, cannot compress
      return;
    }
    return new XsdDateTimeEncoder({value, parsed});
  }
}
