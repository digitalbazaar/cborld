/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class TypedLiteralDecoder extends CborldEncoder {
  constructor({value, reverseCompressionMap} = {}) {
    super();
    this.value = value;
    this.reverseCompressionMap = reverseCompressionMap;
  }

  decode() {
    const {value} = this;
    const id = this.reverseCompressionMap.get(value);
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return id;
  }

  static createDecoder({value, reverseCompressionMap} = {}) {
    return new TypedLiteralDecoder({value, reverseCompressionMap});
  }
}