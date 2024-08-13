/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  bytesFromInt,
  bytesFromUint,
  getTableType
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

  static createEncoder({value, converter, termInfo, termType} = {}) {
    const tableType = getTableType({termInfo, termType});
    if(tableType === 'url' && typeof value !== 'string') {
      throw new CborldError(
        'ERR_UNSUPPORTED_JSON_TYPE',
        `Invalid value type "${typeof value}" for URL; expected "string".`);
    }

    // if a subtable exists for `tableType`...
    const subTable = converter.typeTable.get(tableType);
    if(subTable) {
      let intValue = subTable.get(value);
      let convertToBytes;
      let includeSign;
      if(intValue !== undefined) {
        // determine if ID from table must be expressed as bytes for `tableType`
        const {typeTableEncodedAsBytes} = converter;
        convertToBytes = typeTableEncodedAsBytes.has(tableType);
        includeSign = false;
      } else if(tableType !== 'none' && Number.isInteger(value)) {
        /* Note: Here is an unusual case that a type subtable has been defined
        for a custom type, but the user data still includes a native JSON
        integer. This integer has to be encoded to CBOR as bytes to ensure no
        conflicts with any subtable values which are encoded as CBOR integers.
        Despite being an unusual case, it is supported here by encoding the
        integer as a signed integer expressed in bytes (two's complement). */
        intValue = value;
        convertToBytes = includeSign = true;
      }
      if(intValue !== undefined) {
        return new ValueEncoder({intValue, convertToBytes, includeSign});
      }
    }

    // lastly, try to get a processing-mode-specific type encoder
    const encoder = PROCESSING_MODE_TYPE_ENCODERS.get(tableType)?.createEncoder(
      {value, converter, termInfo});
    if(encoder) {
      return encoder;
    }

    // return passthrough value
    return value;
  }
}
