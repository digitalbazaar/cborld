/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldDecoder} from './CborldDecoder.js';

export class TypedLiteralDecoder extends CborldDecoder {
  constructor({value, reverseCompressionMap} = {}) {
    super();
    this.value = value;
    this.reverseCompressionMap = reverseCompressionMap;
  }

  decode() {
    const {value} = this;
    const id = this.reverseCompressionMap.get(value);
    if(id === undefined) {
      return value;
    }
    return id;
  }

  static createDecoder({value, reverseCompressionMap} = {}) {
    return new TypedLiteralDecoder({value, reverseCompressionMap});
  }
}