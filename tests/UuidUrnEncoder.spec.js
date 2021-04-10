/*!
* Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
*/
import {expect} from 'chai';
import {UuidUrnEncoder} from '../lib/codecs/UuidUrnEncoder.js';

describe('UuidUrnEncoder', () => {
  it('should not create an instance if value does not start with "urn:uuid:"',
    async () => {
      const value = 'not:urn:uuid:c828c352-cb59-4ca9-b769-6a6a91008730';
      const encoder = UuidUrnEncoder.createEncoder({value});
      expect(encoder).to.be.undefined;
    });

  it('should create an instance if value starts with "urn:uuid:"', async () => {
    const value = 'urn:uuid:c828c352-cb59-4ca9-b769-6a6a91008730';
    const encoder = UuidUrnEncoder.createEncoder({value});
    expect(encoder).to.be.instanceOf(UuidUrnEncoder);
  });

  // FIXME: add more tests
});
