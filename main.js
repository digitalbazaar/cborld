/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} [jsonldDocument] - The JSON-LD Document to convert to a
 *  CBOR-LD byte array.
 * @param {object} [options] - The options to use.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded byte array.
 */
export async function encode(jsonldDocument, options) {
  return new Uint8Array(4);
}

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {Uint8Array} cborldBytes - The encoded CBOR-LD byte array to decode.
 * @param {object} options - The options to use.
 *
 * @returns {Uint8Array} - Decoded array of id bytes.
 */
export function decodeId(options) {
  return {};
}
