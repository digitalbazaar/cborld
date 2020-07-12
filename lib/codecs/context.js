/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */

export function contextCodec() {
  this.encode = function(value) {
    return value;
  };
  this.decode = function(value) {
    return value;
  };
}
