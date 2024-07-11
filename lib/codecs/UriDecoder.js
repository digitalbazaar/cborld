/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {Base58DidUrlDecoder} from './Base58DidUrlDecoder.js';
import {CborldDecoder} from './CborldDecoder.js';
import {DataUrlDecoder} from './DataUrlDecoder.js';
import {HttpUrlDecoder} from './HttpUrlDecoder.js';
import {UuidUrnDecoder} from './UuidUrnDecoder.js';
import {VocabTermDecoder} from './VocabTermDecoder.js';

const SCHEME_ID_TO_DECODER = new Map([
  ['http://', HttpUrlDecoder],
  ['https://', HttpUrlDecoder],
  ['urn:uuid:', UuidUrnDecoder],
  ['data:', DataUrlDecoder],
  ['did:v1:nym:', Base58DidUrlDecoder],
  ['did:key:', Base58DidUrlDecoder]
]);

export class UriDecoder extends CborldDecoder {
  static createDecoder({value, transformer} = {}) {
    if(!(Array.isArray(value) || value.length > 1)) {
      if(transformer.reverseStringTable.has(value) || transformer.idToTerm.has(value)){
        return VocabTermDecoder.createDecoder({value, transformer});
      }
      return false;
    }

    const DecoderClass = SCHEME_ID_TO_DECODER.get(transformer.reverseUrlSchemeTable.get(value[0]));
    return DecoderClass && DecoderClass.createDecoder({value, transformer});
  }
}
