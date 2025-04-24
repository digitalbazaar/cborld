/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import * as varint from 'varint';
import {createLegacyTypeTable, createTypeTable} from './tables.js';
import {CborldEncoder} from './codecs/CborldEncoder.js';
import {CborldError} from './CborldError.js';
import {Compressor} from './Compressor.js';
import {Converter} from './Converter.js';
import {inspect} from './util.js';

// override cborg object encoder to use cborld encoders
const typeEncoders = {
  Object(obj) {
    if(obj instanceof CborldEncoder) {
      return obj.encode({obj});
    }
  }
};

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader - The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {string} [options.format='cbor-ld-1.0'] - The CBOR-LD output format
 *   to use; this will default to `cbor-ld-1.0` to use CBOR-LD 1.0 tag
 *   `0xcb1d` (51997); to create output with a pre-1.0 CBOR-LD tag, then
 *   'legacy-range' can be passed to use tags `0x0600-0x06ff` (1526-1791) and
 *   'legacy-singleton' can be passed to use tags `0x0500-0x0501`.
* @param {number|string} [options.registryEntryId] - The registry
 *   entry ID for the registry entry associated with the resulting CBOR-LD
 *   payload.
 * @param {Function} [options.typeTableLoader] - The `typeTable` loader to use
 *   to resolve `registryEntryId` to a `typeTable`. A `typeTable` is a Map of
 *   possible value types, including `context`, `url`, `none`, and any JSON-LD
 *   type, each of which maps to another Map of values of that type to their
 *   associated CBOR-LD integer values.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} [options.appContextMap] - Only for use with the
 *   'legacy-singleton' format.
 * @param {number} [options.compressionMode] - Only for use with the
 *   'legacy-singleton' format.
 * @param {*} options.typeTable - NOT permitted; use `typeTableLoader`.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument,
  documentLoader,
  format = 'cbor-ld-1.0',
  registryEntryId,
  typeTableLoader,
  diagnose,
  // for "legacy-singleton" format only
  appContextMap,
  compressionMode,
  // no longer permitted
  typeTable
} = {}) {
  // validate `format`
  if(!(format === 'cbor-ld-1.0' || format === 'legacy-range' ||
    format === 'legacy-singleton')) {
    throw new TypeError(
      `Invalid "format" "${format}"; "format" must be ` +
      '"cbor-ld-1.0" (tag 0xcb1d = 51997) or ' +
      '"legacy-range" (tags 0x0600-0x06ff = 1536-1791) or ' +
      '"legacy-singleton" (tags 0x0500-0x0501 = 1280-1281).');
  }
  // throw on `typeTable` param which is no longer permitted
  if(typeTable !== undefined) {
    throw new TypeError('"typeTable" is not allowed; use "typeTableLoader".');
  }

  // validate parameter combinations
  let compressPayload;
  if(format === 'legacy-singleton') {
    if(registryEntryId !== undefined) {
      throw new TypeError(
        '"registryEntryId" must not be used with format "legacy-singleton".');
    }
    if(typeTableLoader !== undefined) {
      throw new TypeError(
        '"typeTableLoader" must not be used with format "legacy-singleton".');
    }

    // default compression mode to `1`
    compressionMode = compressionMode ?? 1;
    if(!(compressionMode === 0 || compressionMode === 1)) {
      throw new TypeError(
        '"compressionMode" must be "0" (no compression) or "1" ' +
        'for compression mode version 1.');
    }
    compressPayload = compressionMode === 1;

    // generate legacy type table
    typeTable = createLegacyTypeTable({typeTable, appContextMap});
  } else {
    // validate that an acceptable value for `registryEntryId` was passed
    if(!(typeof registryEntryId === 'number' && registryEntryId >= 0)) {
      throw new TypeError('"registryEntryId" must be a non-negative integer.');
    }

    if(appContextMap !== undefined) {
      throw new TypeError(
        '"appContextMap" must only be used with format "legacy-singleton".');
    }
    if(compressionMode !== undefined) {
      throw new TypeError(
        '"compressionMode" must only be used with format "legacy-singleton".');
    }
    if(registryEntryId !== 0) {
      if(registryEntryId === 1) {
        // use default table (empty) for registry entry ID `1`
        typeTable = createTypeTable({typeTable});
      } else {
        if(typeof typeTableLoader !== 'function') {
          throw new TypeError('"typeTableLoader" must be a function.');
        }
        typeTable = await typeTableLoader({registryEntryId});
        if(!(typeTable instanceof Map)) {
          throw new CborldError(
            'ERR_NO_TYPETABLE',
            '"typeTable" not found for "registryEntryId" ' +
            `"${registryEntryId}".`);
        }
        // check to make sure unsupported types not present in `typeTable`
        if(typeTable.has('http://www.w3.org/2001/XMLSchema#integer') ||
          typeTable.has('http://www.w3.org/2001/XMLSchema#double') ||
          typeTable.has('http://www.w3.org/2001/XMLSchema#boolean')) {
          throw new CborldError(
            'ERR_UNSUPPORTED_LITERAL_TYPE',
            '"typeTable" must not contain XSD integers, doubles, or booleans.');
        }
        // normalize type table
        typeTable = createTypeTable({typeTable});
      }
    }
    // any registry entry ID other than zero uses compression by default
    compressPayload = registryEntryId !== 0;
  }

  // compute CBOR-LD suffix
  let suffix;
  if(!compressPayload) {
    // output uncompressed CBOR-LD
    suffix = cborg.encode(jsonldDocument);
  } else {
    const converter = new Converter({
      // compress JSON-LD => CBOR-LD
      strategy: new Compressor({typeTable}),
      documentLoader,
      legacy: format === 'legacy-singleton'
    });
    const output = await converter.convert({input: jsonldDocument});
    if(diagnose) {
      diagnose('Diagnostic CBOR-LD compression transform map(s):');
      diagnose(inspect(output, {depth: null, colors: true}));
    }
    suffix = cborg.encode(output, {typeEncoders});
  }

  // concatenate prefix and suffix
  const prefix = _getPrefix({format, compressionMode, registryEntryId});
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

function _getPrefix({format, compressionMode, registryEntryId}) {
  if(format === 'legacy-singleton') {
    return new Uint8Array([
      0xd9, // CBOR major type 6 + 2 byte tag size
      0x05, // legacy CBOR-LD tag
      compressionMode // compression flag
    ]);
  }

  if(format === 'legacy-range') {
    if(registryEntryId < 128) {
      return new Uint8Array([
        0xd9, // CBOR major type 6 + 2 byte tag size
        0x06, // non-legacy CBOR-LD tag
        registryEntryId // low-value type table id
        // encoded document appended in caller
      ]);
    }
    const idVarint = varint.encode(registryEntryId);

    return new Uint8Array([
      0xd9, // CBOR major type 6 + 2 byte tag size
      0x06, // non-legacy CBOR-LD tag
      idVarint[0],
      ...[
        0x82, // 2 element array
        ...cborg.encode(Uint8Array.from(idVarint.slice(1)))
        // encoded document appended as second element in caller
      ]
    ]);
  }

  // otherwise, use current tag system
  return new Uint8Array([
    0xd9, // CBOR major type 6 + 2 byte tag size
    0xcb, 0x1d, // CBOR-LD 1.0 tag
    ...[
      0x82, // 2 element array
      ...cborg.encode(registryEntryId)
      // encoded document appended as second element in caller
    ]
  ]);
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
￼* @param {string} url - The URL to retrieve.

￼* @returns {Promise<string>} The resource associated with the URL as a string.
 */
