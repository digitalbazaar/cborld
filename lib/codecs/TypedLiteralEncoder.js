/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class TypedLiteralEncoder extends CborldEncoder {
  constructor({value, compressionMap} = {}) {
    super();
    this.value = value;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value} = this;
    const id = this.compressionMap.get(value);
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer, termType} = {}) {
    const compressionMap =
      transformer.typedLiteralTable.get(termType);
    if(compressionMap) {
      return new TypedLiteralEncoder({
        value,
        compressionMap
      });
    } else {
      return false;
    }
  }
}
