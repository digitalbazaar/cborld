/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  getNormalizedTermType,
  intFromBytes,
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
      const {typeTableEncodedAsBytes} = transformer;
      const tableEncodingUsesBytes = typeTableEncodedAsBytes.has(termType);
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
        /* Note: If the value isn't in the subtable, this is considered an
        error in non-legacy mode and, for non-legacy mode, an error except for
        CBOR-LD IDs that also match a term in a context (which may or may not
        actually match the expected URL). For legacy mode, this means that if a
        URL table is appended to after initial registration, then a consumer
        without the table update will misinterpret the new entry as some term
        from a context. */
        const {legacy} = transformer;
        if(decoded === undefined &&
          !(legacy && termType === 'url' &&
            transformer.contextProcessor.idToTerm.has(intValue))) {
          // FIXME: change error name?
          throw new CborldError(
            'ERR_UNKNOWN_COMPRESSED_VALUE',
            `Compressed value "${intValue}" not found`);
        }
      } else if(isBytes && termType !== 'none') {
        /* Note: For the unusual case that a type subtable has been defined
        for a custom type, but the encoded value is in bytes, it means that the
        user data included a native JSON integer. This integer then had to be
        expressed in CBOR as bytes during encoding, to ensure no conflicts with
        any subtable values which are expressed as CBOR integers. Despite being
        an unusual case, it is supported here by decoding the signed integer
        from bytes (two's complement). */
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
