/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {Base58DidUrlEncoder} from './Base58DidUrlEncoder.js';
import {CborldEncoder} from './CborldEncoder.js';
import {DataUrlEncoder} from './DataUrlEncoder.js';
import {HttpUrlEncoder} from './HttpUrlEncoder.js';
import {UuidUrnEncoder} from './UuidUrnEncoder.js';

// an encoded URL is an array with the first element being an integer that
// signals which encoder was used:
// `0` reserved
// `1` http
// `2` https
// `3` urn:uuid
// `4` data (RFC 2397)
// `1024` did:v1:nym
// `1025` did:key
const SCHEME_TO_ENCODER = new Map([
  ['http', HttpUrlEncoder],
  ['https', HttpUrlEncoder],
  ['urn:uuid', UuidUrnEncoder],
  ['data', DataUrlEncoder],
  ['did:v1:nym', Base58DidUrlEncoder],
  ['did:key', Base58DidUrlEncoder]
]);

export class UrlEncoder extends CborldEncoder {
  constructor({termId} = {}) {
    super();
    this.termId = termId;
  }

  encode() {
    return new Token(Type.uint, this.termId);
  }

  static createEncoder({value, transformer} = {}) {
    // see if a term ID exists that matches the value first
    const termId = transformer.contextLoader.getIdForTerm({term: value});
    if(typeof termId !== 'string') {
      return new UrlEncoder({termId});
    }

    // check URI prefix codecs
    // get full colon-delimited prefix
    let scheme;
    try {
      // this handles URIs both with authority followed by `//` and without
      const {protocol, pathname} = new URL(value);
      scheme = protocol;
      if(pathname.includes(':')) {
        scheme += pathname;
      }
      const split = value.split(':');
      split.pop();
      scheme = split.join(':');
    } catch(e) {
      return;
    }

    const EncoderClass = SCHEME_TO_ENCODER.get(scheme);
    return EncoderClass && EncoderClass.createEncoder({value, transformer});
  }
}
