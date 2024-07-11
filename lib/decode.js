/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
// import * as varint from 'varint';
import {
  KEYWORDS_TABLE,
  STRING_TABLE,
  TYPED_LITERAL_TABLE,
  URL_SCHEME_TABLE
} from './tables.js';
//import pkg from 'varint';
import {CborldError} from './CborldError.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';

// const {decode: varintDecode} = pkg;

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {Function} options.documentLoader -The document loader to use when
 *   resolving JSON-LD Context URLs.
 * @param {diagnosticFunction} options.diagnose - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} options.keywordsTable -A map of JSON-LD keywords
 *  and their associated CBOR-LD integer values.
 * @param {Map} options.stringTable - A map of string values and
 *  their associated CBOR-LD integer values.
 * @param {Map} options.urlSchemeTable - A map of URL schemes to
 *  their associated CBOR-LD integer values.
 * @param {Map} options.typedLiteralTable - A map of JSON-LD types
 *  to maps that map values of that type to their CBOR-LD integer values.
 * @param {Map} options.appContextMap - A map of context string values
 *  to their associated CBOR-LD integer values. For use with legacy cborldBytes.
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader,
  keywordsTable = new Map(),
  stringTable = new Map(),
  urlSchemeTable = new Map(),
  typedLiteralTable = new Map(),
  diagnose,
  appContextMap = new Map(),
}) {
  if(!(cborldBytes instanceof Uint8Array)) {
    throw new TypeError('"cborldBytes" must be a Uint8Array.');
  }

  // 0xd9 == 11011001
  // 110 = CBOR major type 6
  // 11001 = 25, 16-bit tag size (65536 possible values)
  let index = 0;
  if(cborldBytes[index++] !== 0xd9) {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must start with a CBOR major type "Tag" header of `0xd9`.');
  }

  // ensure `cborldBytes` represent CBOR-LD

  if(cborldBytes[index] == 0x06) {
    index++;
    let suffix;
    const tagValue = cborldBytes[index];
    if(tagValue < 128) {
      index++;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
      if(tagValue == 0) {
        return cborg.decode(suffix, {useMaps: false});
      }
    } else {
      // todo: this assumes tag length <= 31 bytes. FIXME?
      index++;
      const varintArrayLength = cborldBytes[index] % 32;
      /* TODO: do something with the varint value?
      const varintArrayData = cborldBytes.slice(
        index + 1, index + varintArrayLength + 1
      );
      const varintData = new Uint8Array([tagValue, ...varintArrayData]);
      */
      index = index + varintArrayLength + 1;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
    }
    // decompress CBOR-LD
    const decompressor = new Decompressor({
      documentLoader,
      keywordsTable,
      urlSchemeTable,
      stringTable,
      typedLiteralTable
    });
    const result = await decompressor.decompress(
      {compressedBytes: suffix, diagnose});

    if(diagnose) {
      diagnose('Diagnostic JSON-LD result:');
      diagnose(inspect(result, {depth: null, colors: true}));
    }

    return result;
  } else if(cborldBytes[index] == 0x05) {
    // legacy support
    index++;
    const compressionMode = cborldBytes[index];
    if(compressionMode === undefined) {
      throw new CborldError(
        'ERR_NOT_CBORLD', 'Truncated CBOR-LD 16-bit tag.');
    }

    if(!(compressionMode === 0 || compressionMode === 1)) {
      throw new CborldError(
        'ERR_NOT_CBORLD',
        `Unsupported CBOR-LD compression mode "${compressionMode}".`);
    }

    index++;
    const {buffer, byteOffset, length} = cborldBytes;
    const suffix = new Uint8Array(buffer, byteOffset + index, length - index);

    // handle uncompressed CBOR-LD
    if(compressionMode === 0) {
      return cborg.decode(suffix, {useMaps: false});
    }

    const stringTableWithAppContext = new Map(STRING_TABLE);

    for(const [key, value] of appContextMap) {
      stringTableWithAppContext.set(key, value);
    }

    // decompress CBOR-LD
    const decompressor = new Decompressor({
      documentLoader,
      keywordsTable: new Map(KEYWORDS_TABLE),
      stringTable: stringTableWithAppContext,
      urlSchemeTable: new Map(URL_SCHEME_TABLE),
      typedLiteralTable: new Map(TYPED_LITERAL_TABLE)
    });
    const result = await decompressor.decompress(
      {compressedBytes: suffix, diagnose});

    if(diagnose) {
      diagnose('Diagnostic JSON-LD result:');
      diagnose(inspect(result, {depth: null, colors: true}));
    }

    return result;
  } else {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must either have a second byte of 0x06 or 0x05 (legacy).');
  }

}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
