/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export class CompressedCborldCodec {
  constructor() {
    // CBOR Tag 501 is 'Compressed CBOR-LD, Version 1'
    this.tag = 0x0501;
  }

  set({value}) {
    this.value = value;
  }

  encodeCBOR(gen) {
    return gen._pushTag(this.tag) && gen.pushAny(this.value);
  }
}
