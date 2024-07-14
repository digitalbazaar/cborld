/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
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
    // FIXME: just use termToId, string table already handled
    let termId;
    if(transformer.stringTable.has(value)) {
      termId = transformer.stringTable.get(value);
    } else if(transformer.termToId.has(value)) {
      termId = transformer.termToId.get(value);
    }
    if(termId !== undefined) {
      return new VocabTermEncoder({termId});
    }
    // FIXME: remove this and let it fall through
    return UriEncoder.createEncoder({value, transformer});
  }
}
