/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {bytesFromInt} from './helpers.js';
import {CborldEncoder} from './CborldEncoder.js';

const TYPES_COMPRESSING_TO_INT = new Set([
  '@vocab',
  'https://w3id.org/security#multibase',
  'http://www.w3.org/2001/XMLSchema#date',
  'http://www.w3.org/2001/XMLSchema#dateTime'
]);
export class TypedLiteralEncoder extends CborldEncoder {
  constructor({value, id, termType} = {}) {
    super();
    this.value = value;
    this.id = id;
    this.termType = termType
  }

  encode() {
    const {value, id, termType} = this;
    if(TYPES_COMPRESSING_TO_INT.has(termType)) {
      const bytes = bytesFromInt({intValue: id});
      return new Token(Type.bytes, bytes);
    }
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
        id,
        termType
      });
    }
  }
}
