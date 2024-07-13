/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {getNormalizedTermType, intFromBytes} from './helpers.js';
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {MultibaseDecoder} from './MultibaseDecoder.js';
import {TypedLiteralDecoder} from './TypedLiteralDecoder.js';
import {UntypedLiteralDecoder} from './UntypedLiteralDecoder.js';
import {UriDecoder} from './UriDecoder.js';
import {VocabTermDecoder} from './VocabTermDecoder.js';
import {XsdDateDecoder} from './XsdDateDecoder.js';
import {XsdDateTimeDecoder} from './XsdDateTimeDecoder.js';

// constants based on "default" processing mode
// FIXME: rename this to avoid confusion over whether it is a directive
// or declarative
const TYPES_COMPRESSING_TO_INT = new Set([
  // FIXME: `@vocab` and url's don't compress to ints...
  //'url',
  // FIXME: multibase doesn't go to an int...
  //'https://w3id.org/security#multibase',
  'http://www.w3.org/2001/XMLSchema#date',
  'http://www.w3.org/2001/XMLSchema#dateTime'
]);
export const PROCESSING_MODE_TYPE_DECODERS = new Map([
  ['url', UriDecoder],
  ['https://w3id.org/security#multibase', MultibaseDecoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateDecoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeDecoder]
]);

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

    if(value instanceof Uint8Array) {
      if(subTable !== undefined) {
        // FIXME: validate that bytes are allowed for `termType` with
        // `TYPES_COMPRESSING_TO_INT` or improved variant of that map

        const intValue = intFromBytes({bytes: value});
        const uncompressedValue = subTable.get(intValue);
        if(uncompressedValue === undefined) {
          throw new CborldError(
            'ERR_UNKNOWN_TYPED_LITERAL_VALUE',
            `Typed literal compression "${uncompressedValue}" not found`);
        }
        return new TypedLiteralDecoder({id: uncompressedValue});
      }
    }
    const id = subTable?.get(value);
    if(id !== undefined) {
      return new TypedLiteralDecoder({id});
    }

    // FIXME: move `value !== 'object'` check to transformer?
    if(termType === 'none' &&
      (typeof value !== 'object' || value instanceof Uint8Array)) {
      return UntypedLiteralDecoder.createDecoder({value, transformer});
    }

    // lastly, try to get a processing-mode-specific type decoder
    return PROCESSING_MODE_TYPE_DECODERS.get(termType)?.createDecoder(
      {value, transformer, termInfo});
  }
}
