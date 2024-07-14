/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  getNormalizedTermType,
  intFromBytes,
  TYPE_TABLE_ENCODED_AS_BYTES,
  uintFromBytes
} from '../helpers.js';
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {MultibaseDecoder} from './MultibaseDecoder.js';
import {UrlDecoder} from './UrlDecoder.js';
import {XsdDateDecoder} from './XsdDateDecoder.js';
import {XsdDateTimeDecoder} from './XsdDateTimeDecoder.js';

// constants based on "default" processing mode:
const PROCESSING_MODE_TYPE_DECODERS = new Map([
  ['url', UrlDecoder],
  ['https://w3id.org/security#multibase', MultibaseDecoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateDecoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeDecoder]
]);

// FIXME: document this:
// 1. url, none, and dates will express table values as bytes, always
// 2. for other types, if there is a table entry, table values will
//    always be expressed as ints, and any existing ints, will be converted
//    to two's complement bytes

export class ValueDecoder extends CborldDecoder {
  constructor({decoded} = {}) {
    super();
    this.decoded = decoded;
  }

  decode() {
    return this.decoded;
  }

  static createDecoder({value, transformer, termType, termInfo} = {}) {
    // FIXME: consider making `_getTermType` call/handle this
    termType = getNormalizedTermType({termInfo, termType});
    const subTable = transformer.reverseTypeTable.get(termType);

    // handle decoding value for term with a subtable
    if(subTable) {
      let intValue;
      let useTable = false;
      const isBytes = value instanceof Uint8Array;
      const tableEncodingUsesBytes = TYPE_TABLE_ENCODED_AS_BYTES.has(termType);
      if(isBytes && tableEncodingUsesBytes) {
        useTable = true;
        intValue = uintFromBytes({bytes: value});
      } else if(Number.isInteger(value) && !tableEncodingUsesBytes) {
        useTable = true;
        intValue = value;
      }

      // either the subtable must be used and an error will be thrown if the
      // unsigned integer expression of the value is not in the table, or
      // the value might need to be decoded to a signed integer from bytes
      let decoded;
      if(useTable) {
        decoded = subTable.get(intValue);
        // FIXME: explore this further
        /* Note: If the value isn't in the subtable, this is considered an
        error except for URLs that are also expressed as a term in a context.
        This means that if a URL table is appended to after initial
        registration, then a consumer without the table update will
        misinterpret the new entry as some term from a context. */
        if(decoded === undefined &&
          !(termType === 'url' && transformer.idToTerm.has(intValue))) {
          // FIXME: change error name?
          throw new CborldError(
            'ERR_UNKNOWN_COMPRESSED_VALUE',
            `Compressed value "${intValue}" not found`);
        }
      } else if(isBytes && termType !== 'none') {
        // integers for JSON-LD-typed fields must be expressed using bytes to
        // avoid conflicts with subtables
        decoded = intFromBytes({bytes: value});
      }

      if(decoded !== undefined) {
        return new ValueDecoder({decoded});
      }
    }

    // try to get a processing-mode-specific type decoder
    const decoder = PROCESSING_MODE_TYPE_DECODERS.get(termType)?.createDecoder(
      {value, transformer, termInfo});
    if(decoder) {
      return decoder;
    }
  }
}
