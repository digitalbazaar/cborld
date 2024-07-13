/*!
 * Copyright (c) 2020-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import * as varint from 'varint';
import {
  KEYWORDS_TABLE,
  STRING_TABLE,
  TYPED_LITERAL_TABLE,
  URL_SCHEME_TABLE
} from './tables.js';
import {CborldError} from './CborldError.js';
import {Compressor} from './Compressor.js';
import {inspect} from './util.js';

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {number|string} [options.varintValue='legacy] - The varint value for
 *  the registry entry associated with the resulting CBOR-LD payload. 
 *  For legacy support, use varintTagValue = 'legacy'.
 * @param {Map} options.stringTable - A map of string values and
 *  their associated CBOR-LD integer values.
 * @param {Map} options.typedLiteralTable - A map of JSON-LD types
 *  to maps that map values of that type to their associated CBOR-LD
 *  integer values.
 * @param {diagnosticFunction} options.diagnose - A function that, if
 *  provided, is called with diagnostic information.
 * @param {Map} options.appContextMap - For use with the legacy value of
 *  varintTagValue.
 * @param {number} options.compressionMode - For use with the legacy value of
 *  varintValue.
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, varintValue = 'legacy',
  stringTable = new Map(),
  typedLiteralTable = new Map(),
  diagnose,
  appContextMap = new Map(),
  compressionMode = 1
} = {}) {

  // validate that an acceptable value for `varintValue` was passed
  if(!((typeof varintValue === 'number' && varintValue > 0) ||
    varintValue === 'legacy')) {
    throw new TypeError(
      'varintValue must be either a positive integer or `legacy`.');
  }

  // check to make sure unsupported types not present in typedLiteralTable
  if(typedLiteralTable.has('xsd:integer') ||
  (typedLiteralTable.has('xsd:double') ||
  typedLiteralTable.has('xsd:boolean'))) {
    throw new CborldError(
      'ERR_UNSUPPORTED_LITERAL_TYPE',
      'typedLiteralTable must not contain xsd integers, doubles, or booleans.'
    );
  }

  const isLegacy = varintValue === 'legacy';
  const prefix = _getPrefix({isLegacy, compressionMode, varintValue});
  const compressor = _createCompressor({
    isLegacy,
    appContextMap,
    documentLoader,
    stringTable,
    typedLiteralTable
  });
  let suffix;
  if(compressionMode === 0 || varintValue === 0) {
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
function _getPrefix({isLegacy, compressionMode, varintValue}) {
  if(isLegacy) {
    return new Uint8Array([0xd9, 0x05, compressionMode]);
  }
  const {varintTagValue, varintByteValue} = _getVarintStructure(varintValue);
  if(varintByteValue) {
    return [...varintTagValue, ...varintByteValue];
  }
  return varintTagValue;

}

function _createCompressor({
  isLegacy,
  appContextMap,
  documentLoader,
  keywordsTable,
  stringTable,
  typedLiteralTable,
  urlSchemeTable
}) {
  if(isLegacy) {
    const stringTableWithAppContext = new Map(STRING_TABLE);
    for(const [key, value] of appContextMap) {
      stringTableWithAppContext.set(key, value);
    }
    return new Compressor({
      documentLoader,
      keywordsTable: new Map(KEYWORDS_TABLE),
      stringTable: stringTableWithAppContext,
      urlSchemeTable: new Map(URL_SCHEME_TABLE),
      typedLiteralTable: new Map(TYPED_LITERAL_TABLE)
    });
  }
  return new Compressor({
    documentLoader,
    keywordsTable,
    stringTable,
    urlSchemeTable,
    typedLiteralTable
  });
}

function _getVarintStructure(varintValue) {
  let varintTagValue;
  let varintByteValue;
  if(varintValue < 128) {
    varintTagValue = new Uint8Array([0xd9, 0x06, varintValue]);
    varintByteValue = null;
  } else {
    const varintArray = varint.encode(varintValue);
    varintTagValue = new Uint8Array([0xd9, 0x06, varintArray[0]]);
    varintByteValue = cborg.encode(varintArray.slice(1));
  }
  return {varintTagValue, varintByteValue};
}
