/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

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
  return {};
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
