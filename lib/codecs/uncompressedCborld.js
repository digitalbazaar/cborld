/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export class UncompressedCborldCodec {
  constructor() {
    // CBOR Tag 500 is 'Uncompressed CBOR-LD'
    this.tag = 0x0500;
  }

  set(value) {
    this.value = value;
  }

  encodeCBOR(gen) {
    return gen._pushTag(this.tag) && gen.pushAny(this.value);
  }
}
