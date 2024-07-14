/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {Base58DidUrlDecoder} from './Base58DidUrlDecoder.js';
import {CborldDecoder} from './CborldDecoder.js';
import {CborldError} from '../CborldError.js';
import {DataUrlDecoder} from './DataUrlDecoder.js';
import {HttpUrlDecoder} from './HttpUrlDecoder.js';
import {REVERSE_URL_SCHEME_TABLE} from '../tables.js';
import {UuidUrnDecoder} from './UuidUrnDecoder.js';

const SCHEME_ID_TO_DECODER = new Map([
  ['http://', HttpUrlDecoder],
  ['https://', HttpUrlDecoder],
  ['urn:uuid:', UuidUrnDecoder],
  ['data:', DataUrlDecoder],
  ['did:v1:nym:', Base58DidUrlDecoder],
  ['did:key:', Base58DidUrlDecoder]
]);

export class UrlDecoder extends CborldDecoder {
  constructor({term} = {}) {
    super();
    this.term = term;
  }

  decode() {
    return this.term;
  }

  static createDecoder({value, transformer} = {}) {
    // pass uncompressed URL values through
    if(typeof value === 'string') {
      return;
    }
    if(Array.isArray(value)) {
      const DecoderClass = SCHEME_ID_TO_DECODER.get(
        REVERSE_URL_SCHEME_TABLE.get(value[0]));
      const decoder = DecoderClass?.createDecoder({value, transformer});
      if(!decoder) {
        throw new CborldError(
          'ERR_UNKNOWN_COMPRESSED_VALUE',
          `Unknown compressed URL "${value}".`);
      }
      return decoder;
    }
    const term = transformer.idToTerm.get(value);
    if(term === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_COMPRESSED_VALUE',
        `Unknown compressed URL "${value}".`);
    }
    return new UrlDecoder({term});
  }
}
