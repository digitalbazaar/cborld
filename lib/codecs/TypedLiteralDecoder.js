/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class TypedLiteralDecoder extends CborldDecoder {
  constructor({id} = {}) {
    super();
    this.id = id;
  }

  decode() {
    return this.id;
  }

  static createDecoder({value, transformer, termType} = {}) {
    const id = transformer.reverseTypedLiteralTable
      .get(termType)?.get(value);
    if(id !== undefined) {
      return new TypedLiteralDecoder({id});
    }
  }
}
