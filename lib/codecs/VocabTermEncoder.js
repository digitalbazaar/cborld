/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {UrlEncoder} from './UrlEncoder.js';

export class VocabTermEncoder extends CborldEncoder {
  constructor({termId} = {}) {
    super();
    this.termId = termId;
  }

  encode() {
    return new Token(Type.uint, this.termId);
  }

  static createEncoder({value, transformer} = {}) {
    const termId = transformer.termToId.get(value);
    if(termId !== undefined) {
      return new VocabTermEncoder({termId});
    }
    return UrlEncoder.createEncoder({value, transformer});
  }
}
