/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateDecoder extends CborldDecoder {
  decode({value} = {}) {
    const dateString = new Date(value * 1000).toISOString();
    return dateString.slice(0, dateString.indexOf('T'));
  }

  static createDecoder({value} = {}) {
    if(typeof value === 'number') {
      return new XsdDateDecoder();
    }
  }
}
