/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
export class CborldEncoder {
  encode() {
    throw new Error('Must be implemented by derived class.');
  }

  // eslint-disable-next-line no-unused-vars
  static match({def, value} = {}) {
    throw new Error('Must be implemented by derived class.');
  }
}
