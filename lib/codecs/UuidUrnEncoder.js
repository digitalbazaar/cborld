/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Token, Type} from 'cborg';
import {parse} from 'uuid';

export class UuidUrnEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;
    const rest = value.substr('urn:uuid:'.length);
    const entries = [new Token(Type.uint, 3)];
    if(rest.toLowerCase() === rest) {
      const uuidBytes = parse(rest);
      entries.push(new Token(Type.bytes, uuidBytes));
    } else {
      // cannot compress
      entries.push(new Token(Type.string, rest));
    }
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    if(value.startsWith('urn:uuid:')) {
      return new UuidUrnEncoder({value});
    }
  }
}
