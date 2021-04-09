/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Token, Type} from 'cborg';

export class XsdDateTimeEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;
    const parsed = Date.parse(value);
    const secondsSinceEpoch = Math.ceil(parsed.valueOf() / 1000);
    const secondsToken = new Token(Type.uint, secondsSinceEpoch);
    const millisecondIndex = value.indexOf('.');
    if(millisecondIndex === -1) {
      // second precision
      return secondsToken;
    }

    // include subsecond precision
    const entries = [
      secondsToken,
      new Token(Type.uint, parseInt(value.substr(millisecondIndex), 10))
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    const parsed = Date.parse(value);
    if(!value.includes('T') || isNaN(parsed)) {
      // no time included or no date parsed, so cannot compress
      return false;
    }

    return new XsdDateTimeEncoder({value});
  }
}
