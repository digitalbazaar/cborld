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

/**
 * Gets a compression map for the given set of JSON-LD Context URLs.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Array} [args.contextUrls] - The JSON-LD Context URLs to use when
 *   building the compression map.
 * @param {object} [args.options] - The options to use.
 *
 * @returns {object} - The compression map.
 */
export async function getCompressionMap({contextUrls, options}) {
  let compressionMap = {};

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => await options.documentLoader(contextUrl)));

  // generate a compression map for each context
  contexts.forEach(context => {
    const map = _generateCompressionMap(context);
    compressionMap = {...compressionMap, ...map};
  });

  // calculate the compressed term list order
  const compressedTermList = Object.keys(compressionMap).sort();
  compressedTermList.forEach((term, index) => {
    compressionMap[term].compressedTerm = index;
  });

  return compressionMap;
}

/**
 * Converts a given JSON-LD Document to CBOR-LD using the provided
 * compression map.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {object} [args.jsonldDocument] - The JSON-LD Document to convert to a
 *   CBOR-LD byte array.
 * @param {object} [args.compressionMap] - The compression map
 *   to use when compressing the JSON-LD Document to a CBOR-LD byte array.
 * @param {object} [args.options] - The options to use.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function toCborld({
  jsonldDocument, compressionMap, options}) {

  // generate the encoded CBOR Map
  const cborMap = new Map();
  for(const [key, value] of Object.entries(jsonldDocument)) {
    // check for undefined compression keys
    if(compressionMap && compressionMap[key] === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected while encoding to CBOR-LD.`);
    }

    // get the compressed term and value codec
    const term = (compressionMap) ?
      compressionMap[key].compressedTerm : key;
    let encodedValue = value;
    if(compressionMap) {
      encodedValue = new compressionMap[key].codec();
      encodedValue.set(value, compressionMap);
    }

    cborMap.set(term, encodedValue);
  }

  // determine the appropriate encoder based on CBOR-LD compression
  const cborldObject = (compressionMap) ?
    new CompressedCborldCodec() :
    new UncompressedCborldCodec();
  cborldObject.set(cborMap);

  // encode as CBOR
  const cborldBytes = cbor.encode(cborldObject);

  if(options.diagnose) {
    console.log('Diagnostic output:\n');
    console.log(await cbor.Diagnose.diagnose(cborldBytes));
    console.log(await cbor.Commented.comment(cborldBytes, {max_depth: 10}));
  }

  return cborldBytes;
}

// Generates a compression map given a JSON-LD Context
function _generateCompressionMap(context) {
  const compressionMap = {};

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context));
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the map -- e.g., @id is currently missing
  compressionMap['@context'] = {
    compressedTerm: null,
    codec: ContextCodec
  };
  compressionMap['@type'] = {
    compressedTerm: null,
    codec: CompressedTermCodec
  };

  for(const [key, value] of Object.entries(context['@context'])) {
    compressionMap[key] = {
      compressedTerm: null,
      codec: SimpleTypeCodec
    };

    if(typeof value === 'string') {
      compressionMap[key].codec =
        (value === '@type') ? CompressedTermCodec : SimpleTypeCodec;
    } else if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific compressors
      compressionMap[key].codec =
        (value['@type'] === '@id') ? CompressedTermCodec : SimpleTypeCodec;
    } else {
      compressionMap[key].codec = SimpleTypeCodec;
    }
  }

  // FIXME: Merge caller-defined map

  return compressionMap;
}
