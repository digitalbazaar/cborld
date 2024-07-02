/*!
 * Copyright (c) 2020-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {Compressor} from './Compressor.js';
import {inspect} from './util.js';
import {encode} from 'varint';

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {boolean} [options.varintTagValue=1] - the varint value for the registry
 * entry associated with the resulting CBOR-LD payload
 * @param {Map} [options.contextMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values).
 * @param {Map} [options.termMap] - A map of JSON-LD terms and
 *   their encoded CBOR-LD values.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 * provided, is called with diagnostic information.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, varintValue = 1,
  contextMap = new Map(), termMap = new Map(), diagnose
} = {}) {
  if(!(varintValue >= 1)) {
    throw new TypeError(
      '"varintValue" must be an integer greater than 0');
  }
  let prefix;
  let {varintTagValue, varintByteValue} = _getVarintStructure(varintValue);
  if(varintByteValue) {
    prefix = varintTagValue.concat(varintByteValue);
  } else {
    prefix = varintTagValue;
  }
  // 0xd9 == 11011001
  // 110 = CBOR major type 6
  // 11001 = 25, 16-bit tag size (65536 possible values)
  // 0x05 = always the first 8-bits of a CBOR-LD tag
  // compressionMode = last 8-bits of a CBOR-LD tag indicating compression type


  let suffix;
  if(compressionMode === 0) {
    // handle uncompressed CBOR-LD
    suffix = cborg.encode(jsonldDocument);
  } else {
    // compress CBOR-LD
    const compressor = new Compressor({documentLoader, contextMap, termMap});
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

function _getVarintStructure(varintValue){
  let varintTagValue;
  let varintByteValue;
  if(varintValue < 128) {
    varintTagValue = new Uint8Array([0xd9, 0x06, varintValue]);
    varintByteValue = null;
  } else {
    varintTagValue = new Uint8Array([0xd9, 0x06, 0x80]);
    varintByteValue = cborg.encode(varint.encode(varintValue));
  }
  return {varintTagValue, varintByteValue};
}
