/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {KEYWORDS_TABLE, reverseMap} from './tables.js';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {inspect} from './util.js';
import {Transformer} from './Transformer.js';
import {ValueDecoder} from './codecs/ValueDecoder.js';

const CONTEXT_TERM_ID = KEYWORDS_TABLE.get('@context');
const CONTEXT_TERM_ID_PLURAL = CONTEXT_TERM_ID + 1;

export class Decompressor extends Transformer {
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
    super({documentLoader, typeTable, legacy});

    // build reverse compression tables, the `typeTable` is a map of maps,
    // just reverse each inner map
    this.reverseTypeTable = new Map();
    if(typeTable) {
      for(const [k, map] of typeTable) {
        this.reverseTypeTable.set(k, reverseMap(map));
      }
    }
  }

  /**
   * Decompresses the given CBOR-LD byte array to a JSON-LD document.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.compressedBytes - The CBOR-LD compressed
   *   bytes that follow the compressed CBOR-LD CBOR tag.
   * @param {diagnosticFunction} [options.diagnose] - A function that, if
   *   provided, is called with diagnostic information.
   *
   * @returns {Promise<object>} - The JSON-LD document.
   */
  async decompress({compressedBytes, diagnose} = {}) {
    this._reset();

    // decoded output could be one or more transform maps
    const transformMap = cborg.decode(compressedBytes, {useMaps: true});
    if(diagnose) {
      diagnose('Diagnostic CBOR-LD decompression transform map(s):');
      diagnose(inspect(transformMap, {depth: null, colors: true}));
    }

    // handle single or multiple JSON-LD docs
    const results = [];
    const isArray = Array.isArray(transformMap);
    const transformMaps = isArray ? transformMap : [transformMap];
    for(const transformMap of transformMaps) {
      const obj = {};
      await this._transform({obj, transformMap});
      results.push(obj);
    }
    return isArray ? results : results[0];
  }

  _beforeObjectContexts({obj, transformMap}) {
    // decode `@context` for `transformMap`, if any
    const encodedContext = transformMap.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      const decoder = ContextDecoder.createDecoder(
        {value: encodedContext, transformer: this});
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
          {value, transformer: this});
        entries.push(decoder ? decoder.decode({value}) : value);
      }
      obj['@context'] = entries;
    }
  }

  _getEntries({transformMap, termMap}) {
    // get term entries to be transformed and sort by *term* to ensure term
    // IDs will be assigned in the same order that the compressor assigned them
    const entries = [];
    for(const [key, value] of transformMap) {
      // skip `@context`; not a term entry
      if(key === CONTEXT_TERM_ID || key === CONTEXT_TERM_ID_PLURAL) {
        continue;
      }

      // check for undefined term IDs
      const {term, plural} = this._getTermForId({id: key});
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

  _getObjectTypes({transformMap, typeTerms, termMap}) {
    // must decode object types to get their original values
    const {termToId} = this;
    const objectTypes = new Set();
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
          {value, transformer: this, termInfo, termType: '@vocab'});
        objectTypes.add(decoder?.decode({value}) ?? value);
      });
    }
    return objectTypes;
  }

  _getTermInfo({termMap, key}) {
    // check for undefined term IDs
    const {term, plural} = this._getTermForId({id: key});
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

  _reset() {
    super._reset();
    this.idToTerm = reverseMap(KEYWORDS_TABLE);
  }

  _transformValue({entries, termType, value, termInfo}) {
    if(value instanceof Map) {
      return;
    }
    const decoder = ValueDecoder.createDecoder(
      {value, transformer: this, termInfo, termType});
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
        await this._transformArray(
          {entries: children, contextStack, value: transformMap});
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
      await this._transform({obj, transformMap, contextStack});
    }
    entries.push(children);
  }

  async _transformObject({entries, contextStack, value}) {
    // recurse into object
    const child = {};
    entries.push(child);
    return this._transform({obj: child, transformMap: value, contextStack});
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
