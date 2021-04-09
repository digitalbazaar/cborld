/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Token, Type} from 'cborg';

export class XsdDateEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;
    const secondsSinceEpoch = Math.ceil(value.valueOf() / 1000);
    return new Token(Type.uint, secondsSinceEpoch);
  }

  static createEncoder({value} = {}) {
    const parsed = Date.parse(value);
    if(value.includes('T') || isNaN(parsed)) {
      // time included or no date parsed, so cannot compress
      return false;
    }

    return new XsdDateEncoder({value: parsed});
  }
}
