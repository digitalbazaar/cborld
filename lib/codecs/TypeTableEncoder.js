/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {bytesFromInt, getNormalizedTermType} from './helpers.js';
import {Token, Type} from 'cborg';
import {CborldEncoder} from './CborldEncoder.js';
import {CborldError} from '../CborldError.js';
import {MultibaseEncoder} from './MultibaseEncoder.js';
import {UntypedLiteralEncoder} from './UntypedLiteralEncoder.js';
import {UriEncoder} from './UriEncoder.js';
import {VocabTermEncoder} from './VocabTermEncoder.js';
import {XsdDateEncoder} from './XsdDateEncoder.js';
import {XsdDateTimeEncoder} from './XsdDateTimeEncoder.js';

// constants based on "default" processing mode
const TYPE_TABLE_ENCODED_AS_BYTES = new Set([
  // FIXME: multibase doesn't go to an int...
  //'https://w3id.org/security#multibase',
  'none',
  'http://www.w3.org/2001/XMLSchema#date',
  'http://www.w3.org/2001/XMLSchema#dateTime'
]);
const PROCESSING_MODE_TYPE_ENCODERS = new Map([
  ['url', VocabTermEncoder],
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
      // FIXME: exception: do not encode `@context` table values as bytes
      if(TYPE_TABLE_ENCODED_AS_BYTES.has(termType)) {
        const bytes = bytesFromInt({intValue: id});
        return new Token(Type.bytes, bytes);
      }
      return new Token(Type.uint, id);
    }

    // FIXME: handle termType === 'url' and termType === 'none'
  }

  static createEncoder({value, transformer, termInfo, termType} = {}) {
    console.log('encoder incoming termType', termType, termInfo);
    // FIXME: rename table
    const {typedLiteralTable: typeTable} = transformer;
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
      console.log('encode using subtable for', value);
      return new TypeTableEncoder({id, termType});
    }

    console.log('encode not using subtable for', value, termType);

    // lastly, try to get a processing-mode-specific type encoder
    const encoder = PROCESSING_MODE_TYPE_ENCODERS.get(termType)?.createEncoder(
      {value, transformer, termInfo});
    if(encoder) {
      console.log('encode using type-encoder for', value, encoder);
      return encoder;
    }

    // FIXME: consider moving `UntypedLiteralEncoder` into type encoders
    // FIXME: rename from untyped to something else since it also handles
    // types w/o any matching subTable
    //return value;//UntypedLiteralEncoder.createEncoder({value, transformer});
  }
}
