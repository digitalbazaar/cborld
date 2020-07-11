/*!
* Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
*/

import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
chai.use(chaiBytes);
global.should = chai.should();

import {
  encode,
  decode
} from '..';

describe('cborld', () => {
  describe('encode', () => {
    it('should encode a simple JSON-LD Document', async () => {
    });
  });
  describe('decode', () => {
    it('should decode simple CBOR-LD bytes', async () => {
    });
  });
});
