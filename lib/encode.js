/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {inspect} from './util.js';
import {Compressor} from './Compressor.js';

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {boolean} [options.compressionMode=1] - `1` to use compression mode
 *   version 1, `0` to use no compression.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values (must be values greater than 32767 (0x7FFF)).
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 * provided, is called with diagnostic information.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, appContextMap = new Map(),
  compressionMode = 1, diagnose
} = {}) {
  if(!(compressionMode === 0 || compressionMode === 1)) {
    throw new TypeError(
      '"compressionMode" must be "0" (no compression) or "1" ' +
      'for compression mode version 1.');
  }

  // 0xd9 == 11011001
  // 110 = CBOR major type 6
  // 11001 = 25, 16-bit tag size (65536 possible values)
  // 0x05 = always the first 8-bits of a CBOR-LD tag
  // compressionMode = last 8-bits of a CBOR-LD tag indicating compression type
  const prefix = new Uint8Array([0xd9, 0x05, compressionMode]);
  let suffix;

  if(compressionMode === 0) {
    // handle uncompressed CBOR-LD
    suffix = cborg.encode(jsonldDocument);
  } else {
    // compress CBOR-LD
    const compressor = new Compressor({documentLoader, appContextMap});
    suffix = await compressor.compress({jsonldDocument, diagnose});
  }

  // concatenate prefix and suffix
  const length = prefix.length + suffix.length;
  const bytes = new Uint8Array(length);
  bytes.set(prefix);
  bytes.set(suffix, prefix.length);

  if(diagnose) {
    diagnose('Diagnostic CBOR-LD result:');
    diagnose(inspect(bytes, {depth: null, colors: true}));
  }

  return bytes;
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
