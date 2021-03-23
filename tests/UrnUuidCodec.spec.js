/*!
* Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
*/
import {expect} from 'chai';
import {UrnUuidCodec} from '../lib/codecs/UrlCodec';

describe('UrnUuidCodec', () => {
  it('should error if value does not start with "urn:uuid:"', async () => {
    const value = 'not:urn:uuid:c828c352-cb59-4ca9-b769-6a6a91008730';
    const encoderCodec = new UrnUuidCodec();
    let err;
    try {
      encoderCodec.encode(value);
    } catch(e) {
      err = e;
    }
    expect(err.message).equal('Invalid value, does not start with "urn:uuid".');
  });
  it('should roundtrip encode-decode successfully if uuid has' +
  'all lowercase chars', async () => {
    const value = 'urn:uuid:c828c352-cb59-4ca9-b769-6a6a91008730';
    const encoderCodec = new UrnUuidCodec();

    const encoded = encoderCodec.encode(value);

    const decoded = encoderCodec.decode(encoded);

    expect(decoded).equal(value);
  });
  it('should not encode if uuid has one or more uppercase chars', async () => {
    const value = 'urn:uuid:C828C352-CB59-4CA9-B769-6A6A91008730';
    const encoderCodec = new UrnUuidCodec();

    const encoded = encoderCodec.encode(value);
    expect(encoded).equal(value);
  });

});
