/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class HttpUrlEncoder extends CborldEncoder {
  constructor({value, secure, compressionMap} = {}) {
    super();
    this.value = value;
    this.secure = secure;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value, secure} = this;
    const length = secure ? 'https://'.length : 'http://'.length;
    const entries = [
      new Token(Type.uint, secure ? this.compressionMap.get('https://') : this.compressionMap.get('http://')),
      new Token(Type.string, value.slice(length))
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value, transformer} = {}) {
    // presume HTTPS is more common, check for it first
    if(value.startsWith('https://')) {
      return new HttpUrlEncoder({value, compressionMap: transformer.urlTable, secure: true});
    }
    if(value.startsWith('http://')) {
      return new HttpUrlEncoder({value, compressionMap: transformer.urlTable, secure: false});
    }
  }
}
