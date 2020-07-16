/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export class XsdDateTimeCodec {
  constructor() {
  }

  set({value}) {
    this.value = value;
    this.encodedValue = new Date(value).valueOf() / 1000;
  }

  encodeCBOR(gen) {
    return gen.pushAny(this.encodedValue);
  }
}
