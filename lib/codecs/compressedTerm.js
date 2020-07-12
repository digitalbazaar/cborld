/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export function compressedTermCodec() {
  this.encode = function(value) {
    return value;
  };
  this.decode = function(value) {
    return value;
  };
}
