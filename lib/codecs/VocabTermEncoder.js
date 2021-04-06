/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Token, Type} from 'cborg';
import {UriEncoder} from './UriEncoder.js';

export class VocabTermEncoder extends CborldEncoder {
  constructor({value, termToId} = {}) {
    super();
    this.value = value;
    this.termToId = termToId;
  }

  encode() {
    // FIXME: remove logging
    console.log('encoding vocab term', this.value);
    const {value, termToId} = this;
    return new Token(Type.uint, termToId.get(value));
  }

  static createEncoder({value, termToId} = {}) {
    if(termToId.has(value)) {
      return new VocabTermEncoder({value, termToId});
    }
    return UriEncoder.createEncoder({value});
  }
}
