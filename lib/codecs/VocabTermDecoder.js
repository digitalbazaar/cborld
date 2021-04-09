/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {UriDecoder} from './UriDecoder.js';

export class VocabTermDecoder extends CborldDecoder {
  constructor({term} = {}) {
    super();
    this.term = term;
  }

  decode() {
    return this.term;
  }

  static createDecoder({value, transformer} = {}) {
    if(value.length > 1) {
      return UriDecoder.createDecoder({value, transformer});
    }
    const term = transformer.idToTerm.get(value[0]);
    if(term !== undefined) {
      return new VocabTermDecoder({term});
    }
  }
}
