/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from '../CborldError.js';

// map of future CBOR-LD registry of known JSON-LD Contexts
const cborldContextEncodeMap = new Map();
const cborldContextDecodeMap = new Map();
_setEncodeDecodeMap(0x10, 'https://www.w3.org/ns/activitystreams');
_setEncodeDecodeMap(0x11, 'https://www.w3.org/2018/credentials/v1');
_setEncodeDecodeMap(0x12, 'https://www.w3.org/ns/did/v1');
_setEncodeDecodeMap(0x13,
  'https://w3id.org/security/ed25519-signature-2018/v1');
_setEncodeDecodeMap(0x14,
  'https://w3id.org/security/ed25519-signature-2020/v1');
_setEncodeDecodeMap(0x15, 'https://w3id.org/cit/v1');
_setEncodeDecodeMap(0x16, 'https://w3id.org/age/v1');
_setEncodeDecodeMap(0x17, 'https://w3id.org/security/suites/x25519-2020/v1');
_setEncodeDecodeMap(0x18, 'https://w3id.org/veres-one/v1');

export class ContextCodec {
  constructor() {
  }

  set({value, appContextMap}) {
    this.value = value;
    this.encodingMap = new Map(cborldContextEncodeMap);
    this.decodingMap = new Map(cborldContextDecodeMap);

    // add the caller-defined context values
    if(appContextMap) {
      appContextMap.forEach((value, key) => {
        // caller-defined context values MUST be less than 32768
        // if the application-specific CBOR-LD encoded context URL values
        // are less than 0x8000, throw an error. The start of
        // application-specific context URL value space starts at 0x8000
        // if(value < 0x8000) {
        //   throw new CborldError(
        //     'ERR_INVALID_CBORLD_CONTEXT_VALUE',
        //     `The provided JSON-LD Context mapping from '${key}' to ` +
        //     `${value} (0x${value.toString(16)}) must be greater than ` +
        //     `32767 (0x7FFF).`
        //   );
        // }
        this.encodingMap.set(key, value);
        this.decodingMap.set(value, key);
      });
    }
  }

  encodeCBOR(gen) {
    let encodedValue = this.value;

    if(Array.isArray(this.value)) {
      encodedValue = this.value.map(
        element => (this.encodingMap.has(element)) ?
          this.encodingMap.get(element) : element);
    } else if(typeof this.value === 'string') {
      encodedValue = (this.encodingMap.has(this.value)) ?
        this.encodingMap.get(this.value) : this.value;
    }

    return gen.pushAny(encodedValue);
  }

  decodeCBOR() {
    const decodedValue = (Array.isArray(this.value)) ?
      this.value.map(element => _decodeValue(this.decodingMap, element)) :
      _decodeValue(this.decodingMap, this.value);

    return decodedValue;
  }
}

function _decodeValue(decodingMap, value) {
  let decodedValue = value;

  if(decodingMap.has(value)) {
    decodedValue = decodingMap.get(value);
  } else if(typeof value === 'string') {
    decodedValue = value;
  } else {
    throw new CborldError(
      'ERR_UNKNOWN_JSONLD_CONTEXT',
      `Unknown encoded JSON-LD Context '${value}' detected while decoding.`);
  }

  return decodedValue;
}

function _setEncodeDecodeMap(id, url) {
  cborldContextEncodeMap.set(url, id);
  cborldContextDecodeMap.set(id, url);
}
