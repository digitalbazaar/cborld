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

  static createDecoder({encoded, idToTerm} = {}) {
    if(encoded.length > 1) {
      return UriDecoder.createDecoder({encoded, idToTerm});
    }
    const term = idToTerm.get(encoded[0]);
    if(term !== undefined) {
      return new VocabTermDecoder({term});
    }
  }
}
