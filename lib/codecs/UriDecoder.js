/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {AppUrlDecoder} from './AppUrlDecoder.js';
import {Base58DidUrlDecoder} from './Base58DidUrlDecoder.js';
import {CborldDecoder} from './CborldDecoder.js';
import {HttpUrlDecoder} from './HttpUrlDecoder.js';
import {UuidUrnDecoder} from './UuidUrnDecoder.js';

const SCHEME_ID_TO_DECODER = new Map([
  [1, HttpUrlDecoder],
  [2, HttpUrlDecoder],
  [3, UuidUrnDecoder],
  [1024, Base58DidUrlDecoder],
  [1025, Base58DidUrlDecoder],
  // FIXME: encdeds as 3 bytes, may want to use a lower id
  [1026, AppUrlDecoder]
]);

export class UriDecoder extends CborldDecoder {
  static createDecoder({value, transformer} = {}) {
    if(!(Array.isArray(value) || value.length > 1)) {
      return false;
    }

    const DecoderClass = SCHEME_ID_TO_DECODER.get(value[0]);
    return DecoderClass && DecoderClass.createDecoder({value, transformer});
  }
}
