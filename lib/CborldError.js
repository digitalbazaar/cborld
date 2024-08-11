/*!
 * Copyright (c) 2020-2024 Digital Bazaar, Inc. All rights reserved.
 */
export class CborldError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    // backwards compatibility, `this.value`
    this.value = code;
    this.stack = (new Error(`${code}: ${message}`)).stack;
    this.name = this.constructor.name;
  }
}
