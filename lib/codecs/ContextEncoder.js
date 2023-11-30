/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {STRING_TO_ID} from './registeredTermCodecs.js';

export class ContextEncoder extends CborldEncoder {
  constructor({context, appContextMap} = {}) {
    super();
    this.context = context;
    this.appContextMap = appContextMap;
  }

  encode() {
    const {context} = this;
    const id = this.appContextMap.get(context) || STRING_TO_ID.get(context);
    if(id === undefined) {
      return new Token(Type.string, context);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return false;
    }
    const {appContextMap} = transformer;
    return new ContextEncoder({context: value, appContextMap});
  }
}
