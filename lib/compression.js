/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './error';
import {simpleTypeCodec} from './codecs/simpleType';
import {compressedTermCodec} from './codecs/compressedTerm';
import {contextCodec} from './codecs/context';

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

  // FIXME: Build the actual CBOR-LD byte array.
  return new Uint8Array(3);
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
  // for in the dictionary -- e.g., @id and @type are currently missing
  dictionary['@context'] = {
    compressedTerm: null,
    codec: contextCodec
  };

  for(const [key, value] of Object.entries(context['@context'])) {
    dictionary[key] = {
      compressedTerm: null
    };

    if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific compressors
      if(value['@type'] === '@id') {
        dictionary[key].codec = compressedTermCodec;
      } else {
        dictionary[key].codec = simpleTypeCodec;
      }
    } else {
      dictionary[key].codec = simpleTypeCodec;
    }
  }

  return dictionary;
}
