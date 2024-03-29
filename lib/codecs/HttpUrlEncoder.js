/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class HttpUrlEncoder extends CborldEncoder {
  constructor({value, secure} = {}) {
    super();
    this.value = value;
    this.secure = secure;
  }

  encode() {
    const {value, secure} = this;
    const length = secure ? 'https://'.length : 'http://'.length;
    const entries = [
      new Token(Type.uint, secure ? 2 : 1),
      new Token(Type.string, value.slice(length))
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    // presume HTTPS is more common, check for it first
    if(value.startsWith('https://')) {
      return new HttpUrlEncoder({value, secure: true});
    }
    if(value.startsWith('http://')) {
      return new HttpUrlEncoder({value, secure: false});
    }
  }
}
