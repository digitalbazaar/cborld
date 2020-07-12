/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

// map of future CBOR-LD registry of known JSON-LD Contexts
const encodeMap = new Map();
const decodeMap = new Map();
_setEncodeDecodeMap(0x10, 'https://www.w3.org/ns/activitystreams');
_setEncodeDecodeMap(0x11, 'https://www.w3.org/2018/credentials/v1');
_setEncodeDecodeMap(0x12, 'https://www.w3.org/ns/did/v1');

export class ContextCodec {
  constructor() {
  }

  set(value) {
    this.value = value;
  }

  encodeCBOR(gen) {
    let encodedValue = this.value;

    if(Array.isArray(this.value)) {
      encodedValue = this.value.map(
        element => (encodeMap.has(element)) ? encodeMap.get(element) : element);
    } else if(typeof this.value === 'string') {
      encodedValue = (encodeMap.has(this.value)) ?
        encodeMap.get(this.value) : this.value;
    }

    return gen.pushAny(encodedValue);
  }
}

function _setEncodeDecodeMap(id, url) {
  encodeMap.set(url, id);
  decodeMap.set(id, url);
}
