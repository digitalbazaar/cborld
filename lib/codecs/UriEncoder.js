/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldEncoder} from './CborldEncoder.js';
import {Base58DidUrlEncoder} from './Base58DidUrlEncoder.js';
import {HttpUrlEncoder} from './HttpUrlEncoder.js';
import {UuidUrnEncoder} from './UuidUrnEncoder.js';

const SCHEME_TO_ENCODER = new Map([
  ['http', HttpUrlEncoder],
  ['https', HttpUrlEncoder],
  ['urn:uuid', UuidUrnEncoder],
  ['did:v1:nym', Base58DidUrlEncoder],
  ['did:key', Base58DidUrlEncoder]
]);

export class UriEncoder extends CborldEncoder {
  constructor({value} = {}) {
    super();
    this.value = value;
  }

  encode() {
    throw new Error('A URI-scheme-specific encoder must be used.');
  }

  static createEncoder({value} = {}) {
    if(typeof value !== 'string') {
      return false;
    }

    // get full colon-delimited prefix
    let scheme;
    try {
      // must handle URIs both with authority followed by `//` and without
      const {protocol, pathname} = new URL(value);
      scheme = protocol;
      if(pathname.includes(':')) {
        scheme += pathname;
      }
      const split = value.split(':');
      split.pop();
      scheme = split.join(':');
    } catch(e) {
      return false;
    }

    const EncoderClass = SCHEME_TO_ENCODER.get(scheme);
    console.log('UriEncoder EncoderClass', EncoderClass);
    return EncoderClass && EncoderClass.createEncoder({value});
  }
}
