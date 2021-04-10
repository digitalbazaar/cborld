/*!
* Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
*/
// import {
//   expect
// } from 'chai';
// import {XsdDateTimeEncoder} from '../lib/codecs/XsdDateTimeCodec';

describe.skip('XsdDateTimeCodec', () => {
  /*
  it('should roundtrip encode-decode successfully', async () => {
    const input = '2020-07-14T19:23:24Z';
    const mockEncoder = new MockEncoder();

    const encoderCodec = new XsdDateTimeCodec();
    encoderCodec.set({value: input});
    encoderCodec.encodeCBOR(mockEncoder);

    const decoderCodec = new XsdDateTimeCodec();
    decoderCodec.set({value: mockEncoder.result});
    const decodedResult = decoderCodec.decodeCBOR();

    expect(input).equal(decodedResult);
  });

  it('should throw exception when input missing time component', async () => {
    const input = '2020-07-14';
    const mockEncoder = new MockEncoder();

    const encoderCodec = new XsdDateTimeCodec();
    encoderCodec.set({value: input});
    expect(() => encoderCodec.encodeCBOR(mockEncoder))
      .to
      .throw('Invalid input, date missing time component');
  });

  it('should throw exception when input is not a date string', async () => {
    const input = 'bad';
    const mockEncoder = new MockEncoder();

    const encoderCodec = new XsdDateTimeCodec();
    encoderCodec.set({value: input});
    expect(() => encoderCodec.encodeCBOR(mockEncoder))
      .to
      .throw('Invalid input, could not parse value as date');
  });

  it('should throw exception when input is an empty string', async () => {
    const input = '';
    const mockEncoder = new MockEncoder();

    const encoderCodec = new XsdDateTimeCodec();
    encoderCodec.set({value: input});
    expect(() => encoderCodec.encodeCBOR(mockEncoder))
      .to
      .throw('Invalid input, could not parse value as date');
  });

  it('should throw exception when input is not valid value type', async () => {
    const input = true;
    const mockEncoder = new MockEncoder();

    const encoderCodec = new XsdDateTimeCodec();
    encoderCodec.set({value: input});
    expect(() => encoderCodec.encodeCBOR(mockEncoder))
      .to
      .throw('Invalid input, expected value to be of type string');
  });
  */
});
