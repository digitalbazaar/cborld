/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64PadCodec} from './codecs/base64Pad';
import {CborldError} from './error';
import {CodecMapCodec} from './codecs/codecMap';
import {UrlCodec} from './codecs/url';
import {ContextCodec} from './codecs/context';
import {SimpleTypeCodec} from './codecs/simpleType';
import {XsdDateTimeCodec} from './codecs/xsdDateTime';

// all term codecs available to use when transforming term values
const termCodecs = {
  base64Pad: Base64PadCodec,
  dateTime: XsdDateTimeCodec,
  url: UrlCodec
};

/**
 * Gets a list of all term codecs available to use when transforming term
 * values.
 *
 * @returns {Array} - An array of all term codecs.
 */
export function getTermCodecs() {
  return termCodecs;
}

/**
 * Gets a compression map for the given set of JSON-LD Context URLs.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Array} [args.contextUrls] - The JSON-LD Context URLs to use when
 *   building the compression map.
 * @param {object} [args.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD compression codecs.
 * @param {object} [args.documentLoader] - The document loader to use when
 *   dereferencing URLs.
 * @param {object} [args.encode] - If true, a map of term encoding codecs are
 *   returned.
 * @param {object} [args.decode] - If true, a map of term decoding codecs are
 *   returned.
 *
 * @returns {object} - The compression map.
 */
export async function getTermCodecMap({
  contextUrls, appTermMap, documentLoader, encode, decode}) {
  const termEncodingMap = new Map();

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => await documentLoader(contextUrl)));

  // generate a compression map for each context
  contexts.forEach(context => {
    const map = _generateTermEncodingMap(context);
    map.forEach((value, key) => {
      termEncodingMap.set(key, value);
    });
  });

  // overlay the app term map on the existing term encoding map
  const termCodecs = getTermCodecs();
  for(const [key, value] of Object.entries(appTermMap)) {
    const codec = termCodecs[value];
    if(codec === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_TERM_CODEC',
        `Unknown codec '${value}' specified for term '${key}'.`);
    }
    termEncodingMap.set(key, {codec});
  }

  // calculate the final values for the term codec map
  const terms = Array.from(termEncodingMap.keys()).sort();
  terms.forEach((term, index) => {
    if(encode) {
      termEncodingMap.get(term).value = index;
    } else if(decode) {
      termEncodingMap.get(term).value = term;
      termEncodingMap.set(index, termEncodingMap.get(term));
      termEncodingMap.delete(term);
    }
  });

  return termEncodingMap;
}

// Generates a compression map given a JSON-LD Context
function _generateTermEncodingMap(context) {
  const termEncodingMap = new Map();

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context));
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the map -- e.g., @id is currently missing
  termEncodingMap.set('@codec', {
    codec: CodecMapCodec
  });
  termEncodingMap.set('@context', {
    codec: ContextCodec
  });
  termEncodingMap.set('@type', {
    codec: UrlCodec
  });

  for(const [key, value] of Object.entries(context['@context'])) {
    termEncodingMap.set(key, {
      codec: SimpleTypeCodec
    });

    if(typeof value === 'string') {
      termEncodingMap.get(key).codec =
        (value === '@type') ? UrlCodec : SimpleTypeCodec;
    } else if(typeof value === 'object') {
      // FIXME: Add support for global and local type-specific compressors
      let codec = SimpleTypeCodec;
      switch(value['@type']) {
        case '@id':
        case '@vocab':
          codec = UrlCodec;
          break;
        // FIXME: Keep track of prefixes and see if xsd matches
        // http://www.w3.org/2001/XMLSchema#
        case 'xsd:dateTime':
          codec = XsdDateTimeCodec;
          break;
          // FIXME: Keep track of prefixes and see if sec matches
          // https://w3id.org/security#
        case 'sec:base64Pad':
          codec = Base64PadCodec;
      }
      termEncodingMap.get(key).codec = codec;

      if(value['@context']) {
        const scopedTermEncodingMap = _generateTermEncodingMap(value);
        scopedTermEncodingMap.forEach(
          (value, key) => termEncodingMap.set(key, value));
      }
    } else {
      termEncodingMap.get(key).codec = SimpleTypeCodec;
    }
  }

  // FIXME: Merge caller-defined map

  return termEncodingMap;
}
