/*!
* Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
*/

/**
 * Mock test utility for testing out custom codecs.
 */
export class MockEncoder {
  constructor() {
    this.result;
  }

  pushAny(value) {
    this.result = value;
  }
}
