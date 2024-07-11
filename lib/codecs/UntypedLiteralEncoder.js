/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
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
      if(compressionMap.has(value)) {
        const compressedValue = compressionMap.get(value);
        // FIXME: size of bytes?
        const buffer = new ArrayBuffer(4);
        const dataview = new DataView(buffer);
        dataview.setUint32(0, compressedValue);
        const bytes = new Uint8Array(buffer);
        return new Token(Type.bytes, bytes);

      } else {
        return new Token(Type.string, value);
      }
    } else if(type === 'number') {
      return new Token(Type.uint, value);
    } else if(type === 'boolean') {
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
