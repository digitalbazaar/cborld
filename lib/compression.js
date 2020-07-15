/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import cbor from 'cbor';
import {CborldError} from './error';
import {CompressedCborldCodec} from './codecs/compressedCborld';
import {UncompressedCborldCodec} from './codecs/uncompressedCborld';
import {SimpleTypeCodec} from './codecs/simpleType';
import {CompressedTermCodec} from './codecs/compressedTerm';
import {ContextCodec} from './codecs/context';
import util from 'util';

/**
 * Gets a compression map for the given set of JSON-LD Context URLs.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Array} [args.contextUrls] - The JSON-LD Context URLs to use when
 *   building the compression map.
 * @param {object} [args.documentLoader] - The document loader to use when
 *   dereferencing URLs.
 *
 * @returns {object} - The compression map.
 */
export async function getTermEncodingMap({contextUrls, documentLoader}) {
  let termEncodingMap = {};

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => await documentLoader(contextUrl)));

  // generate a compression map for each context
  contexts.forEach(context => {
    const map = _generateTermEncodingMap(context);
    termEncodingMap = {...termEncodingMap, ...map};
  });

  // calculate the compressed term list order
  const compressedTermList = Object.keys(termEncodingMap).sort();
  compressedTermList.forEach((term, index) => {
    termEncodingMap[term].compressedTerm = index;
  });

  return termEncodingMap;
}

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
 * @param {object} [args.termEncodingMap] - The term encoding map
 *   to use when compressing the JSON-LD Document to a CBOR-LD byte array.
 * @param {Function} [args.diagnose] - Function to call with diagnostic
 *   information while processing. Function receives a `message` parameter.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function toCborld({
  jsonldDocument, appContextMap, termEncodingMap, diagnose}) {

  // generate the encoded CBOR Map
  const encodingMap = _generateEncodingMap({
    jsonldDocument, appContextMap, termEncodingMap});

  //console.log("ENCODING MAP", util.inspect(encodingMap, {depth: null, colors: true}));

  // determine the appropriate encoder based on CBOR-LD compression
  const cborldObject = (termEncodingMap) ?
    new CompressedCborldCodec() :
    new UncompressedCborldCodec();
  cborldObject.set({value: encodingMap});

  // encode as CBOR
  const cborldBytes = cbor.encode(cborldObject);

  if(diagnose) {
    diagnose('Diagnostic output:\n');
    diagnose(await cbor.Diagnose.diagnose(cborldBytes));
    diagnose(await cbor.Commented.comment(cborldBytes, {max_depth: 10}));
  }

  return cborldBytes;
}

// Generates a compression map given a JSON-LD Context
function _generateTermEncodingMap(context) {
  let termEncodingMap = {};

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context));
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the map -- e.g., @id is currently missing
  termEncodingMap['@context'] = {
    compressedTerm: null,
    codec: ContextCodec
  };
  termEncodingMap['@type'] = {
    compressedTerm: null,
    codec: CompressedTermCodec
  };

  for(const [key, value] of Object.entries(context['@context'])) {
    termEncodingMap[key] = {
      compressedTerm: null,
      codec: SimpleTypeCodec
    };

    if(typeof value === 'string') {
      termEncodingMap[key].codec =
        (value === '@type') ? CompressedTermCodec : SimpleTypeCodec;
    } else if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific compressors
      termEncodingMap[key].codec =
        (value['@type'] === '@id') ? CompressedTermCodec : SimpleTypeCodec;

      if(value['@context']) {
        const scopedTermEncodingMap = _generateTermEncodingMap(value);
        termEncodingMap = {...termEncodingMap, ...scopedTermEncodingMap};
      }
    } else {
      termEncodingMap[key].codec = SimpleTypeCodec;
    }
  }

  // FIXME: Merge caller-defined map

  return termEncodingMap;
}

// generate a CBOR encoding map given a JSON-LD document and compression map
function _generateEncodingMap(
  {jsonldDocument, appContextMap, termEncodingMap}) {
  const encodingMap = new Map();

  for(const [key, value] of Object.entries(jsonldDocument)) {
    // check for undefined compression keys
    if(termEncodingMap && termEncodingMap[key] === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get the compressed term and value codec
    const term = (termEncodingMap) ?
      termEncodingMap[key].compressedTerm : key;

    // set the encoded value
    let encodedValue = value;
    if(typeof value === 'object' && value.constructor === Object) {
      encodedValue = _generateEncodingMap({
        jsonldDocument: value, appContextMap, termEncodingMap});
    } else if(termEncodingMap) {
      encodedValue = new termEncodingMap[key].codec();
      encodedValue.set({value, appContextMap, termCodingMap: termEncodingMap});
    }

    encodingMap.set(term, encodedValue);
  }

  return encodingMap;
}