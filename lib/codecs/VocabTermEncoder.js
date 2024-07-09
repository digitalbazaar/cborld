/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {UriEncoder} from './UriEncoder.js';

export class VocabTermEncoder extends CborldEncoder {
  constructor({termId} = {}) {
    super();
    this.termId = termId;
  }

  encode() {
    return new Token(Type.uint, this.termId);
  }

  static createEncoder({value, transformer} = {}) {
    const {keywordsTable} = transformer;
    const termId = keywordsTable.get(value);
    if(termId !== undefined) {
      return new VocabTermEncoder({termId});
    }
    return UriEncoder.createEncoder({value});
  }
}
