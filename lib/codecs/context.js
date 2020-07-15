/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from '../error';

// map of future CBOR-LD registry of known JSON-LD Contexts
const cborldContextEncodeMap = new Map();
const cborldContextDecodeMap = new Map();
_setEncodeDecodeMap(0x10, 'https://www.w3.org/ns/activitystreams');
_setEncodeDecodeMap(0x11, 'https://www.w3.org/2018/credentials/v1');
_setEncodeDecodeMap(0x12, 'https://www.w3.org/ns/did/v1');

export class ContextCodec {
  constructor() {
  }

  set({value, appContextMap}) {
    this.value = value;
    this.encodingMap = new Map(cborldContextEncodeMap);

    // add the caller-defined context values
    if(appContextMap) {
      appContextMap.forEach((value, key) => {
        // caller-defined context values MUST be less than 32768
        if(value < 0x8000) {
          throw new CborldError(
            'ERR_INVALID_CBORLD_CONTEXT_VALUE',
            `The provided JSON-LD Context mapping from '${key}' to ` +
            `${value} (0x${value.toString(16)}) must be greater than ` +
            `32767 (0x7FFF).`
          );
        }
        this.encodingMap.set(key, value);
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
}

function _setEncodeDecodeMap(id, url) {
  cborldContextEncodeMap.set(url, id);
  cborldContextDecodeMap.set(id, url);
}
