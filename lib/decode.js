/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import cbor from 'cbor';
import {getCborldContextUrls} from './context';
import {getTermCodecMap} from './codec';
import util from 'util';
import {Base64PadCodec} from './codecs/base64Pad';
import {CborldError} from './error';
import {CodecMapCodec} from './codecs/codecMap';
import {CompressedCborldCodec} from './codecs/compressedCborld';
import {UrlCodec} from './codecs/url';
import {ContextCodec} from './codecs/context';
import {SimpleTypeCodec} from './codecs/simpleType';
import {UncompressedCborldCodec} from './codecs/uncompressedCborld';
import {XsdDateTimeCodec} from './codecs/xsdDateTime';

/**
 * Converts given CBOR-LD bytes to a JSON-LD document using the provided
 * codec map.
 *
 * @param {object} [args] - The arguments to the function.
 * @param {object} [args.cborldBytes] - The JSON-LD Document to convert to a
 *   CBOR-LD byte array.
 * @param {object} [args.appContextMap] - A map of JSON-LD Context URLs and
 *   their associated CBOR-LD codec values (must be values greater than
 *   32767 (0x7FFF)).
 * @param {object} [args.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD codecs.
 * @param {object} [args.documentLoader] - The document loader to use to
 *   fetch JSON-LD Context files.
 * @param {Function} [args.diagnose] - Function to call with diagnostic
 *   information while processing. Function receives a `message` parameter.
 *
 * @returns {Uint8Array} - A CBOR-LD encoded CBOR byte array.
 */
export async function fromCborld({
  cborldBytes, appContextMap, appTermMap, documentLoader, diagnose}) {
  const cborMap = cbor.decode(cborldBytes);

  let jsonldDocument = {};
  if(cborMap.tag === 0x0500) {
    jsonldDocument = cborMap.value;
  } else if(cborMap.tag === 0x0501) {
    const contextUrls =
      getCborldContextUrls({cborMap: cborMap.value, appContextMap});
    const codecMap = await getTermCodecMap(
      {contextUrls, appTermMap, documentLoader, decode: true});
  } else {
    throw new CborldError('ERR_NOT_CBORLD',
      'Input is not valid CBOR-LD; missing CBOR-LD header (0x0500 or 0x501).');
  }

  if(diagnose) {
    diagnose('Diagnostic CBOR Object:');
    diagnose(await util.inspect(cborMap, {depth: null, colors: true}));
    diagnose('Diagnostic JSON-LD Object:');
    diagnose(jsonldDocument);
  }

  return jsonldDocument;
}
