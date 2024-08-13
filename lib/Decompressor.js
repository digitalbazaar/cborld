/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {KEYWORDS_TABLE, reverseMap} from './tables.js';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {ContextLoader} from './ContextLoader.js';
import {Transformer} from './Transformer.js';
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
    this.transformer = new Transformer({
      strategy: this,
      contextLoader: new ContextLoader({
        buildReverseMap: true, documentLoader
      }),
      typeTable,
      legacy
    });

    // build reverse compression tables, the `typeTable` is a map of maps,
    // just reverse each inner map
    const reverseTypeTable = new Map();
    if(typeTable) {
      for(const [k, map] of typeTable) {
        reverseTypeTable.set(k, reverseMap(map));
      }
    }
    // FIXME: expose differently
    this.transformer.reverseTypeTable = reverseTypeTable;
  }

  /**
   * Decompresses the given CBOR-LD byte array to a JSON-LD document.
   *
   * @param {object} options - The options to use.
   * @param {Map|Array} options.transformMap - The transform map(s) to
   *   convert CBOR-LD to JSON-LD.
   *
   * @returns {Promise<object>} - The JSON-LD document.
   */
  async decompress({transformMap} = {}) {
    // FIXME: reorg to work like this:
    // new Converter({strategy: new Decompressor()})
    // const output = await converter.convert({input});
    return this.transformer.convert({input: transformMap});
  }

  _getEntries({activeCtx, input: transformMap}) {
    // get term entries to be transformed and sort by *term* to ensure term
    // IDs will be assigned in the same order that the compressor assigned them
    const entries = [];
    for(const [key, value] of transformMap) {
      // skip `@context`; not a term entry
      if(key === CONTEXT_TERM_ID || key === CONTEXT_TERM_ID_PLURAL) {
        continue;
      }
      const {term, termId, plural, def} = activeCtx.getTermInfo({id: key});
      entries.push([{term, termId, plural, def}, value]);
    }
    return entries.sort(_sortEntriesByTerm);
  }

  _getObjectTypes({activeCtx, input: transformMap}) {
    const objectTypes = new Set();
    // must decode object types to get their original values
    const {transformer} = this;
    const typeTerms = activeCtx.getTypeTerms();
    for(const typeTerm of typeTerms) {
      // check for encoded singular and plural term IDs
      const termId = activeCtx.getIdForTerm({term: typeTerm});
      let value = transformMap.get(termId) ?? transformMap.get(termId + 1);
      if(value === undefined) {
        // encoded type term is not present in payload
        continue;
      }
      // decode each value associated with the type term
      const termInfo = activeCtx.getTermInfo({id: termId});
      value = Array.isArray(value) ? value : [value];
      value.forEach(value => {
        const decoder = ValueDecoder.createDecoder({
          value, transformer, termInfo, termType: '@vocab'
        });
        objectTypes.add(decoder?.decode({value}) ?? value);
      });
    }
    return objectTypes;
  }

  async _transformContexts({activeCtx, input: transformMap, output: obj}) {
    const {transformer} = this;

    // decode `@context` for `transformMap`, if any
    const encodedContext = transformMap.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      const decoder = ContextDecoder.createDecoder({
        value: encodedContext, transformer
      });
      obj['@context'] = decoder?.decode({value: encodedContext}) ??
        encodedContext;
    }
    const encodedContexts = transformMap.get(CONTEXT_TERM_ID_PLURAL);
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
        const decoder = ContextDecoder.createDecoder({
          value, transformer
        });
        contexts.push(decoder ? decoder.decode({value}) : value);
      }
      obj['@context'] = contexts;
    }

    return activeCtx.applyEmbeddedContexts({obj});
  }

  _transformValue({outputs, termType, value, termInfo}) {
    if(value instanceof Map) {
      return;
    }
    const {transformer} = this;
    const decoder = ValueDecoder.createDecoder({
      value, transformer, termInfo, termType
    });
    if(decoder) {
      outputs.push(decoder.decode({value}));
      return true;
    }
  }

  _createNewOutput() {
    return {};
  }

  _addOutputEntry({termInfo, values, output: obj}) {
    obj[termInfo.term] = values;
  }
}

function _sortEntriesByTerm([{term: t1}], [{term: t2}]) {
  return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
