/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';

export class XsdDateDecoder extends CborldDecoder {
  decode({value} = {}) {
    const dateString = new Date(value[0] * 1000).toISOString();
    return dateString.substring(0, dateString.indexOf('T'));
  }

  static createDecoder({value} = {}) {
    if(!(Array.isArray(value) && value.length === 1 &&
      typeof value[0] === 'number')) {
      return false;
    }
    return new XsdDateDecoder();
  }
}
