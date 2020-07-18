/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {getJsonldContextUrls} from './lib/context';
export {getTermCodecs} from './lib/codec';
import {getTermEncodingMap, toCborld} from './lib/encode';
import {fromCborld} from './lib/decode';

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

  const cborldBytes =
    await toCborld({
      jsonldDocument, appContextMap, appTermMap, documentLoader, diagnose});

  return cborldBytes;
}

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {Uint8Array} [args.cborldBytes] - The encoded CBOR-LD byte array to
 *   decode.
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
 * @returns {Uint8Array} - Decoded array of id bytes.
 */
export async function decode({
  cborldBytes, appContextMap, appTermMap, diagnose, documentLoader}) {
  let codecMap = undefined;

  const jsonldDocument =
    await fromCborld({
      cborldBytes, appContextMap, appTermMap, codecMap, documentLoader,
      diagnose});

  return jsonldDocument;
}
