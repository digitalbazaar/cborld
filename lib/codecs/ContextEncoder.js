/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class ContextEncoder extends CborldEncoder {
  constructor({context, stringTable} = {}) {
    super();
    this.context = context;
    this.stringTable = stringTable;
  }

  encode() {
    const {context} = this;
    const id = this.stringTable.get(context);
    if(id === undefined) {
      return new Token(Type.string, context);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return;
    }
    // FIXME: use `url` table instead
    const {stringTable} = transformer;
    return new ContextEncoder({context: value, stringTable});
  }
}
