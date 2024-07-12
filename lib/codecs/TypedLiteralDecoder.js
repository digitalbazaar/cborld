/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {intFromBytes} from './helpers.js';

export class TypedLiteralDecoder extends CborldDecoder {
  constructor({id} = {}) {
    super();
    this.id = id;
  }

  decode() {
    return this.id;
  }

  static createDecoder({value, transformer, termType} = {}) {
    if(value instanceof Uint8Array) {
      const subTable = transformer
      .reverseTypedLiteralTable.get(termType);
      if(subTable !== undefined) {
        const intValue = intFromBytes({bytes: value});
        const uncompressedValue = subTable.get(intValue);
      if(uncompressedValue === undefined) {
        throw new CborldError(
          'ERR_UNKNOWN_TYPED_LITERAL_VALUE',
          `Typed literal value "${uncompressedValue}" not found`);
      }
      return new TypedLiteralDecoder({id: uncompressedValue});
      }
    }
    const id = transformer.reverseTypedLiteralTable
      .get(termType)?.get(value);
    if(id !== undefined) {
      return new TypedLiteralDecoder({id});
    }
  }
}
