/*!
 * Copyright (c) 2020-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {createLegacyTypeTable, createTypeTable} from './tables.js';
import {CborldError} from './CborldError.js';
import {Converter} from './Converter.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';

// 0xd9 == 11011001
// 110 = CBOR major type 6
// 11001 = 25, 16-bit tag size (65536 possible values)
// 0x05 = the first 8-bits of a legacy CBOR-LD tag
// 0x06 = the first 8-bits of a new CBOR-LD tag
const CBOR_TAG_FIRST_BYTE = 0xd9;
const CBORLD_TAG_SECOND_BYTE = 0x06;
const CBORLD_TAG_SECOND_BYTE_LEGACY = 0x05;

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {Function} options.documentLoader -The document loader to use when
 *   resolving JSON-LD Context URLs.
 * @param {diagnosticFunction} options.diagnose - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} options.typeTable - A map of possible value types, including
 *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
 *   another map of values of that type to their associated CBOR-LD integer
 *   values.
 * @param {Map} options.appContextMap - A map of context string values
 *   to their associated CBOR-LD integer values. For use with legacy
 *   cborldBytes.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader,
  typeTable,
  diagnose,
  appContextMap = new Map(),
}) {
  if(!(cborldBytes instanceof Uint8Array)) {
    throw new TypeError('"cborldBytes" must be a Uint8Array.');
  }

  // 0xd9 == 11011001
  // 110 = CBOR major type 6
  // 11001 = 25, 16-bit tag size (65536 possible values)
  if(cborldBytes[0] !== CBOR_TAG_FIRST_BYTE) {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must start with a CBOR major type "Tag" header of `0xd9`.');
  }
  const {suffix, isLegacy} = _getSuffix({cborldBytes});
  const isCompressed = _checkCompressionMode({cborldBytes, isLegacy});
  if(!isCompressed) {
    return cborg.decode(suffix, {useMaps: false});
  }

  // decoded output is the abstract CBOR-LD input for conversion to JSON-LD
  const input = cborg.decode(suffix, {useMaps: true});
  if(diagnose) {
    diagnose('Diagnostic CBOR-LD decompression transform map(s):');
    diagnose(inspect(input, {depth: null, colors: true}));
  }

  const converter = _createConverter({
    isLegacy,
    typeTable,
    documentLoader,
    appContextMap
  });
  const output = await converter.convert({input});
  if(diagnose) {
    diagnose('Diagnostic JSON-LD result:');
    diagnose(inspect(output, {depth: null, colors: true}));
  }
  return output;
}

// FIXME: consider making static method on `Converter`
function _createConverter({
  isLegacy,
  typeTable,
  documentLoader,
  appContextMap
}) {
  typeTable = isLegacy ?
    createLegacyTypeTable({typeTable, appContextMap}) :
    createTypeTable({typeTable});
  return new Converter({
    // decompress CBOR-LD => JSON-LD
    strategy: new Decompressor({typeTable}),
    documentLoader,
    // FIXME: try to eliminate need for legacy flag
    legacy: isLegacy
  });
}

// FIXME: move to helpers for reuse in encode.js
function _checkCompressionMode({cborldBytes, isLegacy}) {
  const compressionMode = cborldBytes[2];
  if(compressionMode === undefined) {
    throw new CborldError('ERR_NOT_CBORLD', 'Truncated CBOR-LD 16-bit tag.');
  }
  if(isLegacy) {
    if(!(compressionMode === 0 || compressionMode === 1)) {
      throw new CborldError(
        'ERR_NOT_CBORLD',
        `Unsupported CBOR-LD compression mode "${compressionMode}".`);
    }
  }
  if(compressionMode === 0) {
    return false;
  }
  if(!(typeof compressionMode === 'number' && compressionMode > 0)) {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      `Unsupported CBOR-LD third byte "${compressionMode}".`);
  }
  return true;
}

function _getSuffix({cborldBytes}) {
  const isModern = cborldBytes[1] === CBORLD_TAG_SECOND_BYTE;
  const isLegacy = cborldBytes[1] === CBORLD_TAG_SECOND_BYTE_LEGACY;
  if(!(isModern || isLegacy)) {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must either have a second byte of 0x06 or 0x05 (legacy).');
  }

  const tagValue = cborldBytes[2];
  let index = 3;
  if(isModern && tagValue >= 128) {
    // FIXME: this assumes tag length <= 31 bytes; throw error if not
    const varintArrayLength = cborldBytes[index] % 32;
    index += varintArrayLength + 1;
  }
  const {buffer, byteOffset, length} = cborldBytes;
  const suffix = new Uint8Array(buffer, byteOffset + index, length - index);
  return {suffix, isLegacy};
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
