/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import cbor from 'cbor';
import {getCborldContextUrls} from './context';
import {getTermCodecMap} from './codec';
import util from 'util';
import {CborldError} from './error';

/**
 * Converts given CBOR-LD bytes to a JSON-LD document using the provided
 * codec map.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {object} [args.cborldBytes] - The JSON-LD Document to convert to a
 *   CBOR-LD byte array.
 * @param {object} [args.appContextMap] - A map of JSON-LD Context URLs and
 *   their associated CBOR-LD codec values (must be values greater than
 *   32767 (0x7FFF)).
 * @param {object} [args.documentLoader] - The document loader to use to
 *   fetch JSON-LD Context files.
 * @param {Function} [args.diagnose] - Function to call with diagnostic
 *   information while processing. Function receives a `message` parameter.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function fromCborld({
  cborldBytes, appContextMap, documentLoader, diagnose}) {
  const cborMap = cbor.decode(cborldBytes);

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
    throw new CborldError('ERR_NOT_CBORLD',
      'Input is not valid CBOR-LD; missing CBOR-LD header (0x0500 or 0x501).');
  }

  if(diagnose) {
    diagnose('Diagnostic CBOR Object:');
    diagnose(await util.inspect(cborMap, {depth: null, colors: true}));
    diagnose('Diagnostic JSON-LD Object:');
    diagnose(await util.inspect(jsonldDocument, {depth: null, colors: true}));
  }

  return jsonldDocument;
}

// generate a CBOR encoding map given a JSON-LD document and compression map
// FIXME: This largely duplicates code from encode.js/_generateEncodingMap
function _generateDecodingMap(
  {cborMap, appContextMap, termCodecMap}) {
  const decodingMap = new Map();

  for(const [key, value] of cborMap.entries()) {
    // check for undefined compression keys
    if(termCodecMap && termCodecMap.get(key) === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get the uncompressed term and value codec
    const term = (termCodecMap) ?
      termCodecMap.get(key).value : key;

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
            `${util.inspect(element)}`);
        }
        decodedValue.push(decodedSubvalue);
      });
    } else if(value.decodeCBOR) {
      decodedValue = value.decodeCBOR();
    } else {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_ENCODING',
        `Unknown encoding for '${key}' detected in CBOR-LD input: ` +
        `${util.inspect(value)}`);
    }

    jsonldDocument[key] = decodedValue;
  }

  return jsonldDocument;
}
