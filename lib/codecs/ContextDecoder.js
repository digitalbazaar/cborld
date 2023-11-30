/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {ID_TO_STRING} from './registeredTermCodecs.js';

export class ContextDecoder extends CborldDecoder {
  constructor({reverseAppContextMap} = {}) {
    super();
    this.reverseAppContextMap = reverseAppContextMap;
  }

  decode({value} = {}) {
    // handle uncompressed context
    if(typeof value !== 'number') {
      return _mapToObject(value);
    }

    // handle compressed context
    const url = this.reverseAppContextMap.get(value) || ID_TO_STRING.get(value);
    if(url === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_COMPRESSED_CONTEXT',
        `Undefined compressed context "${value}".`);
    }
    return url;
  }

  static createDecoder({transformer} = {}) {
    const {reverseAppContextMap} = transformer;
    return new ContextDecoder({reverseAppContextMap});
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
