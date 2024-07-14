/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  getNormalizedTermType,
  intFromBytes,
  TYPE_TABLE_ENCODED_AS_BYTES
} from './helpers.js';
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

export class TypeTableDecoder extends CborldDecoder {
  constructor({id} = {}) {
    super();
    this.id = id;
  }

  decode() {
    return this.id;
  }

  static createDecoder({value, transformer, termType, termInfo} = {}) {
    // FIXME: consider making `_getTermType` call/handle this
    termType = getNormalizedTermType({termInfo, termType});
    const subTable = transformer.reverseTypedLiteralTable.get(termType);
    console.log('decoder, subTable?', !!subTable);
    console.log('value to decode', value);

    // handle type table decoding
    if(subTable) {
      // FIXME: this code is repeated in-part, in TypedLiteralDecoder, move over
      // there
      let intValue;
      let useTable = false;
      const tableEncodingUsesBytes = TYPE_TABLE_ENCODED_AS_BYTES.has(termType);
      if(value instanceof Uint8Array && tableEncodingUsesBytes) {
        console.log('decoding bytes', value);
        useTable = true;
        intValue = intFromBytes({bytes: value});
        console.log('resulting number', intValue);
      } else if(typeof value === 'number' && !tableEncodingUsesBytes) {
        console.log('value is a number', value);
        useTable = true;
        intValue = value;
      }
      console.log('useTable', useTable);
      if(useTable) {
        const id = subTable.get(intValue);
        if(id !== undefined) {
          console.log('using TypeTableDecoder instance');
          return new TypeTableDecoder({id});
        }
        // FIXME: explore this further
        // URLs in the value position (URLs in the property position only
        // ever use the `termToId` table) are specifically allowed to fall
        // through and use the `termToId` table, meaning it is possible to
        // have conflicts
        console.log('tableEncodingUsesBytes', tableEncodingUsesBytes);
        console.log('termType', termType);
        if(!(termType === 'url' && transformer.idToTerm.has(value))) {
          // FIXME: change error name
          throw new CborldError(
            'ERR_UNKNOWN_TYPED_LITERAL_VALUE',
            `Typed literal compression "${id}" not found`);
        }
      }
    }

    // try to get a processing-mode-specific type decoder
    const decoder = PROCESSING_MODE_TYPE_DECODERS.get(termType)?.createDecoder(
      {value, transformer, termInfo});
    if(decoder) {
      console.log('using type-specific decoder', value, termType);
      return decoder;
    }
  }
}