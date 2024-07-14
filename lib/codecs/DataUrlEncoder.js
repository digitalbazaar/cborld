/*!
 * Copyright (c) 2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Token, Type} from 'cborg';
import {Base64} from 'js-base64';
import {CborldEncoder} from './CborldEncoder.js';
import {URL_SCHEME_TABLE} from '../tables.js';

/*
Data URL codec for base64 data.

References:
https://www.rfc-editor.org/rfc/rfc2397
https://fetch.spec.whatwg.org/#data-urls
https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs

Data URL format:
data:[<mediatype>][;base64],<data>

This codec must be able to round-trip the data. The parsing is minimal and
designed to only binary encode well-formed base64 data that can be decoded to
the same input. The mediatype (with optional parameters) is stored as-is, with
the exception of ";base64" if correct base64 encoding is detected. In the case
of a non-base64 data URI, all but the "data:" prefix is encoded as a string.

base64 encoding: [string, data]
non-base64 encoding: [string]

TODO: An optimization could use a registry of well-known base mediatypes (ie,
image/png, text/plain, etc).
*/

// base64 data uri regex
// when using this, use round trip code to ensure decoder will work
const DATA_BASE64_REGEX = /^data:(?<mediatype>.*);base64,(?<data>.*)$/;

export class DataUrlEncoder extends CborldEncoder {
  constructor({value, base64} = {}) {
    super();
    this.value = value;
    this.base64 = base64;
  }

  encode() {
    const {value, base64} = this;

    const entries = [new Token(Type.uint, URL_SCHEME_TABLE.get('data:'))];

    if(base64) {
      // base64 mode
      // [string, bytes]
      const parsed = DATA_BASE64_REGEX.exec(value);
      entries.push(
        new Token(Type.string, parsed.groups.mediatype));
      entries.push(
        new Token(Type.bytes, Base64.toUint8Array(parsed.groups.data)));
    } else {
      // non-base64 mode
      // [string]
      entries.push(
        new Token(Type.string, value.slice('data:'.length)));
    }

    return [new Token(Type.array, entries.length), entries];
  }

  static createEncoder({value} = {}) {
    // quick check
    if(!value.startsWith('data:')) {
      return;
    }
    // attempt to parse as a base64
    const parsed = DATA_BASE64_REGEX.exec(value);
    if(parsed) {
      // check to ensure data can be restored
      // this avoids issues with variations in encoding
      const data = parsed.groups.data;
      if(data === Base64.fromUint8Array(Base64.toUint8Array(data))) {
        return new DataUrlEncoder({value, base64: true});
      }
    }
    return new DataUrlEncoder({value, base64: false});
  }
}
