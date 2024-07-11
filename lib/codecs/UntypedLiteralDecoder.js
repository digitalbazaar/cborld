/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldDecoder} from './CborldDecoder.js';

const TOKEN_TO_TYPE = new Map([
  [0, 'string'],
  [1, 'number'],
  [2, 'boolean']
]);

export class UntypedLiteralDecoder extends CborldDecoder {
  constructor({value, decompressionMap} = {}) {
    super();
    this.value = value;
    this.decompressionMap = decompressionMap;
  }

  decode() {
    const {value, decompressionMap} = this;
    if(Array.isArray(value) && value.length === 4){
      const buffer = new ArrayBuffer(value);
      const dataview = new DataView(buffer);
      const compressedValue = dataview.getUint32(0);
      if(decompressionMap.has(compressedValue)){
        return decompressionMap.get(compressedValue);
      }
    } 
    return value;
  }
  

  static createDecoder({value, transformer} = {}) {
    return new UntypedLiteralDecoder({value, decompressionMap: transformer.reverseStringTable});
  }
}