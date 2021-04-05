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
    if(typeof context === 'string') {
      return this._encodeString(context);
    }

    if(Array.isArray(context)) {
      return this._encodeArray(context);
    }

    // FIXME: change to CBOR-LD error or rule out this happening here due
    // to other exceptions elsewhere
    throw new Error('not implemented');
  }

  _encodeString(context) {
    const id = URL_TO_ID.get(context) || this.appContextMap.get(context);
    if(id === undefined) {
      return new Token(Type.string, context);
    }
    return new Token(Type.uint, id);
  }

  _encodeArray(context) {
    const entries = [];
    for(const ctx of context) {
      if(typeof ctx === 'string') {
        entries.push(this._encodeString(ctx));
        continue;
      }
      // FIXME: change to CBOR-LD error or rule out this happening here due
      // to other exceptions elsewhere
      throw new Error('not implemented');
      // context must be an object (no arrays of arrays allowed in JSON-LD)
      //array.push(this._encodeObject(ctx));
    }
    return [new Token(Type.array, entries.length), entries];
  }
}
