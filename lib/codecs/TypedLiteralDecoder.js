/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {intFromBytes} from './helpers.js';

export class TypedLiteralDecoder extends CborldDecoder {
  // FIXME: `id` is backwards here ... this should be the decoded value instead
  constructor({id} = {}) {
    super();
    this.id = id;
  }

  decode() {
    return this.id;
  }

  static createDecoder({value, transformer, termType} = {}) {
    const subTable = transformer.reverseTypedLiteralTable.get(termType);
    if(value instanceof Uint8Array) {
      if(subTable !== undefined) {
        const intValue = intFromBytes({bytes: value});
        const uncompressedValue = subTable.get(intValue);
        if(uncompressedValue === undefined) {
          throw new CborldError(
            'ERR_UNKNOWN_TYPED_LITERAL_VALUE',
            `Typed literal compression "${uncompressedValue}" not found`);
        }
        return new TypedLiteralDecoder({id: uncompressedValue});
      }
    }
    const id = subTable?.get(value);
    if(id !== undefined) {
      return new TypedLiteralDecoder({id});
    }
  }
}
