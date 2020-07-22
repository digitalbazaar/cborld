/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError';
import {CodecMapCodec} from './codecs/CodecMapCodec';
import {ContextCodec} from './codecs/ContextCodec';
import {MultibaseCodec} from './codecs/MultibaseCodec';
import {SimpleTypeCodec} from './codecs/SimpleTypeCodec';
import {UrlCodec} from './codecs/UrlCodec';
import {XsdDateTimeCodec} from './codecs/XsdDateTimeCodec';
import {termCodecs} from './codecs/CodecMapCodec';

/**
 * Gets a list of all term codecs available to use when transforming term
 * values.
 *
 * @returns {Array} - An array of all term codecs.
 */
export function getTermCodecs() {
  return [...termCodecs.keys()].filter(k => typeof k === 'string');
}

/**
 * Gets a term codec map for the given set of JSON-LD Context URLs. This map
 * can be used to perform encoding or decoding.
 *
 * @param {object} options - The arguments to the function.
 * @param {Array} options.contextUrls - The JSON-LD Context URLs to use when
 *   building the term codec map.
 * @param {object} options.documentLoader - The document loader to use when
 *   dereferencing URLs.
 * @param {object} [options.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD term codecs.
 * @param {boolean} [options.encode] - If true, a map of term encoding codecs
 *   are returned.
 * @param {boolean} [options.decode] - If true, a map of term decoding codecs
 *   are returned.
 *
 * @returns {object} - The term codec map for performing encoding or decoding.
 */
export async function getTermCodecMap({
  contextUrls, appTermMap = new Map(), documentLoader, encode, decode} = {}) {
  const termCodecMap = new Map();

  // ensure that either encode or decode is set
  if(encode === decode) {
    throw new CborldError(
      'ERR_TERM_CODEC_MAP',
      `Invalid encode/decode value set while building term codec map. ` +
      `encode: ${encode} decode: ${decode}`);
  }

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => JSON.parse(await documentLoader(contextUrl))));

  // generate a term codec map for each context
  contexts.forEach(context => {
    const map = _generateTermEncodingMap(context);
    map.forEach((value, key) => termCodecMap.set(key, value));
  });

  // calculate the final values for the term codec map
  // FIXME: ensure this is the same in all locales; may need to
  // pick a particular locale to ensure it/do something else
  const terms = Array.from(termCodecMap.keys()).sort();
  terms.forEach((term, index) => {
    if(encode) {
      termCodecMap.get(term).value = index;
    } else if(decode) {
      termCodecMap.get(term).value = term;
      termCodecMap.set(index, termCodecMap.get(term));
    }
  });

  // overlay the app term map on the existing term encoding map
  if(decode && appTermMap.size > 0) {
    const codecMap = new CodecMapCodec();
    codecMap.set({value: appTermMap, termCodecMap});
    appTermMap = codecMap.decodeCBOR();
  }

  // clear terms used during encoding
  // FIXME: This should be refactored when this function is refactored
  // ideally, we wouldn't need to delete old terms
  if(decode) {
    terms.forEach(term => termCodecMap.delete(term));
  }

  for(const [key, value] of appTermMap.entries()) {
    const codec = encode ? termCodecs.get(value) : value;
    if(codec === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_TERM_CODEC',
        `Unknown codec '${value}' specified for term '${key}'.`);
    }
    termCodecMap.get(key).codec = codec;
  }

  return termCodecMap;
}

// Generates a term encoding map given a JSON-LD Context
function _generateTermEncodingMap(context) {
  const termCodecMap = new Map();

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context).substring(0, 100) + '...');
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the map -- e.g., @id is currently missing
  termCodecMap.set('@codec', {codec: CodecMapCodec});
  termCodecMap.set('@context', {codec: ContextCodec});
  termCodecMap.set('@type', {codec: UrlCodec});

  for(const [key, value] of Object.entries(context['@context'])) {
    termCodecMap.set(key, {codec: SimpleTypeCodec});

    if(typeof value === 'string') {
      // if @type has been aliased, ensure that the codec is a UrlCodec
      termCodecMap.get(key).codec =
        (value === '@type') ? UrlCodec : SimpleTypeCodec;
    } else if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific codecs
      let codec = SimpleTypeCodec;
      switch(value['@type']) {
        case '@id':
        case '@vocab':
          codec = UrlCodec;
          break;
        // FIXME: Keep track of prefixes and see if xsd matches
        // http://www.w3.org/2001/XMLSchema#
        case 'http://www.w3.org/2001/XMLSchema#':
        case 'xsd:dateTime':
          codec = XsdDateTimeCodec;
          break;
        // FIXME: Expand all URLs so we don't have to also check against sec;
        // consider using jsonld.js to process context and get term definitions
        // for robustness
        case 'sec:multibase':
        case 'https://w3id.org/security#multibase':
          codec = MultibaseCodec;
          break;
      }
      termCodecMap.get(key).codec = codec;

      if(value['@context']) {
        const scopedTermEncodingMap = _generateTermEncodingMap(value);
        scopedTermEncodingMap.forEach(
          (value, key) => termCodecMap.set(key, value));
      }
    } else {
      termCodecMap.get(key).codec = SimpleTypeCodec;
    }
  }

  // FIXME: Merge caller-defined map

  return termCodecMap;
}
