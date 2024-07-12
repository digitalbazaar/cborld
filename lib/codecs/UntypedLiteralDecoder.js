/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';

export class UntypedLiteralDecoder extends CborldDecoder {
  constructor({value, decompressionMap} = {}) {
    super();
    this.value = value;
    this.decompressionMap = decompressionMap;
  }

  decode() {
    const {value, decompressionMap} = this;
    if(value instanceof Uint8Array) {
      const buffer = value.buffer;
      const dataview = new DataView(buffer);
      let compressedValue;
      if(dataview.byteLength === 1) {
        compressedValue = dataview.getUint8(0);
      } else if(dataview.byteLength === 2) {
        compressedValue = dataview.getUint16(0);
      } else if(dataview.byteLength === 4) {
        compressedValue = dataview.getUint32(0);
      } else {
        throw new CborldError(
          'ERR_UNRECOGNIZED_BYTES',
          `Improperly formatted bytes "${value}" found.`);
      }

      if(decompressionMap.has(compressedValue)) {
        return decompressionMap.get(compressedValue);
      }
    }
    return value;
  }

  static createDecoder({value, transformer} = {}) {
    return new UntypedLiteralDecoder({
      value,
      decompressionMap: transformer.reverseStringTable
    });
  }
}
