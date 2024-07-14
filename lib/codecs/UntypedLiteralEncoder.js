/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {bytesFromInt} from './helpers.js';
import {CborldEncoder} from './CborldEncoder.js';
import {CborldError} from '../CborldError.js';

const TYPE_TO_TOKEN = new Map([
  ['string', 0],
  ['number', 1],
  ['boolean', 2]
]);

export class UntypedLiteralEncoder extends CborldEncoder {
  constructor({value, compressionMap} = {}) {
    super();
    this.value = value;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value, compressionMap} = this;
    const type = typeof value;
    const tokenValue = TYPE_TO_TOKEN.get(type);
    if(tokenValue === undefined) {
      throw new CborldError(
        'ERR_UNSUPPORTED_JSON_TYPE',
        `Unsupported value type "${type}".`);
    }
    if(type === 'string') {
      const compressedValue = compressionMap.get(value);
      if(compressedValue !== undefined) {
        const bytes = bytesFromInt({intValue: compressedValue});
        return new Token(Type.bytes, bytes);
      }
      return new Token(Type.string, value);
    }
    if(type === 'number') {
      return new Token(Type.uint, value);
    }
    if(type === 'boolean') {
      // FIXME
      return new Token(Type.true, value);
    }
  }

  static createEncoder({value, transformer} = {}) {
    return new UntypedLiteralEncoder({
      value,
      compressionMap: transformer.stringTable
    });
  }
}
