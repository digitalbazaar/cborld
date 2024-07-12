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
      const compressedValue = compressionMap.get(value);
      if(compressedValue !== undefined) {
        // FIXME: size of bytes?
        let buffer;
        let dataview;
        if(compressedValue < 256) {
          buffer = new ArrayBuffer(1);
          dataview = new DataView(buffer);
          dataview.setUint8(0, compressedValue);
        } else if(compressedValue < 65536) {
          buffer = new ArrayBuffer(2);
          dataview = new DataView(buffer);
          dataview.setUint16(0, compressedValue);
        } else if(compressedValue < 4294967296) {
          buffer = new ArrayBuffer(4);
          dataview = new DataView(buffer);
          dataview.setUint32(0, compressedValue);
        } else {
          throw new CborldError(
            'ERR_COMPRESSION_VALUE_TOO_LARGE',
            `Compression value "${compressedValue}" too large.`);
        }
        const bytes = new Uint8Array(buffer);
        return new Token(Type.bytes, bytes);
      }
      return new Token(Type.string, value);
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
