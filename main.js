/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {getContextUrls} from './lib/context';
import {getTermEncodingMap, toCborld} from './lib/compression';
export {getTermCodecs} from './lib/compression';

/**
  * Encodes a given JSON-LD document into a CBOR-LD byte array.
  *
  * @param {object} [args] - The arguments to the function.
  * @param {Array} [args.jsonldDocument] - The JSON-LD Document to convert to a
  *   CBOR-LD byte array.
  * @param {object} [args.appContextMap] - A map of JSON-LD Context URLs and
  *   their associated CBOR-LD compression values (must be values greater than
  *   32767 (0x7FFF)).
  * @param {object} [args.appTermMap] - A map of JSON-LD terms and
  *   their associated CBOR-LD compression codecs.
  * @param {Function} [args.diagnose] - A function that, if provided, is called
  *   with diagnostic information.
  * @param {Function} [args.documentLoader] -The document loader to use when
  *   resolving JSON-LD Context URLs. Takes a single argument, a document URL.
  *
  * @returns {Uint8Array} - The encoded CBOR-LD bytes.
  */
export async function encode({
  jsonldDocument, appContextMap, appTermMap, diagnose, documentLoader}) {
  let termEncodingMap = undefined;

  // get the term encoding map by processing the JSON-LD Contexts
  try {
    const contextUrls = getContextUrls({jsonldDocument});
    termEncodingMap =
      await getTermEncodingMap({contextUrls, appTermMap, documentLoader});
  } catch(e) {
    // quietly ignore embedded context errors, generate uncompressed CBOR-LD
    if(e.value !== 'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED') {
      throw e;
    }
  }

  const cborldBytes =
    await toCborld({
      jsonldDocument, appContextMap, appTermMap, termEncodingMap, diagnose});

  return cborldBytes;
}

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Uint8Array} [args.cborldBytes] - The encoded CBOR-LD byte array to
 *   decode.
 * @param {object} [args.options] - The options to use.
 *
 * @returns {Uint8Array} - Decoded array of id bytes.
 */
export function decode({cborldBytes, options}) {
  return {};
}
