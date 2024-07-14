/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
// import * as varint from 'varint';
import {
  STRING_TABLE,
  TYPED_LITERAL_TABLE,
} from './tables.js';
//import pkg from 'varint';
import {CborldError} from './CborldError.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';

// const {decode: varintDecode} = pkg;

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
 * @param {Map} options.stringTable - A map of string values and
 *  their associated CBOR-LD integer values.
 * @param {Map} options.typeTable - A map of JSON-LD types
 *  to maps that map values of that type to their CBOR-LD integer values.
 * @param {Map} options.appContextMap - A map of context string values
 *  to their associated CBOR-LD integer values. For use with legacy cborldBytes.
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes, documentLoader,
  stringTable = new Map(),
  typeTable = new Map(),
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

  const decompressor = _createDecompressor({
    isLegacy,
    documentLoader,
    stringTable,
    typeTable,
    appContextMap
  });

  if(!isCompressed) {
    return cborg.decode(suffix, {useMaps: false});
  }

  const result = await decompressor.decompress(
    {compressedBytes: suffix, diagnose});

  if(diagnose) {
    diagnose('Diagnostic JSON-LD result:');
    diagnose(inspect(result, {depth: null, colors: true}));
  }
  return result;
}

function _createDecompressor({
  isLegacy,
  documentLoader,
  stringTable,
  typeTable,
  appContextMap
}) {
  // FIXME: rework to call Decompressor just once
  if(isLegacy) {
    const stringTableWithAppContext = new Map(STRING_TABLE);
    for(const [key, value] of appContextMap) {
      stringTableWithAppContext.set(key, value);
    }
    return new Decompressor({
      documentLoader,
      stringTable: stringTableWithAppContext,
      typeTable: new Map(TYPED_LITERAL_TABLE)
    });
  }
  return new Decompressor({
    documentLoader,
    stringTable,
    typeTable
  });
}

function _checkCompressionMode({cborldBytes, isLegacy}) {
  const compressionMode = cborldBytes[2];
  if(compressionMode === undefined) {
    throw new CborldError(
      'ERR_NOT_CBORLD', 'Truncated CBOR-LD 16-bit tag.');
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
  let suffix;
  let isLegacy;
  if(cborldBytes[1] === CBORLD_TAG_SECOND_BYTE) {
    isLegacy = false;
    let index = 2;
    const tagValue = cborldBytes[index];
    if(tagValue < 128) {
      index++;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
      if(tagValue === 0) {
        return cborg.decode(suffix, {useMaps: false});
      }
    } else {
      // TODO: this assumes tag length <= 31 bytes. FIXME?
      index++;
      const varintArrayLength = cborldBytes[index] % 32;
      /* TODO: do something with the varint value?
      const varintArrayData = cborldBytes.slice(
        index + 1, index + varintArrayLength + 1
      );
      const varintData = new Uint8Array([tagValue, ...varintArrayData]);
      */
      index = index + varintArrayLength + 1;
      const {buffer, byteOffset, length} = cborldBytes;
      suffix = new Uint8Array(buffer, byteOffset + index, length - index);
    }
  } else if(cborldBytes[1] === CBORLD_TAG_SECOND_BYTE_LEGACY) {
    isLegacy = true;
    const {buffer, byteOffset, length} = cborldBytes;
    suffix = new Uint8Array(buffer, byteOffset + 3, length - 3);
  } else {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must either have a second byte of 0x06 or 0x05 (legacy).');
  }
  return {suffix, isLegacy};
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
