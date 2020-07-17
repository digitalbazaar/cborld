/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import * as b58 from 'base58-universal';

export class UrlCodec {
  constructor() {}

  set({value, termCodingMap}) {
    this.value = value;
    this.termCodingMap = termCodingMap;
  }

  encodeCBOR(gen) {
    let encodedValue = this.value;

    if(Array.isArray(this.value)) {
      encodedValue = this.value.map(
        element => _encodeUrl(element, this.termCodingMap));
    } else if(typeof this.value !== 'object') {
      encodedValue = _encodeUrl(this.value, this.termCodingMap);
    }

    return gen.pushAny(encodedValue);
  }
}

/******** Helper classes/functions to aid with _encodeUrl *****************/

// URL prefix compression map
const urlHeaders = new Map();
urlHeaders.set('http://', 1);
urlHeaders.set('https://', 2);
urlHeaders.set('did:v1:nym', 1024);
urlHeaders.set('did:key', 1025);

// Base58 DID URL compression class
const b58urlRegex =
  /(did:.*)?:z([1-9A-HJ-NP-Za-km-z]+)?#{0,1}z{0,1}([1-9A-HJ-NP-Za-km-z]+)?/g;
export class Base58DidUrlCodec {
  encode(value) {
    // break the base58 DID URL into segments
    const matches = Array.from(value.matchAll(b58urlRegex));
    const match = matches[0];

    // encode the DID URL segments
    const encodedUrl = (urlHeaders.has(match[1])) ? urlHeaders.get(match[1]) :
      match[1];
    const encodedDid = b58.decode(match[2]);
    const encodedFragment = (match[3]) ? b58.decode(match[3]) : undefined;

    // construct the encoded URL array
    const encodedValue = [encodedUrl, encodedDid];
    if(encodedFragment) {
      encodedValue.push(encodedFragment);
    }
    return encodedValue;
  }
}

// URL prefix detection to map prefix to encoding/decoding class
const urlEncoders = new Array();
urlEncoders.push([/did:v1:nym:z/, Base58DidUrlCodec]);
urlEncoders.push([/did:key:z/, Base58DidUrlCodec]);

// encodes a URL given a term coding map
function _encodeUrl(url, termCodingMap) {
  // determine if a compression value exists in the term coding map
  if(termCodingMap[url]) {
    return termCodingMap[url].compressedTerm;
  }

  // attempt to use more general URL encoders
  let encodedValue = url;
  const encoders = urlEncoders.filter(element => url.match(element[0]));
  if(encoders.length === 1) {
    const codec = new encoders[0][1];
    encodedValue = codec.encode(url);
  }

  return encodedValue;
}
