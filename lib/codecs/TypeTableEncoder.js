/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {bytesFromInt, getNormalizedTermType} from './helpers.js';
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';

import {MultibaseEncoder} from './MultibaseEncoder.js';
import {UntypedLiteralEncoder} from './UntypedLiteralEncoder.js';
import {UriEncoder} from './UriEncoder.js';
import {VocabTermEncoder} from './VocabTermEncoder.js';
import {XsdDateEncoder} from './XsdDateEncoder.js';
import {XsdDateTimeEncoder} from './XsdDateTimeEncoder.js';

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
const PROCESSING_MODE_TYPE_ENCODERS = new Map([
  ['url', UriEncoder],
  ['https://w3id.org/security#multibase', MultibaseEncoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateEncoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeEncoder]
]);

export class TypeTableEncoder extends CborldEncoder {
  constructor({id, termType} = {}) {
    super();
    this.id = id;
    this.termType = termType;
  }

  encode() {
    const {id, termType} = this;

    // FIXME: remove `true`
    if(true || id !== undefined) {
      if(TYPES_COMPRESSING_TO_INT.has(termType)) {
        const bytes = bytesFromInt({intValue: id});
        return new Token(Type.bytes, bytes);
      }
      return new Token(Type.uint, id);
    }

    // FIXME: handle termType === 'url' and termType === 'none'
  }

  static createEncoder({value, transformer, termInfo, termType} = {}) {
    // FIXME: rename table
    const {typedLiteralTable: typeTable} = transformer;
    // FIXME: consider making `_getTermType` call/handle this
    termType = getNormalizedTermType({termInfo, termType});
    const id = typeTable.get(termType)?.get(value);
    if(id !== undefined) {
      return new TypeTableEncoder({
        id,
        termType
      });
    }

    // FIXME: `VocabTermEncoder` and `UntypedLiteralEncoder` can be combined
    // into the encoder above
    if(termType === 'url') {
      return VocabTermEncoder.createEncoder({value, transformer, termInfo});
    }

    if(termType === 'none') {
      return UntypedLiteralEncoder.createEncoder(
        {value, transformer, termInfo});
    }

    // lastly, try to get a processing-mode-specific type encoder
    return PROCESSING_MODE_TYPE_ENCODERS.get(termType)?.createEncoder(
      {value, transformer, termInfo});
  }
}
