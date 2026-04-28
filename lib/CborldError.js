/*!
 * Copyright (c) 2020-2026 Digital Bazaar, Inc.
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
