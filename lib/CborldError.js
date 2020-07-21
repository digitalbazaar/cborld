/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
export class CborldError extends Error {
  constructor(value, message) {
    super();
    this.message = message;
    this.value = value;
    this.stack = (new Error(`${value}: ${message}`)).stack;
    this.name = this.constructor.name;
  }
}
