/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cbor from '@digitalbazaar/cbor';
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {CodecMapCodec} from './codecs/CodecMapCodec.js';
import {CompressedCborldCodec} from './codecs/CompressedCborldCodec.js';
import {UncompressedCborldCodec} from './codecs/UncompressedCborldCodec.js';
import {getJsonldContextUrls} from './context.js';
import {getTermCodecMap} from './codec.js';
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
export async function toCborld({
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

  // FIXME: remove me
  if(compressionMode === 1) {
    console.log('suffix', new Uint8Array(suffix));
    console.log('total compressed bytes', bytes);
    console.log('total compressed hex', Buffer.from(bytes).toString('hex'));
  }

  if(diagnose) {
    diagnose('Diagnostic CBOR-LD result:');
    diagnose(inspect(bytes, {depth: null, colors: true}));
  }

  return bytes;
}

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values (must be values greater than 32767 (0x7FFF)).
 * @param {Map} [options.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD term codecs.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 * provided, is called with diagnostic information.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function toCborld2({
  jsonldDocument, documentLoader, appContextMap, appTermMap = new Map(),
  diagnose
} = {}) {

  let termEncodingMap;

  // get the term encoding map by processing the JSON-LD Contexts
  try {
    const contextUrls = getJsonldContextUrls({jsonldDocument});
    termEncodingMap = await getTermCodecMap(
      {contextUrls, appTermMap, documentLoader, encode: true});
  } catch(e) {
    // quietly ignore embedded context errors, generate uncompressed CBOR-LD
    if(e.value !== 'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED') {
      throw e;
    }
  }

  // generate the encoded CBOR Map
  const encodingMap = _generateEncodingMap({
    jsonldDocument, appContextMap, appTermMap, termEncodingMap});

  // determine the appropriate codec
  const cborldObject = termEncodingMap ?
    new CompressedCborldCodec() :
    new UncompressedCborldCodec();
  cborldObject.set({value: encodingMap});

  // encode as CBOR
  const cborldBytes = cbor.encode(cborldObject);

  if(diagnose) {
    // throw new Error('"diagnose" not implemented.');
    diagnose(inspect(cborldObject, {depth: null, colors: true}));
    /*diagnose('CBOR Encoding Map:');
    diagnose(await cbor.Diagnose.diagnose(cborldBytes));
    diagnose('CBOR Diagnostic Mode:');
    diagnose(await cbor.Commented.comment(cborldBytes, {max_depth: 10}));*/
  }

  return cborldBytes;
}

// generate a CBOR encoding map given a JSON-LD document and term codec map
function _generateEncodingMap(
  {jsonldDocument, appContextMap, appTermMap, termEncodingMap}) {
  const encodingMap = new Map();

  // add the appTermMap under @codec if it exists
  if(appTermMap && appTermMap.size > 0 && termEncodingMap) {
    const codecValue = new CodecMapCodec();
    codecValue.set({value: appTermMap, termCodecMap: termEncodingMap});
    encodingMap.set(termEncodingMap.get('@codec').value, codecValue);
  }

  for(const [key, value] of Object.entries(jsonldDocument)) {
    // check for undefined term keys
    if(termEncodingMap && termEncodingMap.get(key) === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get the encoded term
    const term = termEncodingMap ?
      termEncodingMap.get(key).value : key;

    // set the encoded value
    let encodedValue = value;
    if(typeof value === 'object' && value.constructor === Object) {
      encodedValue = _generateEncodingMap(
        {jsonldDocument: value, appContextMap, termEncodingMap});
    } else if(Array.isArray(value)) {
      encodedValue = [];
      value.forEach(element => {
        let encodedSubvalue = element;
        // FIXME: Repetitive code, doesn't work for arrays of arrays?
        if(typeof element === 'object' && element.constructor === Object) {
          encodedSubvalue = _generateEncodingMap(
            {jsonldDocument: element, appContextMap, termEncodingMap});
        } else if(termEncodingMap) {
          const Codec = termEncodingMap.get(key).codec;
          encodedSubvalue = new Codec();
          encodedSubvalue.set({
            value: element, appContextMap,
            termCodecMap: termEncodingMap
          });
        }
        encodedValue.push(encodedSubvalue);
      });
    } else if(termEncodingMap) {
      const Codec = termEncodingMap.get(key).codec;
      encodedValue = new Codec();
      encodedValue.set({value, appContextMap, termCodecMap: termEncodingMap});
    }

    encodingMap.set(term, encodedValue);
  }

  return encodingMap;
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
