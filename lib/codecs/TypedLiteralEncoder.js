/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class TypedLiteralEncoder extends CborldEncoder {
  constructor({value, id} = {}) {
    super();
    this.value = value;
    this.id = id;
  }

  encode() {
    const {value, id} = this;
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer, termType} = {}) {
    const id = transformer.typedLiteralTable
      .get(termType)?.get(value);
    if(id !== undefined) {
      return new TypedLiteralEncoder({
        value,
        id
      });
    }
  }
}
