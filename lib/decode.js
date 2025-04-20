/*!
 * Copyright (c) 2020-2025 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {createLegacyTypeTable, createTypeTable} from './tables.js';
import {CborldError} from './CborldError.js';
import {Converter} from './Converter.js';
import {Decompressor} from './Decompressor.js';
import {inspect} from './util.js';
import {default as varint} from 'varint';

// 0xd9 == 11011001
// 110 = CBOR major type 6
// 11001 = 25, 16-bit tag size (65536 possible values)
// 0x05 = the first 8-bits of a legacy CBOR-LD tag
// 0x06 = the first 8-bits of a new CBOR-LD tag
const CBOR_TAG_FIRST_BYTE = 0xd9;
const CBORLD_TAG_SECOND_BYTE = 0xcb;
const CBORLD_TAG_SECOND_BYTE_LEGACY_RANGE = 0x06;
const CBORLD_TAG_SECOND_BYTE_LEGACY_SINGLETON = 0x05;

/**
 * Decodes a CBOR-LD byte array into a JSON-LD document.
 *
 * @param {object} options - The options to use when decoding CBOR-LD.
 * @param {Uint8Array} options.cborldBytes - The encoded CBOR-LD bytes to
 *   decode.
 * @param {documentLoaderFunction} options.documentLoader - The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {Map} [options.typeTable] - A map of possible value types, including
 *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
 *   another map of values of that type to their associated CBOR-LD integer
 *   values.
 * @param {Function} [options.typeTableLoader] - The typeTable loader to use to
 *   resolve a registryEntryId to a typeTable.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 *   provided, is called with diagnostic information.
 * @param {Map} [options.appContextMap] - A map of context string values
 *   to their associated CBOR-LD integer values. For use with legacy
 *   cborldBytes.
 *
 * @returns {Promise<object>} - The decoded JSON-LD Document.
 */
