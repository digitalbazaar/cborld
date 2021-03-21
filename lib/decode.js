/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';
import * as cbor from '@digitalbazaar/cbor';
import {getCborldContextUrls} from './context.js';
import {getTermCodecMap} from './codec.js';
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
export async function fromCborld({
  cborldBytes, documentLoader, appContextMap, diagnose}) {
  // normalize bytes to a Buffer for 'cbor'
  const cborMap = cbor.decode(cborldBytes);
  // normalize value to a Map
  if(!(cborMap.value instanceof Map)) {
    cborMap.value = new Map(Object.entries(cborMap.value));
  }

  let jsonldDocument = {};
  if(cborMap.tag === 0x0500) {
    jsonldDocument = cborMap.value;
  } else if(cborMap.tag === 0x0501) {
    const contextUrls =
      getCborldContextUrls({cborMap: cborMap.value, appContextMap});
    const appTermMap = cborMap.value.get(0);
    cborMap.value.delete(0);
    const termCodecMap = await getTermCodecMap(
      {contextUrls, appTermMap, documentLoader, decode: true});

    // generate the decoding Map from the CBOR map
    const decodingMap = _generateDecodingMap({
      cborMap: cborMap.value, appContextMap, appTermMap, termCodecMap});

    jsonldDocument = _decodeMap(decodingMap);
  } else {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'Input is not valid CBOR-LD; missing CBOR-LD header (0x0500 or 0x501).');
  }

  if(diagnose) {
    diagnose('Diagnostic CBOR Object:');
    diagnose(inspect(cborMap, {depth: null, colors: true}));
    diagnose('Diagnostic JSON-LD Object:');
    diagnose(inspect(jsonldDocument, {depth: null, colors: true}));
  }

  return jsonldDocument;
}

// generate a CBOR encoding map given a JSON-LD document and term codec map
// FIXME: This largely duplicates code from encode.js/_generateEncodingMap
function _generateDecodingMap(
  {cborMap, appContextMap, termCodecMap}) {
  const decodingMap = new Map();

  for(const [key, value] of cborMap.entries()) {
    // get the decoded term codec
    let term = key;
    if(termCodecMap) {
      const entry = termCodecMap.get(key);
      // check for undefined term codec keys
      if(entry === undefined) {
        throw new CborldError(
          'ERR_UNKNOWN_CBORLD_TERM',
          `Unknown term '${key}' was detected in JSON-LD input.`);
      }
      term = entry.value;
    }

    // set the encoded value
    let decodedValue = value;
    if(value instanceof Map) {
      decodedValue = _generateDecodingMap({
        cborMap: value, appContextMap, termCodecMap});
    } else if(termCodecMap) {
      const Codec = termCodecMap.get(key).codec;
      decodedValue = new Codec();
      decodedValue.set({value, appContextMap, termCodecMap});
    }

    decodingMap.set(term, decodedValue);
  }

  return decodingMap;
}

// decodes a CBOR-LD decoding map
function _decodeMap(decodingMap) {
  const jsonldDocument = {};

  for(const [key, value] of decodingMap.entries()) {
    // set the encoded value
    let decodedValue = value;
    if(value instanceof Map) {
      decodedValue = _decodeMap(value);
    } else if(Array.isArray(value)) {
      decodedValue = [];
      value.forEach(element => {
        let decodedSubvalue = element;
        // FIXME: Repetitive code, doesn't work for arrays of arrays?
        if(value instanceof Map) {
          decodedSubvalue = _decodeMap(element);
        } else if(element.decodeCBOR) {
          decodedSubvalue = element.decodeCBOR();
        } else {
          throw new CborldError(
            'ERR_UNKNOWN_CBORLD_ENCODING',
            `Unknown encoding for '${key}' detected in CBOR-LD input: ` +
            `${inspect(element)}`);
        }
        decodedValue.push(decodedSubvalue);
      });
    } else if(value.decodeCBOR) {
      decodedValue = value.decodeCBOR();
    } else {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_ENCODING',
        `Unknown encoding for '${key}' detected in CBOR-LD input: ` +
        `${inspect(value)}`);
    }

    jsonldDocument[key] = decodedValue;
  }

  return jsonldDocument;
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
