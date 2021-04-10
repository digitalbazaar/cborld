/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {Function} options.documentLoader -The document loader to use when
 *   resolving JSON-LD Context URLs.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their associated CBOR-LD values. The values must be greater than
 *   32767 (0x7FFF)).
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader, appContextMap = new Map(), diagnose}) {
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
  if(cborldBytes[index++] !== 0x05) {
    throw new CborldError(
      'ERR_NOT_CBORLD', 'CBOR-LD 16-bit tag must start with `0x05`.');
  }

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
  const result = await decompressor.decompress({compressedBytes: suffix});

  if(diagnose) {
    diagnose('Diagnostic JSON-LD result:');
    diagnose(inspect(result, {depth: null, colors: true}));
  }

  return result;
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
