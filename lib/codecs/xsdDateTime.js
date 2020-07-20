/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
export class XsdDateTimeCodec {
  constructor() {
  }

  set({value}) {
    this.value = value;
  }

  encodeCBOR(gen) {
    const encodedValue = new Date(this.value).valueOf() / 1000;
    return gen.pushAny(encodedValue);
  }

  decodeCBOR() {
    const decodedValue = new Date(this.value * 1000);
    return decodedValue.toISOString().replace('.000Z', 'Z');
  }
}
