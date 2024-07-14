/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  bytesFromInt,
  bytesFromUint,
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
  constructor({intValue, convertToBytes, includeSign} = {}) {
    super();
    this.intValue = intValue;
    this.convertToBytes = convertToBytes;
    this.includeSign = includeSign;
  }

  encode() {
    const {intValue, convertToBytes, includeSign} = this;
    if(convertToBytes) {
      const toBytes = includeSign ? bytesFromInt : bytesFromUint;
      const bytes = toBytes({intValue});
      return new Token(Type.bytes, bytes);
    }
    return new Token(Type.uint, intValue);
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

    // if a subtable exists for `termType`...
    const subTable = typeTable.get(termType);
    if(subTable) {
      let intValue = subTable.get(value);
      let convertToBytes;
      let includeSign;
      if(intValue !== undefined) {
        // determine if ID from table must be expressed as bytes for `termType`
        convertToBytes = TYPE_TABLE_ENCODED_AS_BYTES.has(termType);
        includeSign = false;
      } else if(termType !== 'none' && Number.isInteger(value)) {
        // no ID from table, however, integers for JSON-LD-typed fields must be
        // expressed using bytes to avoid conflicts with subtables
        intValue = value;
        convertToBytes = includeSign = true;
      }
      if(intValue !== undefined) {
        return new ValueEncoder({intValue, convertToBytes, includeSign});
      }
    }

    // lastly, try to get a processing-mode-specific type encoder
    const encoder = PROCESSING_MODE_TYPE_ENCODERS.get(termType)?.createEncoder(
      {value, transformer, termInfo});
    if(encoder) {
      return encoder;
    }
  }
}
