/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {KEYWORDS_TABLE, reverseMap} from './tables.js';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {ValueDecoder} from './codecs/ValueDecoder.js';

const CONTEXT_TERM_ID = KEYWORDS_TABLE.get('@context');
const CONTEXT_TERM_ID_PLURAL = CONTEXT_TERM_ID + 1;

export class Decompressor {
  /**
   * Creates a new Decompressor for generating a JSON-LD document from
   * compressed CBOR-LD. The created instance may only be used on a single
   * CBOR-LD input at a time.
   *
   * @param {object} options - The options to use.
   * @param {Map} options.typeTable - A map of possible value types, including
   *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
   *   another map of values of that type to their associated CBOR-LD integer
   *   values.
   */
  constructor({typeTable} = {}) {
    this.typeTable = typeTable;

    // build reverse compression tables, the `typeTable` is a map of maps,
    // just reverse each inner map
    const reverseTypeTable = new Map();
    if(typeTable) {
      for(const [k, map] of typeTable) {
        reverseTypeTable.set(k, reverseMap(map));
      }
    }
    this.reverseTypeTable = reverseTypeTable;
  }

  addOutputEntry({termInfo, values, output}) {
    output[termInfo.term] = values;
  }

  async convertContexts({activeCtx, input, output}) {
    const {reverseTypeTable} = this;
    const decoder = ContextDecoder.createDecoder({reverseTypeTable});

    // decode `@context` in `input`, if any
    const encodedContext = input.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      output['@context'] = decoder.decode({value: encodedContext});
    }
    const encodedContexts = input.get(CONTEXT_TERM_ID_PLURAL);
    if(encodedContexts) {
      if(encodedContext) {
        // can't use *both* the singular and plural context term ID
        throw new CborldError(
          'ERR_INVALID_ENCODED_CONTEXT',
          'Both singular and plural context IDs were found in the ' +
          'CBOR-LD input.');
      }
      if(!Array.isArray(encodedContexts)) {
        // `encodedContexts` must be an array
        throw new CborldError(
          'ERR_INVALID_ENCODED_CONTEXT',
          'Encoded plural context value must be an array.');
      }
      const contexts = [];
      for(const value of encodedContexts) {
        contexts.push(decoder.decode({value}));
      }
      output['@context'] = contexts;
    }

    return activeCtx.applyEmbeddedContexts({obj: output});
  }

  convertValue({termType, value, termInfo}) {
    if(value instanceof Map) {
      return;
    }
    const {converter} = this;
    const decoder = ValueDecoder.createDecoder({
      value, converter, termInfo, termType
    });
    return decoder?.decode({value});
  }

  createNewOutput() {
    return {};
  }

  getInputEntries({activeCtx, input}) {
    // get input entries to be converted and sort by *term* to ensure term
    // IDs will be assigned in the same order that the compressor assigned them
    const entries = [];
    for(const [key, value] of input) {
      // skip `@context`; convert already converted early
      if(key === CONTEXT_TERM_ID || key === CONTEXT_TERM_ID_PLURAL) {
        continue;
      }
      const {term, termId, plural, def} = activeCtx.getTermInfo({id: key});
      entries.push([{term, termId, plural, def}, value]);
    }
    return entries.sort(_sortEntriesByTerm);
  }

  getObjectTypes({activeCtx, input}) {
    const objectTypes = new Set();
    // must decode object types to get their original values
    const {converter} = this;
    const typeTerms = activeCtx.getTypeTerms();
    for(const typeTerm of typeTerms) {
      // check for encoded singular and plural term IDs
      const termId = activeCtx.getIdForTerm({term: typeTerm});
      let value = input.get(termId) ?? input.get(termId + 1);
      if(value === undefined) {
        // encoded type term is not present in payload
        continue;
      }
      // decode each value associated with the type term
      const termInfo = activeCtx.getTermInfo({id: termId});
      value = Array.isArray(value) ? value : [value];
      value.forEach(value => {
        const decoder = ValueDecoder.createDecoder({
          value, converter, termInfo, termType: '@vocab'
        });
        objectTypes.add(decoder?.decode({value}) ?? value);
      });
    }
    return objectTypes;
  }
}

function _sortEntriesByTerm([{term: t1}], [{term: t2}]) {
  return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;
}
