/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

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
      const compressedValue = dataview.getUint32(0);
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
