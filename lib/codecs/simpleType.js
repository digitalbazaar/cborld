/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export function simpleTypeCodec() {
  this.encode = function(value) {
    return value;
  };
  this.decode = function(value) {
    return value;
  };
}
