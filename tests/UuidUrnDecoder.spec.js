/*!
* Copyright (c) 2021-2026 Digital Bazaar, Inc.
*/
import {expect} from 'chai';
import {UuidUrnDecoder} from '../lib/codecs/UuidUrnDecoder.js';

describe('UuidUrnDecoder', () => {
  it('should not create an instance if value is an array with length != 2',
    async () => {
      const value = [];
      const decoder = UuidUrnDecoder.createDecoder({value});
      expect(decoder).to.be.undefined;
    });

  // FIXME: add more tests
});
