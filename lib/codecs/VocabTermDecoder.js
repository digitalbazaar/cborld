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
    if(Array.isArray(value)) {
      return UriDecoder.createDecoder({value, transformer});
    }
    let term;
    
    if(transformer.idToTerm.has(value)){
      term = transformer.idToTerm.get(value);
    }
    
    else if(transformer.reverseStringTable.has(value)){
      term = transformer.reverseStringTable.get(value);
    }
    if(term !== undefined) {
      return new VocabTermDecoder({term});
    }
  }
}
