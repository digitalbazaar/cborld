/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {parse} from 'uuid';
import {URL_SCHEME_TABLE} from '../tables.js';

export class UuidUrnEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    const {value} = this;
    const rest = value.slice('urn:uuid:'.length);
    const entries = [new Token(
      Type.uint,
      URL_SCHEME_TABLE.get('urn:uuid:'))];
    if(rest.toLowerCase() === rest) {
      const uuidBytes = parse(rest);
      entries.push(new Token(Type.bytes, uuidBytes));
    } else {
      // cannot compress UUID value
      entries.push(new Token(Type.string, rest));
    }
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    if(!value.startsWith('urn:uuid:')) {
      return;
    }
    return new UuidUrnEncoder({value});
  }
}
