/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';

export class ContextDecoder extends CborldDecoder {
  constructor({reverseContextTable} = {}) {
    super();
    this.reverseContextTable = reverseContextTable;
  }

  decode({value} = {}) {
    // handle uncompressed context
    if(typeof value !== 'number') {
      return _mapToObject(value);
    }

    // handle compressed context
    const url = this.reverseContextTable.get(value);
    if(url === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_CONTEXT',
        `Undefined compressed context "${value}".`);
    }
    return url;
  }

  static createDecoder({reverseTypeTable} = {}) {
    const reverseContextTable = reverseTypeTable.get('context');
    return new ContextDecoder({reverseContextTable});
  }
}

function _mapToObject(map) {
  if(Array.isArray(map)) {
    return map.map(_mapToObject);
  }
  if(!(map instanceof Map)) {
    return map;
  }

  const obj = {};
  for(const [key, value] of map) {
    obj[key] = _mapToObject(value);
  }
  return obj;
}
