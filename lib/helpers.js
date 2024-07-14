/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';

// if a value with `termType` was compressed using the type table, then
// the encoded value will either be a `number` or a `Uint8Array`
export const TYPE_TABLE_ENCODED_AS_BYTES = new Set([
  // FIXME: revisit fact that `url` type table can have conflicts with
  // `termToId` table and whether to allow that
  'none',
  'http://www.w3.org/2001/XMLSchema#date',
  'http://www.w3.org/2001/XMLSchema#dateTime'
]);

export function bytesFromUint({intValue}) {
  let buffer;
  let dataview;
  if(intValue < 0xFF) {
    buffer = new ArrayBuffer(1);
    dataview = new DataView(buffer);
    dataview.setUint8(0, intValue);
  } else if(intValue < 0xFFFF) {
    buffer = new ArrayBuffer(2);
    dataview = new DataView(buffer);
    dataview.setUint16(0, intValue);
  } else if(intValue < 0xFFFFFFFF) {
    buffer = new ArrayBuffer(4);
    dataview = new DataView(buffer);
    dataview.setUint32(0, intValue);
  } else if(intValue < Number.MAX_SAFE_INTEGER) {
    buffer = new ArrayBuffer(8);
    dataview = new DataView(buffer);
    dataview.setBigUint64(0, BigInt(intValue));
  } else {
    throw new CborldError(
      'ERR_COMPRESSION_VALUE_TOO_LARGE',
      `Compression value "${intValue}" too large.`);
  }
  const bytes = new Uint8Array(buffer);
  return bytes;
}

export function bytesFromInt({intValue}) {
  let buffer;
  let dataview;
  if(intValue < 0x7F) {
    buffer = new ArrayBuffer(1);
    dataview = new DataView(buffer);
    dataview.setInt8(0, intValue);
  } else if(intValue < 0x7FFF) {
    buffer = new ArrayBuffer(2);
    dataview = new DataView(buffer);
    dataview.setInt16(0, intValue);
  } else if(intValue < 0x7FFFFFFF) {
    buffer = new ArrayBuffer(4);
    dataview = new DataView(buffer);
    dataview.setInt32(0, intValue);
  } else if(intValue < Number.MAX_SAFE_INTEGER) {
    buffer = new ArrayBuffer(8);
    dataview = new DataView(buffer);
    dataview.setBigInt64(0, BigInt(intValue));
  } else {
    throw new CborldError(
      'ERR_COMPRESSION_VALUE_TOO_LARGE',
      `Compression value "${intValue}" too large.`);
  }
  const bytes = new Uint8Array(buffer);
  return bytes;
}

export function getNormalizedTermType({termInfo, termType}) {
  const {term, def} = termInfo;

  // handle `@id`, `@type`, their aliases, and `@vocab`
  if(term === '@id' || def === '@id' || def?.['.@id'] === '@id' ||
    term === '@type' || def === '@type' || def?.['@id'] === '@type' ||
    termType === '@id' || termType === '@vocab') {
    return 'url';
  }
  return termType ?? 'none';
}

export function uintFromBytes({bytes}) {
  const buffer = bytes.buffer;
  const dataview = new DataView(buffer);
  let intValue;
  if(dataview.byteLength === 1) {
    intValue = dataview.getUint8(0);
  } else if(dataview.byteLength === 2) {
    intValue = dataview.getUint16(0);
  } else if(dataview.byteLength === 4) {
    intValue = dataview.getUint32(0);
  } else {
    throw new CborldError(
      'ERR_UNRECOGNIZED_BYTES',
      `Improperly formatted bytes "${bytes}" found.`);
  }
  return intValue;
}

export function intFromBytes({bytes}) {
  const buffer = bytes.buffer;
  const dataview = new DataView(buffer);
  let intValue;
  if(dataview.byteLength === 1) {
    intValue = dataview.getInt8(0);
  } else if(dataview.byteLength === 2) {
    intValue = dataview.getInt16(0);
  } else if(dataview.byteLength === 4) {
    intValue = dataview.getInt32(0);
  } else if(dataview.byteLength === 8) {
    intValue = dataview.getBigInt64(0);
    if(intValue > Number.MAX_SAFE_INTEGER) {
      throw new CborldError(
        'ERR_COMPRESSION_VALUE_TOO_LARGE',
        `Compression value "${intValue}" too large.`);
    }
    intValue = Number(intValue);
  } else {
    throw new CborldError(
      'ERR_UNRECOGNIZED_BYTES',
      `Improperly formatted bytes "${bytes}" found.`);
  }
  return intValue;
}
