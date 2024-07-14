/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {URL_SCHEME_TABLE} from '../tables.js';

export class HttpUrlEncoder extends CborldEncoder {
  constructor({value, scheme} = {}) {
    super();
    this.value = value;
    this.scheme = scheme;
  }

  encode() {
    const {value, scheme} = this;
    const entries = [
      new Token(Type.uint, URL_SCHEME_TABLE.get(scheme)),
      new Token(Type.string, value.slice(scheme.length))
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    // presume HTTPS is more common, check for it first
    if(value.startsWith('https://')) {
      return new HttpUrlEncoder({value, scheme: 'https://'});
    }
    if(value.startsWith('http://')) {
      return new HttpUrlEncoder({value, scheme: 'http://'});
    }
  }
}
