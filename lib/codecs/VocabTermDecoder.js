/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {UrlDecoder} from './UrlDecoder.js';

export class VocabTermDecoder extends CborldDecoder {
  constructor({term} = {}) {
    super();
    this.term = term;
  }

  decode() {
    return this.term;
  }

  static createDecoder({value, transformer} = {}) {
    if(Array.isArray(value)) {
      return UrlDecoder.createDecoder({value, transformer});
    }
    const term = transformer.idToTerm.get(value);
    if(term !== undefined) {
      return new VocabTermDecoder({term});
    }
  }
}
