/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {KEYWORDS_TABLE} from './tables.js';
import {ValueEncoder} from './codecs/ValueEncoder.js';

const CONTEXT_TERM_ID = KEYWORDS_TABLE.get('@context');
const CONTEXT_TERM_ID_PLURAL = CONTEXT_TERM_ID + 1;

export class Compressor {
  /**
   * Creates a new Compressor for generating compressed CBOR-LD from a
   * JSON-LD document. The created instance may only be used on a single
   * JSON-LD document at a time.
   *
   * @param {object} options - The options to use.
   * @param {Map} options.typeTable - A map of possible value types, including
   *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
   *   another map of values of that type to their associated CBOR-LD integer
   *   values.
   */
  constructor({typeTable} = {}) {
    this.typeTable = typeTable;
  }

  addOutputEntry({termInfo, values, output}) {
    output.set(termInfo.termId, values);
  }

  async convertContexts({activeCtx, input: obj, output}) {
    activeCtx = activeCtx.applyEmbeddedContexts({obj});

    // if no `@context` is present, return early
    const context = obj['@context'];
    if(!context) {
      return activeCtx;
    }

    // encode `@context`...
    const {typeTable} = this;
    const encodedContexts = [];
    const isArray = Array.isArray(context);
    const contexts = isArray ? context : [context];
    for(const value of contexts) {
      const encoder = ContextEncoder.createEncoder({value, typeTable});
      encodedContexts.push(encoder || value);
    }
    const id = isArray ? CONTEXT_TERM_ID_PLURAL : CONTEXT_TERM_ID;
    output.set(id, isArray ? encodedContexts : encodedContexts[0]);

    return activeCtx;
  }

  convertValue({termType, value, termInfo, converter}) {
    if(typeof value === 'object') {
      return;
    }
    return ValueEncoder.createEncoder({value, converter, termInfo, termType});
  }

  createNewOutput() {
    return new Map();
  }

  getInputEntries({activeCtx, input}) {
    // get input entries to be converted and sort by *term* to ensure term
    // IDs will be assigned in the same order that the decompressor will
    const entries = [];
    const keys = Object.keys(input).sort();
    for(const key of keys) {
      // skip `@context`; context already converted early
      if(key === '@context') {
        continue;
      }
      // create term info
      const value = input[key];
      const plural = Array.isArray(value);
      const termId = activeCtx.getIdForTerm({term: key, plural});
      const def = activeCtx.getTermDefinition({term: key});
      entries.push([{term: key, termId, plural, def}, value]);
    }
    return entries;
  }

  getObjectTypes({activeCtx, input}) {
    const objectTypes = new Set();
    const typeTerms = activeCtx.getTypeTerms();
    for(const term of typeTerms) {
      const types = input[term];
      if(types !== undefined) {
        if(Array.isArray(types)) {
          types.forEach(objectTypes.add, objectTypes);
        } else {
          objectTypes.add(types);
        }
      }
    }
    return objectTypes;
  }
}
