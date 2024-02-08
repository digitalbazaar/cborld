/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

const ID = 1026;

export class AppUrlEncoder extends CborldEncoder {
  constructor({value, appContextMap} = {}) {
    super();
    this.value = value;
    this.appContextMap = appContextMap;
  }

  encode() {
    const {value} = this;
    // FIXME: handle errors (shouldn't happen if called correctly)
    const id = this.appContextMap.get(value);
    const entries = [
      new Token(Type.uint, ID),
      new Token(Type.uint, id)
    ];
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value, transformer} = {}) {
    // FIXME: needed?
    if(typeof value !== 'string') {
      return false;
    }
    const {appContextMap} = transformer;
    return new AppUrlEncoder({value, appContextMap});
  }
}
