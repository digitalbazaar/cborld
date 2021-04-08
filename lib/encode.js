/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cbor from '@digitalbazaar/cbor';
import {CborldError} from './CborldError.js';
import {CodecMapCodec} from './codecs/CodecMapCodec.js';
import {CompressedCborldCodec} from './codecs/CompressedCborldCodec.js';
import {UncompressedCborldCodec} from './codecs/UncompressedCborldCodec.js';
import {getJsonldContextUrls} from './context.js';
import {getTermCodecMap} from './codec.js';
import {inspect} from './util.js';
import {Compressor} from './Compressor.js';
import {Decompressor} from './Decompressor.js';

const COMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x01]);
const UNCOMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x00]);

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
export async function toCborld(
  {jsonldDocument, documentLoader, appContextMap, appTermMap = new Map(),
    diagnose}) {

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

  // TODO: use new Compressor/Decompressor
  {
    const compressor = new Compressor({appContextMap, documentLoader});
    const suffix = await compressor.compress({jsonldDocument, diagnose});
    const length = COMPRESSED_PREFIX.length + suffix.length;
    const bytes = new Uint8Array(length);
    bytes.set(COMPRESSED_PREFIX);
    bytes.set(suffix, COMPRESSED_PREFIX.length);
    console.log('compressed suffix', new Uint8Array(suffix));
    console.log('total compressed bytes', bytes);
    console.log('total compressed hex', Buffer.from(bytes).toString('hex'));

    // FIXME: find compressed CBOR-LD CBOR tag, pass data after it to
    // decompressor

    // const tags = [];
    // tags[0x0501] = function(obj) {
    //   // FIXME: ensure `obj` is a map
    //   // FIXME: go through the map and for each key, get the decoder and
    //   // apply it to decompress the values
    //   console.log('decode obj', obj);
    //   return obj;
    // };
    // tags[0x0500] = function(obj) {
    //   // FIXME: ensure `obj` is a map
    //   console.log('decode obj', obj);
    //   // FIXME: figure out what to do with the map... anything?
    //   return obj;
    // };
    //console.log(
    //  'decoded', cborg.decode(newCborldBytes, {tags, useMaps: true}));

    const decompressor = new Decompressor({appContextMap, documentLoader});
    await decompressor.decompress({compressedBytes: suffix});
  }

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
