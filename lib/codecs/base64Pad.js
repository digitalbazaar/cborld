/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {Base64} from 'js-base64';

export class Base64PadCodec {
  constructor() {
  }

  set({value}) {
    this.value = value;
  }

  encodeCBOR(gen) {
    const encodedValue = Base64.toUint8Array(this.value);
    return gen.pushAny(encodedValue);
  }

  decodeCBOR() {
    const decodedValue = Base64.fromUint8Array(this.value);
    return decodedValue;
  }
}
