/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {URL_TO_ID} from './registeredContexts.js';
import {Token, Type} from 'cborg';

export class ContextEncoder extends CborldEncoder {
  constructor({context, appContextMap} = {}) {
    super();
    this.context = context;
    this.appContextMap = appContextMap;
  }

  encode() {
    // FIXME: remove logging
    console.log('encoding context');
    const {context} = this;
    const id = URL_TO_ID.get(context) || this.appContextMap.get(context);
    if(id === undefined) {
      return new Token(Type.string, context);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, appContextMap} = {}) {
    if(typeof value !== 'string') {
      return false;
    }
    return new ContextEncoder({context: value, appContextMap});
  }
}
