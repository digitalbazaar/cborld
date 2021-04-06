/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
export class CborldDecoder {
  // eslint-disable-next-line no-unused-vars
  encode({obj}) {
    throw new Error('Must be implemented by derived class.');
  }

  // eslint-disable-next-line no-unused-vars
  static createDecoder({encoded, idToTerm} = {}) {
    throw new Error('Must be implemented by derived class.');
  }
}
