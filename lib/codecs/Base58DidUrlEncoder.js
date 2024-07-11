/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {decode as decodeBase58} from 'base58-universal';

const SCHEME_TO_ID = new Map([
  ['did:v1:nym:', 1024],
  ['did:key:', 1025]
]);

export class Base58DidUrlEncoder extends CborldEncoder {
  constructor({value, scheme, compressionMap} = {}) {
    super();
    this.value = value;
    this.scheme = scheme;
    this.compressionMap = compressionMap
  }

  encode() {
    const {value, scheme, compressionMap} = this;
    const suffix = value.slice(scheme.length);
    const [authority, fragment] = suffix.split('#');
    const entries = [
      new Token(Type.uint, compressionMap.get(scheme)),
      _multibase58ToToken(authority)
    ];
    if(fragment !== undefined) {
      entries.push(_multibase58ToToken(fragment));
    }
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value, transformer} = {}) {
    const keys = [...SCHEME_TO_ID.keys()];
    for(const key of keys) {
      if(value.startsWith(key)) {
        return new Base58DidUrlEncoder({value, scheme: key, compressionMap: transformer.urlSchemeTable});
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
  // cannot compress
  return new Token(Type.string, str);
}
