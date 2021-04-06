/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Token, Type} from 'cborg';

export class VocabTermEncoder extends CborldEncoder {
  constructor({value, termIdMap} = {}) {
    super();
    this.value = value;
    this.termIdMap = termIdMap;
  }

  encode() {
    // FIXME: remove logging
    console.log('encoding vocab term', this.value);
    const {value, termIdMap} = this;
    return new Token(Type.uint, termIdMap.get(value));
  }

  static match({value, termIdMap} = {}) {
    if(termIdMap.has(value)) {
      return new VocabTermEncoder({value, termIdMap});
    }
  }
}
