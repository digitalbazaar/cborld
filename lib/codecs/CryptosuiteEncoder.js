/*!
 * Copyright (c) 2023-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {CRYPTOSUITE_STRING_TO_ID} from './registeredTermCodecs.js';

export class CryptosuiteEncoder extends CborldEncoder {
  constructor({value, appContextMap} = {}) {
    super();
    this.value = value;
    this.appContextMap = appContextMap;
  }

  encode() {
    const {value} = this;
    const id = this.appContextMap.get(value) ??
      CRYPTOSUITE_STRING_TO_ID.get(value);
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return false;
    }
    const {appContextMap} = transformer;
    return new CryptosuiteEncoder({value, appContextMap});
  }
}
