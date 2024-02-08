/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {AppUrlEncoder} from './AppUrlEncoder.js';
import {Base58DidUrlEncoder} from './Base58DidUrlEncoder.js';
import {CborldEncoder} from './CborldEncoder.js';
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
  static createEncoder({value, transformer} = {}) {
    if(typeof value !== 'string') {
      return false;
    }

    const {appContextMap} = transformer;
    if(appContextMap.has(value)) {
      return AppUrlEncoder.createEncoder({value, transformer});
    }

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
      return false;
    }

    const EncoderClass = SCHEME_TO_ENCODER.get(scheme);
    return EncoderClass && EncoderClass.createEncoder({value});
  }
}
