/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldDecoder} from './CborldDecoder.js';
import {Base58DidUrlDecoder} from './Base58DidUrlDecoder.js';
import {HttpUrlDecoder} from './HttpUrlDecoder.js';
import {UuidUrnDecoder} from './UuidUrnDecoder.js';

const SCHEME_ID_TO_DECODER = new Map([
  [0, HttpUrlDecoder],
  [1, HttpUrlDecoder],
  [2, UuidUrnDecoder],
  [1024, Base58DidUrlDecoder],
  [1025, Base58DidUrlDecoder]
]);

export class UriDecoder extends CborldDecoder {
  static createDecoder({value} = {}) {
    if(!(Array.isArray(value) || value.length > 1)) {
      return false;
    }

    const DecoderClass = SCHEME_ID_TO_DECODER.get(value[0]);
    return DecoderClass && DecoderClass.createDecoder({value});
  }
}
