/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
export class SimpleTypeCodec {
  constructor() {
  }

  set({value}) {
    this.value = value;
  }

  encodeCBOR(gen) {
    return gen.pushAny(this.value);
  }

  decodeCBOR() {
    return this.value;
  }
}
