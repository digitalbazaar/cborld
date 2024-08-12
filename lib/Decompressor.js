/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {KEYWORDS_TABLE, reverseMap} from './tables.js';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {ContextProcessor} from './ContextProcessor.js';
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
      contextProcessor: new ContextProcessor({
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
    // handle single or multiple JSON-LD docs
    const results = [];
    const isArray = Array.isArray(transformMap);
    const transformMaps = isArray ? transformMap : [transformMap];
    for(const transformMap of transformMaps) {
      const obj = {};
      await this.transformer._transform({obj, transformMap});
      results.push(obj);
    }
    return isArray ? results : results[0];
  }

  _getEntries({transformMap, termMap}) {
    // get term entries to be transformed and sort by *term* to ensure term
    // IDs will be assigned in the same order that the compressor assigned them
    const entries = [];
    const {transformer: {contextProcessor}} = this;
    for(const [key, value] of transformMap) {
      // skip `@context`; not a term entry
      if(key === CONTEXT_TERM_ID || key === CONTEXT_TERM_ID_PLURAL) {
        continue;
      }

      // check for undefined term IDs
      const {term, plural} = contextProcessor.getTermForId({id: key});
      if(term === undefined) {
        throw new CborldError(
          'ERR_UNKNOWN_CBORLD_TERM_ID',
          `Unknown term ID '${key}' was detected in the CBOR-LD input.`);
      }

      // check for undefined terms
      let def = termMap.get(term);
      if(def === undefined) {
        /* DO NOT DELETE - might be needed for debug purposes
        if(!(term.startsWith('@') && KEYWORDS_TABLE.has(term))) {
          throw new CborldError(
            'ERR_UNKNOWN_CBORLD_TERM',
            `Unknown term '${term}' was detected in the JSON-LD input.`);

        }
        */
        def = {};
      }

      entries.push([{term, termId: key, plural, def}, value]);
    }
    return entries.sort(_sortEntriesByTerm);
  }

  _getObjectTypes({transformMap, activeCtx}) {
    const objectTypes = new Set();
    // must decode object types to get their original values
    const {transformer} = this;
    const {termMap} = activeCtx;
    const {termToId} = transformer.contextProcessor;
    // FIXME: use activeCtx.getTypeTerms();
    const typeTerms = ['@type', ...activeCtx.typeAliases];
    for(const typeTerm of typeTerms) {
      // check for encoded singular and plural term IDs
      const termId = termToId.get(typeTerm);
      let value = transformMap.get(termId) ?? transformMap.get(termId + 1);
      if(value === undefined) {
        // encoded type term is not present
        continue;
      }
      // decode each value associated with the type term
      const termInfo = this._getTermInfo({termMap, key: termId});
      value = Array.isArray(value) ? value : [value];
      value.forEach(value => {
        const decoder = ValueDecoder.createDecoder(
          {value, transformer, termInfo, termType: '@vocab'});
        objectTypes.add(decoder?.decode({value}) ?? value);
      });
    }
    return objectTypes;
  }

  _getTermInfo({termMap, key}) {
    // check for undefined term IDs
    const {transformer} = this;
    const {term, plural} = transformer.contextProcessor.getTermForId({id: key});
    if(term === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM_ID',
        `Unknown term ID '${key}' was detected in the CBOR-LD input.`);
    }

    // check for undefined term
    const def = termMap.get(term);
    if(def === undefined &&
      !(term.startsWith('@') && KEYWORDS_TABLE.has(term))) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term "${term}" was detected in the CBOR-LD input.`);
    }

    return {term, termId: key, plural, def};
  }

  _transformContexts({obj, transformMap}) {
    const {transformer} = this;

    // decode `@context` for `transformMap`, if any
    const encodedContext = transformMap.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      const decoder = ContextDecoder.createDecoder(
        {value: encodedContext, transformer});
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
      const entries = [];
      for(const value of encodedContexts) {
        const decoder = ContextDecoder.createDecoder(
          {value, transformer});
        entries.push(decoder ? decoder.decode({value}) : value);
      }
      obj['@context'] = entries;
    }
  }

  _transformValue({entries, termType, value, termInfo}) {
    if(value instanceof Map) {
      return;
    }
    const {transformer} = this;
    const decoder = ValueDecoder.createDecoder(
      {value, transformer, termInfo, termType});
    if(decoder || !Array.isArray(value)) {
      entries.push(decoder?.decode({value}) ?? value);
      return true;
    }
  }

  async _transformArray({entries, contextStack, value}) {
    // recurse into array
    const children = [];
    for(const transformMap of value) {
      if(Array.isArray(transformMap)) {
        // recurse into array of arrays
        await this._transformArray({
          entries: children, contextStack, value: transformMap
        });
        continue;
      }
      // handle non-object
      if(!(transformMap instanceof Map)) {
        children.push(transformMap);
        continue;
      }
      // handle object
      const obj = {};
      children.push(obj);
      await this.transformer._transform({obj, transformMap, contextStack});
    }
    entries.push(children);
  }

  async _transformObject({entries, contextStack, value}) {
    // recurse into object
    const child = {};
    entries.push(child);
    return this.transformer._transform({
      obj: child, transformMap: value, contextStack
    });
  }

  _assignEntries({entries, obj, termInfo}) {
    const {term, plural} = termInfo;
    obj[term] = plural ? entries : entries[0];
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

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */
