/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {intFromBytes} from './helpers.js';

export class UntypedLiteralDecoder extends CborldDecoder {
  constructor({value, decompressionMap} = {}) {
    super();
    this.value = value;
    this.decompressionMap = decompressionMap;
  }

  decode() {
    const {value, decompressionMap} = this;
    if(value instanceof Uint8Array) {
      const compressedValue = intFromBytes({bytes: value});
      const decompressedValue = decompressionMap.get(compressedValue);
      if(decompressedValue !== undefined) {
        return decompressedValue;
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
