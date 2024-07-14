/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {decode as decodeBase58} from 'base58-universal';

const SCHEME_TO_ID = new Map([
  ['did:v1:nym:', 1024],
  ['did:key:', 1025]
]);

export class Base58DidUrlEncoder extends CborldEncoder {
  constructor({value, scheme, schemeCompressed} = {}) {
    super();
    this.value = value;
    this.scheme = scheme;
    this.schemeCompressed = schemeCompressed;
  }

  encode() {
    const {value, scheme, schemeCompressed} = this;
    const suffix = value.slice(scheme.length);
    const [authority, fragment] = suffix.split('#');
    const entries = [
      new Token(Type.uint, schemeCompressed),
      _multibase58ToToken(authority)
    ];
    if(fragment !== undefined) {
      entries.push(_multibase58ToToken(fragment));
    }
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    for(const [key, schemeCompressed] of SCHEME_TO_ID) {
      if(value.startsWith(key)) {
        return new Base58DidUrlEncoder({
          value,
          scheme: key,
          schemeCompressed
        });
      }
    }
  }
}

function _multibase58ToToken(str) {
  if(str.startsWith('z')) {
    const decoded = decodeBase58(str.slice(1));
    if(decoded) {
      return new Token(Type.bytes, decoded);
    }
  }
  // cannot compress suffix
  return new Token(Type.string, str);
}
