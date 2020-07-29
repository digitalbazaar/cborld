/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {fromCborld} from './lib/decode.js';
import {toCborld} from './lib/encode.js';

export {documentLoader} from './lib/loader.js';
export {getTermCodecs} from './lib/codec.js';

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader - The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values (must be values greater than 32767 (0x7FFF)).
 * @param {Map} [options.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD term codecs.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
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
 * @returns {Promise<object>} - The decoded JSON-LD Document.
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
 * Fetches a resource given a URL.
 *
 * @see {@link https://www.w3.org/TR/json-ld-api/#loaddocumentcallback}
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 * @param {object} [options] - Options for the loader.
 *
 * @returns {Promise<RemoteDocument>} The RemoteDocument for the URL resource.
 */

/**
 * Information about a remote document or context.
 *
 * @see {@link https://www.w3.org/TR/json-ld-api/#remotedocument}
 *
 * @typedef {object} RemoteDocument
 * @property {string} contentType - The Content-Type of the remote document.
 * @property {string} contextUrl - If available, the value of the HTTP Link
 *   Header [RFC8288] using the http://www.w3.org/ns/json-ld#context link
 *   relation in the response.
 * @property {string|JSON} document - The retrieved document, either raw or
 *   parsed.
 * @property {string} documentUrl - The final URL of loaded document.
 * @property {string} profile - The value of any profile parameter retrieved
 *   as part of the original contentType.
 */
