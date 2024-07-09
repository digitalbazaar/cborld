/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import * as varint from 'varint';
import {CborldError} from './CborldError.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';
import pkg from 'varint';
const {decode: varintDecode} = pkg;

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {Function} options.documentLoader -The document loader to use when
 *   resolving JSON-LD Context URLs.
 * @param {Map} [options.compressionMap] - A map from strings to the associated
 * CBOR-LD values.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader,
  keywordsTable = new Map(),
  stringTable = new Map(),
  urlTable = new Map(),
  typedLiteralTable = new Map(),
  diagnose,
  appContextMap,
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
    index++
    if(tagValue === 0) {
      return cborg.decode(suffix, {useMaps: false});
    } else if(tagValue < 128) {
      index++;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
    } else {
      // todo: this assumes tag length <= 31 bytes. FIXME?
      index++;
      const varintArrayLength = cborldBytes[index] % 32;
      const varintArrayData = cborldBytes.slice(index + 1, index + varintArrayLength + 1);
      const varintData = new Uint8Array([tagValue, ...varintArrayData]);
      const varintValue = varintDecode(varintData);
      index = index + varintArrayLength + 1;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
    }
      // decompress CBOR-LD
    const decompressor = new Decompressor({
      documentLoader,
      keywordsTable,
      urlTable,
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
  }
  // legacy support
  else if(cborldBytes[index] == 0x05) {
    index++
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

    // decompress CBOR-LD
    const decompressor = new Decompressor({documentLoader, appContextMap});
    const result = await decompressor.decompress(
      {compressedBytes: suffix, diagnose});

    if(diagnose) {
      diagnose('Diagnostic JSON-LD result:');
      diagnose(inspect(result, {depth: null, colors: true}));
    }

    return result;
  }
  else{
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
