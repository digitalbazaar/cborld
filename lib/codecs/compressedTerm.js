/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export class CompressedTermCodec {
  constructor() {
  }

  set(value, codingMap) {
    this.value = value;
    this.codingMap = codingMap;
  }

  encodeCBOR(gen) {
    let encodedValue = this.value;

    if(Array.isArray(this.value)) {
      encodedValue = this.value.map(
        element => (this.codingMap[element].compressedTerm) ?
          this.codingMap[element].compressedTerm : element);
    } else if(typeof this.value !== 'object') {
      encodedValue = (this.codingMap[this.value]) ?
        this.codingMap[this.value].compressedTerm : this.value;
    }

    return gen.pushAny(encodedValue);
  }
}
