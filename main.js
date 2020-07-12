/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {getContextUrls} from './lib/context';
import {getCompressionDictionary, toCborld} from './lib/compression';

/**
  * Encodes a given JSON-LD document into a CBOR-LD byte array.
  *
  * @param {object} [args] - The arguments to the function.
  * @param {Array} [args.jsonldDocument] - The JSON-LD Document to convert to a
  *   CBOR-LD byte array.
  * @param {object} [args.options] - The options to use.
  * @param {Function} [args.options.documentLoader(url, options)] -
  *   the document loader to use when resolving JSON-LD Context URLs.
  *
  * @returns {object} - The compression dictionary.
  */
export async function encode({jsonldDocument, options}) {
  let compressionDictionary = undefined;

  try {
    const contextUrls = getContextUrls({jsonldDocument});
    compressionDictionary =
      await getCompressionDictionary({contextUrls, options});
  } catch(e) {
    // quietly ignore embedded context errors, generate uncompressed CBOR-LD
    if(e.value !== 'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED') {
      throw e;
    }
  }

  const cborldBytes =
    await toCborld({jsonldDocument, compressionDictionary, options});

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
