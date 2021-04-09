/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
export class CborldDecoder {
  // eslint-disable-next-line no-unused-vars
  decode({value} = {}) {
    throw new Error('Must be implemented by derived class.');
  }

  // eslint-disable-next-line no-unused-vars
  static createDecoder({value, transformer} = {}) {
    throw new Error('Must be implemented by derived class.');
  }
}
