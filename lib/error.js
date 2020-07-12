/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export function CborldError(value, message) {
  this.value = value;
  this.message = message;
  this.toString = function() {
    return 'CBOR-LD Error(' + this.value + '): ' + this.message;
  };
}
