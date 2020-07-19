/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import cbor from 'cbor';
import {getJsonldContextUrls} from './context';
import {getTermCodecMap} from './codec';
import {CborldError} from './error';
import {CodecMapCodec} from './codecs/codecMap';
import {CompressedCborldCodec} from './codecs/compressedCborld';
import {UncompressedCborldCodec} from './codecs/uncompressedCborld';

/**
 * Converts a given JSON-LD Document to CBOR-LD using the provided
 * compression map.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {object} [args.jsonldDocument] - The JSON-LD Document to convert to a
 *   CBOR-LD byte array.
 * @param {object} [args.appContextMap] - A map of JSON-LD Context URLs and
 *   their associated CBOR-LD compression values (must be values greater than
 *   32767 (0x7FFF)).
 * @param {object} [args.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD compression codecs.
 * @param {object} [args.documentLoader] - The document loader to use to
 *   fetch JSON-LD Context files.
 * @param {Function} [args.diagnose] - Function to call with diagnostic
 *   information while processing. Function receives a `message` parameter.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function toCborld({
  jsonldDocument, appContextMap, appTermMap, documentLoader, diagnose}) {

  let termEncodingMap = undefined;

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

  // determine the appropriate encoder based on CBOR-LD compression
  const cborldObject = (termEncodingMap) ?
    new CompressedCborldCodec() :
    new UncompressedCborldCodec();
  cborldObject.set({value: encodingMap});

  // encode as CBOR
  const cborldBytes = cbor.encode(cborldObject);

  if(diagnose) {
    diagnose('CBOR Encoding Map:');
    diagnose(await cbor.Diagnose.diagnose(cborldBytes));
    diagnose('CBOR Diagnostic Mode:');
    diagnose(await cbor.Commented.comment(cborldBytes, {max_depth: 10}));
  }

  return cborldBytes;
}

// generate a CBOR encoding map given a JSON-LD document and compression map
function _generateEncodingMap(
  {jsonldDocument, appContextMap, appTermMap, termEncodingMap}) {
  const encodingMap = new Map();

  // add the appTermMap under @codec if it exists
  if(appTermMap && Object.keys(appTermMap).length > 0 && termEncodingMap) {
    const codecValue = new CodecMapCodec();
    codecValue.set({value: appTermMap, termCodecMap: termEncodingMap});
    encodingMap.set(termEncodingMap.get('@codec').value, codecValue);
  }

  for(const [key, value] of Object.entries(jsonldDocument)) {
    // check for undefined compression keys
    if(termEncodingMap && termEncodingMap.get(key) === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get the compressed term and value codec
    const term = (termEncodingMap) ?
      termEncodingMap.get(key).value : key;

    // set the encoded value
    let encodedValue = value;
    if(typeof value === 'object' && value.constructor === Object) {
      encodedValue = _generateEncodingMap({
        jsonldDocument: value, appContextMap, termEncodingMap});
    } else if(Array.isArray(value)) {
      encodedValue = [];
      value.forEach(element => {
        let encodedSubvalue = element;
        // FIXME: Repetitive code, doesn't work for arrays of arrays?
        if(typeof element === 'object' && element.constructor === Object) {
          encodedSubvalue = _generateEncodingMap({
            jsonldDocument: element, appContextMap, termEncodingMap});
        } else if(termEncodingMap) {
          const Codec = termEncodingMap.get(key).codec;
          encodedSubvalue = new Codec();
          encodedSubvalue.set({value: element, appContextMap,
            termCodecMap: termEncodingMap});
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
