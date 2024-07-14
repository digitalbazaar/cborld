/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  bytesFromInt,
  getNormalizedTermType,
  TYPE_TABLE_ENCODED_AS_BYTES
} from '../helpers.js';
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {CborldError} from '../CborldError.js';
import {MultibaseEncoder} from './MultibaseEncoder.js';
import {UrlEncoder} from './UrlEncoder.js';
import {XsdDateEncoder} from './XsdDateEncoder.js';
import {XsdDateTimeEncoder} from './XsdDateTimeEncoder.js';

// constants based on "default" processing mode
const PROCESSING_MODE_TYPE_ENCODERS = new Map([
  ['url', UrlEncoder],
  ['https://w3id.org/security#multibase', MultibaseEncoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateEncoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeEncoder]
]);

export class ValueEncoder extends CborldEncoder {
  constructor({id, termType} = {}) {
    super();
    this.id = id;
    this.termType = termType;
  }

  encode() {
    const {id, termType} = this;
    // FIXME: handle termType === 'none'
    if(TYPE_TABLE_ENCODED_AS_BYTES.has(termType)) {
      const bytes = bytesFromInt({intValue: id});
      return new Token(Type.bytes, bytes);
    }
    return new Token(Type.uint, id);
  }

  static createEncoder({value, transformer, termInfo, termType} = {}) {
    const {typeTable} = transformer;
    // FIXME: consider making `_getTermType` call/handle this
    termType = getNormalizedTermType({termInfo, termType});
    if(termType === 'url' && typeof value !== 'string') {
      throw new CborldError(
        'ERR_UNSUPPORTED_JSON_TYPE',
        `Invalid value type "${typeof value}" for URL; expected "string".`);
    }

    // FIXME: check `none` case both with and without `none` subtable existence

    // FIXME: if a subtable exists and `value` is an int, it needs to be
    // converted to bytes
    const subTable = typeTable.get(termType);
    const id = subTable?.get(value);
    if(id !== undefined) {
      return new ValueEncoder({id, termType});
    }

    // lastly, try to get a processing-mode-specific type encoder
    const encoder = PROCESSING_MODE_TYPE_ENCODERS.get(termType)?.createEncoder(
      {value, transformer, termInfo});
    if(encoder) {
      return encoder;
    }
  }
}
