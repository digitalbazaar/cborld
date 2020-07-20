/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64PadCodec} from './codecs/base64Pad';
import {CborldError} from './error';
import {CodecMapCodec} from './codecs/codecMap';
import {ContextCodec} from './codecs/context';
import {SimpleTypeCodec} from './codecs/simpleType';
import {UrlCodec} from './codecs/url';
import {XsdDateTimeCodec} from './codecs/xsdDateTime';
import {termCodecs} from './codecs/codecMap';

/**
 * Gets a list of all term codecs available to use when transforming term
 * values.
 *
 * @returns {Array} - An array of all term codecs.
 */
export function getTermCodecs() {
  const codecs = [];
  termCodecs.forEach((value, key) => {
    if(typeof key === 'string') {
      codecs.push(key);
    }
  });

  return codecs;
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
  const termCodecMap = new Map();
  appTermMap = appTermMap || new Map();

  // retrieve all JSON-LD Contexts
  const contexts = await Promise.all(contextUrls.map(
    async contextUrl => await documentLoader(contextUrl)));

  // generate a compression map for each context
  contexts.forEach(context => {
    const map = _generateTermEncodingMap(context);
    map.forEach((value, key) => {
      termCodecMap.set(key, value);
    });
  });

  // calculate the final values for the term codec map
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
  if(decode) {
    terms.forEach(term => termCodecMap.delete(term));
  }

  for(const [key, value] of appTermMap.entries()) {
    const codec = (encode) ? termCodecs.get(value) : value;
    if(codec === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_TERM_CODEC',
        `Unknown codec '${value}' specified for term '${key}'.`);
    }
    termCodecMap.get(key).codec = codec;
  }

  return termCodecMap;
}

// Generates a compression map given a JSON-LD Context
function _generateTermEncodingMap(context) {
  const termCodecMap = new Map();

  // sanity check that context is a valid JSON-LD context object
  if(!context['@context']) {
    throw new CborldError(
      'ERR_INVALID_JSONLD_CONTEXT',
      'The JSON-LD Context does not contain a top-level @context value: ' +
      JSON.stringify(context));
  }

  // FIXME: Ensure that all JSON-LD keywords that could be keys are accounted
  // for in the map -- e.g., @id is currently missing
  termCodecMap.set('@codec', {
    codec: CodecMapCodec
  });
  termCodecMap.set('@context', {
    codec: ContextCodec
  });
  termCodecMap.set('@type', {
    codec: UrlCodec
  });

  for(const [key, value] of Object.entries(context['@context'])) {
    termCodecMap.set(key, {
      codec: SimpleTypeCodec
    });

    if(typeof value === 'string') {
      termCodecMap.get(key).codec =
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
