/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {createLegacyTypeTable, createTypeTable} from './tables.js';
import {CborldError} from './CborldError.js';
import {Converter} from './Converter.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';
import {parse} from './parser.js';

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {documentLoaderFunction} options.documentLoader - The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {Function} [options.typeTableLoader] - The `typeTable` loader to use
 *   to resolve a `registryEntryId` to a `typeTable`. A `typeTable` is a Map of
 *   possible value types, including `context`, `url`, `none`, and any JSON-LD
 *   type, each of which maps to another Map of values of that type to their
 *   associated CBOR-LD integer values.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} [options.appContextMap] - For use with "legacy-singleton"
 *   formatted inputs only; a map of context string values to their associated
 *   CBOR-LD integer values.
 * @param {*} [options.typeTable] - NOT permitted; use `typeTableLoader`.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes,
  documentLoader,
  typeTableLoader,
  diagnose,
  // for "legacy-singleton" format only
  appContextMap,
  // no longer permitted
  typeTable
} = {}) {
  if(!(cborldBytes instanceof Uint8Array)) {
    throw new TypeError('"cborldBytes" must be a Uint8Array.');
  }
  // throw on `typeTable` param which is no longer permitted
  if(typeTable !== undefined) {
    throw new TypeError('"typeTable" is not allowed; use "typeTableLoader".');
  }

  // parse CBOR-LD into a header and payload
  const {header, payload} = parse({cborldBytes});
  if(!header.payloadCompressed) {
    return payload;
  }

  // parsed payload is the abstract CBOR-LD input for conversion to JSON-LD
  const input = payload;
  if(diagnose) {
    diagnose('Diagnostic CBOR-LD decompression transform map(s):');
    diagnose(inspect(input, {depth: null, colors: true}));
  }

  // get `typeTable` by `registryEntryId` / `format`
  const {format, registryEntryId} = header;
  if(format === 'legacy-singleton') {
    // generate legacy type table
    typeTable = createLegacyTypeTable({appContextMap});
  } else if(registryEntryId === 1) {
    // use default table (empty) for registry entry ID `1`
    typeTable = createTypeTable({typeTable});
  } else {
    if(typeof typeTableLoader === 'function') {
      typeTable = await typeTableLoader({registryEntryId});
    }
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

  const converter = new Converter({
    // decompress CBOR-LD => JSON-LD
    strategy: new Decompressor({typeTable}),
    documentLoader,
    // FIXME: try to eliminate need for legacy flag
    legacy: format === 'legacy-singleton'
  });
  const output = await converter.convert({input});
  if(diagnose) {
    diagnose('Diagnostic JSON-LD result:');
    diagnose(inspect(output, {depth: null, colors: true}));
  }
  return output;
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
