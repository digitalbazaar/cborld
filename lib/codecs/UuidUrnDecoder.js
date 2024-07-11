/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {stringify} from 'uuid';

export class UuidUrnDecoder extends CborldDecoder {
  constructor({decompressionMap} = {}) {
    super();
    this.decompressionMap = decompressionMap;
  }
  decode({value} = {}) {
    const prefix = this.decompressionMap.get(value[0]);
    const uuid = typeof value[1] === 'string' ?
      value[1] : stringify(value[1]);
    return prefix + `${uuid}`;
  }

  static createDecoder({value, transformer} = {}) {
    if(value.length === 2 &&
      (typeof value[1] === 'string' || value[1] instanceof Uint8Array)) {
      return new UuidUrnDecoder({
        decompressionMap: transformer.reverseUrlSchemeTable
      });
    }
  }
}