export async function decode({
  cborldBytes,
  documentLoader,
  typeTable,
  typeTableLoader,
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
  const {suffix, legacyFormat, registryEntryId} = _getSuffix({cborldBytes});
  const isCompressed = _checkCompressionMode({cborldBytes, legacyFormat});
  if(!isCompressed) {
    return cborg.decode(suffix, {useMaps: false});
  }

  // decoded output is the abstract CBOR-LD input for conversion to JSON-LD
  const input = cborg.decode(suffix, {useMaps: true});
  if(diagnose) {
    diagnose('Diagnostic CBOR-LD decompression transform map(s):');
    diagnose(inspect(input, {depth: null, colors: true}));
  }

  // lookup typeTable by id if needed
  if(!legacyFormat) {
    if(typeTable && typeTableLoader) {
      throw new TypeError('Use either "typeTable" or "typeTableLoader".');
    }
    if(!typeTable && typeTableLoader) {
      if(registryEntryId === 1) {
        // use default table (empty) for registry entry ID `1`
        typeTable = createTypeTable({typeTable});
      } else {
        typeTable = await typeTableLoader({registryEntryId});
      }
    }
    if(!typeTable) {
      throw new CborldError(
        'ERR_NO_TYPETABLE',
        '"typeTable" not provided or found for registryEntryId ' +
        `"${registryEntryId}".`);
    }
  }

  const converter = _createConverter({
    legacyFormat,
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
  legacyFormat,
  typeTable,
  documentLoader,
  appContextMap
}) {
  const legacyConverter = legacyFormat === 'singleton';
  typeTable = legacyConverter ?
    createLegacyTypeTable({typeTable, appContextMap}) :
    createTypeTable({typeTable});
  
  return new Converter({
    // decompress CBOR-LD => JSON-LD
    strategy: new Decompressor({typeTable}),
    documentLoader,
    // FIXME: try to eliminate need for legacy flag
    legacy: legacyConverter
  });
}

// FIXME: move to helpers for reuse in encode.js
function _checkCompressionMode({cborldBytes, legacyFormat}) {
  if(legacyFormat) {
    const compressionMode = cborldBytes[2];
    if(compressionMode === undefined) {
      throw new CborldError('ERR_NOT_CBORLD', 'Truncated CBOR-LD 16-bit tag.');
    }
    if(legacyFormat === 'singleton') {
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
  } else {
    // "uncompressed" mode is only for short count 0
    const registryEntryFirstByte = cborldBytes[4];
    if(registryEntryFirstByte === 0) {
      return true;
    }
    return false;
  }
  
}

function _getSuffix({cborldBytes}) {
  let index = 1; // start after 0xd9
  const isModern = cborldBytes[index] === CBORLD_TAG_SECOND_BYTE;
  let legacyFormat;
  if(cborldBytes[index] === CBORLD_TAG_SECOND_BYTE_LEGACY_RANGE){
    legacyFormat = 'range';
  }
  else if(cborldBytes[index] === CBORLD_TAG_SECOND_BYTE_LEGACY_SINGLETON){
    legacyFormat = 'singleton';
  }
  if(!(isModern || legacyFormat)) {
    throw new CborldError(
      'ERR_NOT_CBORLD',
      'CBOR-LD must either have a second byte of 0x06 or 0x05 (legacy).');
  }

  index++; // advance to tag value
  const {buffer, byteOffset, length} = cborldBytes;
  const tagValue = cborldBytes[index];
  let registryEntryId;
  if(isModern) {
    // structure is fixed with new tag processing rules
    index = 4;
    const registryEntryFirstByte = cborldBytes[index];
    let registryEntryLength = 0;
    // throw error if not valid first byte of 
    // a CBOR major type 0 integer
    if(registryEntryFirstByte > 27) {
      throw new CborldError(
        'ERR_INVALID_REGISTRY_ENTRY_VALUE',
        'The registry entry must be encoded as a' +
        'CBOR major type 0 integer'
      )
    // less than 24: the short count holds the value
    } else if(registryEntryFirstByte < 24) {
      registryEntryLength = 1;
    // 24: value in following byte
    } else if(registryEntryFirstByte === 24) {
      registryEntryLength = 2;
    // 25: value in following 2 bytes
    } else if(registryEntryFirstByte === 25) {
      registryEntryLength = 3;
    // 26: value in following 4 bytes
    } else if(registryEntryFirstByte === 26) {
      registryEntryLength = 5;
    // 27: value in following 8 bytes
    } else if(registryEntryFirstByte === 27) {
      registryEntryLength = 9;
    }  
    const registryEntryBytes = cborldBytes.slice(
      index, index + registryEntryLength
    );
    const registryEntryBuffer = Buffer.from(registryEntryBytes);
    registryEntryId = registryEntryBuffer.readUIntBE(0, registryEntryLength);
    // advance past registry entry
    index = index + registryEntryLength;

  } else if(legacyFormat === 'range') {
    if(tagValue < 128) {
      registryEntryId = tagValue;
      // advance to encoded data
      index++;
    } else {
      index++; // advance to array
      // check for 2 element array
      if(cborldBytes[index] !== 0x82) {
        throw new CborldError(
          'ERR_NOT_CBORLD',
          'CBOR-LD large varint encoding error.');
      }
      index++; // advance to byte string tag
      // first element is tail of varint encoded as byte string
      // low 5 bits are byte string length (or exceptions for large values)
      const varintArrayLength = cborldBytes[index] % 32;
      // don't support unbounded lengths here
      if(varintArrayLength >= 24) {
        throw new CborldError(
          'ERR_NOT_CBORLD',
          'CBOR-LD encoded registryEntryId too large.');
      }
      // FIXME: check for bad 0 length
      index++; // advance to byte string data
      // create single buffer for id varint initial byte and tail bytes
      const varintBytes = new Uint8Array(varintArrayLength + 1);
      varintBytes[0] = tagValue;
      const varintTailBytes = new Uint8Array(buffer, index, varintArrayLength);
      varintBytes.set(varintTailBytes, 1);
      // decode id from varint
      registryEntryId = varint.decode(varintBytes);
      // advance to second array element
      index += varintArrayLength;
    }
  }
  else {
    index++; // advance to tag value
  }
  const suffix = new Uint8Array(buffer, byteOffset + index, length - index);
  return {suffix, legacyFormat, registryEntryId};
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
￼* @param {string} url - The URL to retrieve.

￼* @returns {Promise<string>} The resource associated with the URL as a string.
 */
