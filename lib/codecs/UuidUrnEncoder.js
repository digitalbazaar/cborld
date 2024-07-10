/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {parse} from 'uuid';

export class UuidUrnEncoder extends CborldEncoder {
  constructor({value, compressionMap} = {}) {
    super();
    this.value = value;
    this.compressionMap = compressionMap;
  }

  encode() {
    const {value} = this;
    const rest = value.slice('urn:uuid:'.length);
    const entries = [new Token(Type.uint, this.compressionMap.get('urn:uuid:'))];
    if(rest.toLowerCase() === rest) {
      const uuidBytes = parse(rest);
      entries.push(new Token(Type.bytes, uuidBytes));
    } else {
      // cannot compress
      entries.push(new Token(Type.string, rest));
    }
    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value, transformer} = {}) {
    if(value.startsWith('urn:uuid:')) {
      if(transformer){
        return new UuidUrnEncoder({value, compressionMap: transformer.urlTable});
      }
      else {
        return new UuidUrnEncoder({value});
      }

    }
  }
}
