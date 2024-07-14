/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {CborldError} from '../CborldError.js';

// FIXME: make set if token types aren't needed
const TYPE_TO_TOKEN = new Map([
  ['string', 0],
  ['number', 1],
  ['boolean', 2]
]);

export class UntypedLiteralEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;
    const type = typeof value;
    const tokenValue = TYPE_TO_TOKEN.get(type);
    if(tokenValue === undefined) {
      throw new CborldError(
        'ERR_UNSUPPORTED_JSON_TYPE',
        `Unsupported value type "${type}".`);
    }
    return value;
    if(type === 'string') {
      return new Token(Type.string, value);
    }
    if(type === 'number') {
      return new Token(Type.uint, value);
    }
    if(type === 'boolean') {
      return new Token(value ? Type.true : Type.false, value);
    }
  }

  static createEncoder({value} = {}) {
    return new UntypedLiteralEncoder({value});
  }
}
