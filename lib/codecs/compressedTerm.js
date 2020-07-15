/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export class CompressedTermCodec {
  constructor() {
  }

  set({value, termCodingMap}) {
    this.value = value;
    this.termCodingMap = termCodingMap;
  }

  encodeCBOR(gen) {
    let encodedValue = this.value;

    if(Array.isArray(this.value)) {
      encodedValue = this.value.map(
        element => (this.termCodingMap[element].compressedTerm) ?
          this.termCodingMap[element].compressedTerm : element);
    } else if(typeof this.value !== 'object') {
      encodedValue = (this.termCodingMap[this.value]) ?
        this.termCodingMap[this.value].compressedTerm : this.value;
    }

    return gen.pushAny(encodedValue);
  }
}
