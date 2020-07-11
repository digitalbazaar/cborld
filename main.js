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
  *  CBOR-LD byte array.
  * @param {object} [args.options] - The options to use.
  *
  * @returns {object} - The compression dictionary.
  */
export async function encode({jsonldDocument, options}) {
  const contextUrls = await getContextUrls({jsonldDocument});
  const compressionDictionary = await getCompressionDictionary({contextUrls});
  const cborldBytes = await toCborld({jsonldDocument, compressionDictionary});

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
