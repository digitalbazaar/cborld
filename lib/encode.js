/*!
 * Copyright (c) 2020-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import * as varint from 'varint';
import {CborldError} from './CborldError.js';
import {Compressor} from './Compressor.js';
import {createLegacyTypeTable} from './tables.js';
import {inspect} from './util.js';

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {number|string} [options.registryEntryId='legacy] - The registry
 *   entry ID for the registry entry associated with the resulting CBOR-LD
 *   payload. For legacy support, use registryEntryId = 'legacy'.
 * @param {Map} options.typeTable - A map of possible value types, including
 *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
 *   another map of values of that type to their associated CBOR-LD integer
 *   values.
 * @param {diagnosticFunction} options.diagnose - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} options.appContextMap - For use with the legacy value of
 *   `registryEntryId`.
 * @param {number} options.compressionMode - For use with the legacy value of
 *   `registryEntryId`.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, registryEntryId = 'legacy',
  typeTable,
  diagnose,
  appContextMap,
  compressionMode
} = {}) {

  // validate that an acceptable value for `registryEntryId` was passed
  if(!((typeof registryEntryId === 'number' && registryEntryId > 0) ||
    registryEntryId === 'legacy')) {
    throw new TypeError(
      '"registryEntryId" must be either a positive integer or `legacy`.');
  }

  // check to make sure unsupported types not present in `typeTable`
  if(typeTable !== undefined) {
    if(typeTable.has('http://www.w3.org/2001/XMLSchema#integer') ||
      typeTable.has('http://www.w3.org/2001/XMLSchema#double') ||
      typeTable.has('http://www.w3.org/2001/XMLSchema#boolean')) {
      throw new CborldError(
        'ERR_UNSUPPORTED_LITERAL_TYPE',
        '"typeTable" must not contain XSD integers, doubles, or booleans.'
      );
    }
  }

  const isLegacy = registryEntryId === 'legacy';
  if(isLegacy) {
    if(compressionMode !== undefined &&
      !(compressionMode === 0 || compressionMode === 1)) {
      throw new TypeError(
        '"compressionMode" must be "0" (no compression) or "1" ' +
        'for compression mode version 1.');
    }
    // use default values in legacy mode
    if(compressionMode === undefined) {
      compressionMode = 1;
    }
  }
  if(!isLegacy) {
    if(compressionMode !== undefined) {
      throw new TypeError(
        '"compressionMode" must only be passed in legacy mode');
    }
  }

  const prefix = _getPrefix({isLegacy, compressionMode, registryEntryId});
  const compressor = _createCompressor({
    isLegacy,
    appContextMap,
    documentLoader,
    typeTable
  });
  let suffix;
  if(compressionMode === 0 || registryEntryId === 0) {
    // handle uncompressed CBOR-LD
    suffix = cborg.encode(jsonldDocument);
  } else {
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
function _getPrefix({isLegacy, compressionMode, registryEntryId}) {
  if(isLegacy) {
    return new Uint8Array([0xd9, 0x05, compressionMode]);
  }
  const {
    varintTagValue, varintByteValue
  } = _getVarintStructure(registryEntryId);
  if(varintByteValue) {
    return [...varintTagValue, ...varintByteValue];
  }
  return varintTagValue;

}

function _createCompressor({
  isLegacy,
  appContextMap,
  documentLoader,
  typeTable,
}) {
  if(isLegacy) {
    typeTable = createLegacyTypeTable({typeTable, appContextMap});
  }
  return new Compressor({documentLoader, typeTable});
}

function _getVarintStructure(registryEntryId) {
  let varintTagValue;
  let varintByteValue;
  if(registryEntryId < 128) {
    varintTagValue = new Uint8Array([0xd9, 0x06, registryEntryId]);
    varintByteValue = null;
  } else {
    const varintArray = varint.encode(registryEntryId);
    varintTagValue = new Uint8Array([0xd9, 0x06, varintArray[0]]);
    varintByteValue = cborg.encode(varintArray.slice(1));
  }
  return {varintTagValue, varintByteValue};
}
