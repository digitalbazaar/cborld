/*!
 * Copyright (c) 2023-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {CRYPTOSUITE_STRING_TO_ID} from './registeredTermCodecs.js';

export class CryptosuiteEncoder extends CborldEncoder {
  constructor({value, compressionMap} = {}) {
    super();
    this.value = value;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value} = this;
    const id = this.compressionMap.get(value) ??
      CRYPTOSUITE_STRING_TO_ID.get(value);
    if(id === undefined) {
      return new Token(Type.string, value);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return false;
    }
    const {stringTable, typedLiteralTable} = transformer;
    if(stringTable.has(value)) {
      return new CryptosuiteEncoder({value, compressionMap: stringTable});
    } else if(typedLiteralTable.get('https://w3id.org/security#cryptosuiteString').has(value)) {
      return new CryptosuiteEncoder({
        value,
        compressionMap: typedLiteralTable.get('https://w3id.org/security#cryptosuiteString')
      });
    }
  }
}
