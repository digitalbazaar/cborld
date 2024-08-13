/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {ContextLoader} from './ContextLoader.js';
import {Converter} from './Converter.js';
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
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {Map} options.typeTable - A map of possible value types, including
   *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
   *   another map of values of that type to their associated CBOR-LD integer
   *   values.
   * @param {boolean} [options.legacy=false] - True if legacy mode is in
   *   effect, false if not.
   */
  constructor({documentLoader, typeTable, legacy = false} = {}) {
    this.converter = new Converter({
      strategy: this,
      contextLoader: new ContextLoader({documentLoader}),
      typeTable,
      legacy
    });
  }

  /**
   * Compresses the given JSON-LD document into a CBOR-LD byte array of
   * compressed bytes that should follow the compressed CBOR-LD CBOR tag.
   *
   * @param {object} options - The options to use.
   * @param {object} options.jsonldDocument - The JSON-LD Document to convert
   *   to CBOR-LD bytes.
   *
   * @returns {Map|Array} - The element expressing abstract CBOR-LD.
   */
  async compress({jsonldDocument} = {}) {
    // FIXME: reorg to work like this:
    // new Converter({strategy: new Decompressor()})
    // const output = await converter.convert({input});
    return this.converter.convert({input: jsonldDocument});
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
    const {converter} = this;
    const encodedContexts = [];
    const isArray = Array.isArray(context);
    const contexts = isArray ? context : [context];
    for(const value of contexts) {
      const encoder = ContextEncoder.createEncoder({value, converter});
      encodedContexts.push(encoder || value);
    }
    const id = isArray ? CONTEXT_TERM_ID_PLURAL : CONTEXT_TERM_ID;
    output.set(id, isArray ? encodedContexts : encodedContexts[0]);

    return activeCtx;
  }

  convertValue({termType, value, termInfo}) {
    if(typeof value === 'object') {
      return;
    }
    const {converter} = this;
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

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
