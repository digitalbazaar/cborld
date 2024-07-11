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
 * @param {boolean} [options.varintTagValue=1] - The varint value for the
 * registry entry associated with the resulting CBOR-LD payload.
 * @param {Map} [options.compressionMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values).
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 * provided, is called with diagnostic information.
 *
 * @param options.varintValue
 * @param options.keywordsTable
 * @param options.stringTable
 * @param options.urlSchemeTable
 * @param options.typedLiteralTable
 * @param options.appContextMap
 * @param options.compressionMode
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, varintValue = 1,
  keywordsTable = new Map(),
  stringTable = new Map(),
  urlSchemeTable = new Map(),
  typedLiteralTable = new Map(),
  diagnose,
  appContextMap = new Map(),
  compressionMode = 1
} = {}) {
  let prefix;
  let suffix;
  // process using legacy values if appContextMap passed
  if(varintValue == -1) {
    prefix = new Uint8Array([0xd9, 0x05, compressionMode]);

    const stringTableWithAppContext = new Map(STRING_TABLE);

    for(const [key, value] of appContextMap) {
      stringTableWithAppContext.set(key, value);
    }
    if(compressionMode === 0) {
      // handle uncompressed CBOR-LD
      suffix = cborg.encode(jsonldDocument);
    } else {
      // compress CBOR-LD
      const compressor = new Compressor({
        documentLoader,
        keywordsTable: new Map(KEYWORDS_TABLE),
        stringTable: stringTableWithAppContext,
        urlSchemeTable: new Map(URL_SCHEME_TABLE),
        typedLiteralTable: new Map(TYPED_LITERAL_TABLE)
      });
      suffix = await compressor.compress({jsonldDocument, diagnose});
    }
  } else {
    // otherwise, process with new structure/values
    if(!(varintValue >= 1)) {
      throw new TypeError(
        '"varintValue" must be an integer greater than 0');
    }
    const {varintTagValue, varintByteValue} = _getVarintStructure(varintValue);
    if(varintByteValue) {
      prefix = [...varintTagValue, ...varintByteValue];
    } else {
      prefix = varintTagValue;
    }

    if(varintValue === 0) {
      // handle uncompressed CBOR-LD
      suffix = cborg.encode(jsonldDocument);
    } else {
      // compress CBOR-LD
      const compressor = new Compressor({
        documentLoader,
        keywordsTable,
        stringTable,
        urlSchemeTable,
        typedLiteralTable
      });
      suffix = await compressor.compress({jsonldDocument, diagnose});
    }
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
