/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class TypedLiteralDecoder extends CborldEncoder {
  constructor({value, compressionMap} = {}) {
    super();
    this.value = value;
    this.compressionMap = compressionMap;
  }

  decode() {
    const {value} = this;
    const id = this.compressionMap.get(value);
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, id);
  }

  static createDecoder({value, reverseCompressionMap} = {}) {
    return new TypedLiteralEncoder({value, reverseCompressionMap});
  }
}