/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class XsdDateEncoder extends CborldEncoder {
  constructor({value, parsed} = {}) {
    super();
    this.value = value;
    this.parsed = parsed;
  }

  encode() {
    const {value, parsed} = this;

    const secondsSinceEpoch = Math.floor(parsed / 1000);
    const dateString = new Date(secondsSinceEpoch * 1000).toISOString();
    const expectedDate = dateString.slice(0, dateString.indexOf('T'));
    if(value !== expectedDate) {
      // compression would be lossy, do not compress
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, secondsSinceEpoch);
  }

  static createEncoder({value} = {}) {
    if(value.includes('T')) {
      // time included, cannot compress
      return;
    }
    const parsed = Date.parse(value);
    if(isNaN(parsed)) {
      // no date parsed, cannot compress
      return;
    }
    return new XsdDateEncoder({value, parsed});
  }
}
