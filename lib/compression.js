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
 * Gets a compression dictionary for the given set of JSON-LD Context URLs.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Array} [args.contextUrls] - The JSON-LD Context URLs to use when
 *   building the compression dictionary.
 * @param {object} [args.options] - The options to use.
 *
 * @returns {object} - The compression dictionary.
 */
export async function getCompressionDictionary({contextUrls, options}) {
  let compressionDictionary = {};

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => await options.documentLoader(contextUrl)));

  // generate a compression dictionary for each context
  contexts.forEach(context => {
    const dictionary = _generateDictionary(context);
    compressionDictionary = {...compressionDictionary, ...dictionary};
  });

  // calculate the compressed term list order
  const compressedTermList = Object.keys(compressionDictionary).sort();
  compressedTermList.forEach((term, index) => {
    compressionDictionary[term].compressedTerm = index;
  });

  return compressionDictionary;
}

/**
 * Converts a given JSON-LD Document to CBOR-LD using the provided
 * compression dictionary.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {object} [args.jsonldDocument] - The JSON-LD Document to convert to a
 *   CBOR-LD byte array.
 * @param {object} [args.compressionDictionary] - The compression dictionary
 *   to use when compressing the JSON-LD Document to a CBOR-LD byte array.
 * @param {object} [args.options] - The options to use.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function toCborld({
  jsonldDocument, compressionDictionary, options}) {

  // generate the encoded CBOR Map
  const cborMap = new Map();
  for(const [key, value] of Object.entries(jsonldDocument)) {
    const term = (compressionDictionary) ?
      compressionDictionary[key].compressedTerm : key;
    let encodedValue = value;

    if(compressionDictionary) {
      encodedValue = new compressionDictionary[key].codec();
      encodedValue.set(value, compressionDictionary);
    }

    cborMap.set(term, encodedValue);
  }

  // determine the appropriate encoder based on CBOR-LD compression
  const cborldObject = (compressionDictionary) ?
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

// Generates a compression dictionary given a JSON-LD Context
function _generateDictionary(context) {
  const dictionary = {};

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context));
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the dictionary -- e.g., @id is currently missing
  dictionary['@context'] = {
    compressedTerm: null,
    codec: ContextCodec
  };
  dictionary['@type'] = {
    compressedTerm: null,
    codec: CompressedTermCodec
  };

  for(const [key, value] of Object.entries(context['@context'])) {
    dictionary[key] = {
      compressedTerm: null,
      codec: SimpleTypeCodec
    };

    if(typeof value === 'string') {
      dictionary[key].codec =
        (value === '@type') ? CompressedTermCodec : SimpleTypeCodec;
    } else if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific compressors
      dictionary[key].codec =
        (value['@type'] === '@id') ? CompressedTermCodec : SimpleTypeCodec;
    } else {
      dictionary[key].codec = SimpleTypeCodec;
    }
  }

  // FIXME: Merge caller-defined dictionary

  return dictionary;
}
