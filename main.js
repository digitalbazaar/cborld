/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {fromCborld} from './lib/decode';
import {toCborld} from './lib/encode';

export {getTermCodecs} from './lib/codec';

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
 * @returns {Uint8Array} - The encoded CBOR-LD bytes.
 */
export async function encode({
  jsonldDocument, documentLoader, appContextMap, appTermMap, diagnose}) {

  const cborldBytes =
    await toCborld({
      jsonldDocument, documentLoader, appContextMap, appTermMap, diagnose});

  return cborldBytes;
}

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {Function} options.documentLoader -The document loader to use when
 *   resolving JSON-LD Context URLs.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their associated CBOR-LD values. The values must be greater than
 *   32767 (0x7FFF)).
 * @param {Map} [options.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD term codecs.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 *
 * @returns {object} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader, appContextMap, appTermMap, diagnose}) {

  const jsonldDocument =
    await fromCborld({
      cborldBytes, documentLoader, appContextMap, appTermMap, diagnose});

  return jsonldDocument;
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
