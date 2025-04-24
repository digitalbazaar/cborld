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
 * @param {Map} [options.typeTable] - A map of possible value types, including
 *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
 *   another map of values of that type to their associated CBOR-LD integer
 *   values.
 * @param {Function} [options.typeTableLoader] - The typeTable loader to use to
 *   resolve a registryEntryId to a typeTable.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} [options.appContextMap] - A map of context string values
 *   to their associated CBOR-LD integer values. For use with legacy
 *   cborldBytes.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes,
  documentLoader,
  typeTable,
  typeTableLoader,
  diagnose,
  appContextMap = new Map(),
}) {
  if(!(cborldBytes instanceof Uint8Array)) {
    throw new TypeError('"cborldBytes" must be a Uint8Array.');
  }

  // parse CBOR-LD into a header and payload
  const {header, payload} = parse({cborldBytes});
  if(!header.payloadCompressed) {
    return payload;
  }

  // decoded output is the abstract CBOR-LD input for conversion to JSON-LD
  const input = payload;//cborg.decode(suffix, {useMaps: true});
  if(diagnose) {
    diagnose('Diagnostic CBOR-LD decompression transform map(s):');
    diagnose(inspect(input, {depth: null, colors: true}));
  }

  // lookup typeTable by id if needed
  const {format, registryEntryId} = header;
  if(format !== 'legacy-singleton') {
    if(typeTable && typeTableLoader) {
      throw new TypeError('Use either "typeTable" or "typeTableLoader".');
    }
    if(!typeTable && typeTableLoader) {
      if(registryEntryId === 1) {
        // use default table (empty) for registry entry ID `1`
        typeTable = createTypeTable({typeTable});
      } else {
        typeTable = await typeTableLoader({registryEntryId});
      }
    }
    if(!typeTable) {
      throw new CborldError(
        'ERR_NO_TYPETABLE',
        '"typeTable" not provided or found for registryEntryId ' +
        `"${registryEntryId}".`);
    }
  }

  const converter = _createConverter({
    format,
    typeTable,
    documentLoader,
    appContextMap
  });
  const output = await converter.convert({input});
  if(diagnose) {
    diagnose('Diagnostic JSON-LD result:');
    diagnose(inspect(output, {depth: null, colors: true}));
  }
  return output;
}

// FIXME: consider making static method on `Converter`
function _createConverter({
  format,
  typeTable,
  documentLoader,
  appContextMap
}) {
  const legacyConverter = format === 'legacy-singleton';
  typeTable = legacyConverter ?
    createLegacyTypeTable({typeTable, appContextMap}) :
    createTypeTable({typeTable});

  return new Converter({
    // decompress CBOR-LD => JSON-LD
    strategy: new Decompressor({typeTable}),
    documentLoader,
    // FIXME: try to eliminate need for legacy flag
    legacy: legacyConverter
  });
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
