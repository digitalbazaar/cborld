/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

export class ContextEncoder extends CborldEncoder {
  constructor({context, contextTable} = {}) {
    super();
    this.context = context;
    this.contextTable = contextTable;
  }

  encode() {
    const {context, contextTable} = this;
    const id = contextTable.get(context);
    if(id === undefined) {
      return new Token(Type.string, context);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return;
    }
    const contextTable = transformer.typedLiteralTable.get('context');
    return new ContextEncoder({context: value, contextTable});
  }
}
