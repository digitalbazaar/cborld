/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {
  FIRST_CUSTOM_TERM_ID,
  KEYWORDS_TABLE
} from './tables.js';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {inspect} from './util.js';
import {MultibaseDecoder} from './codecs/MultibaseDecoder.js';
import {Transformer} from './Transformer.js';
import {TypedLiteralDecoder} from './codecs/TypedLiteralDecoder.js';
import {UntypedLiteralDecoder} from './codecs/UntypedLiteralDecoder.js';
import {UriDecoder} from './codecs/UriDecoder.js';
import {VocabTermDecoder} from './codecs/VocabTermDecoder.js';
import {XsdDateDecoder} from './codecs/XsdDateDecoder.js';
import {XsdDateTimeDecoder} from './codecs/XsdDateTimeDecoder.js';

export const TYPE_DECODERS = new Map([
  ['@id', UriDecoder],
  ['@vocab', VocabTermDecoder],
  ['https://w3id.org/security#multibase', MultibaseDecoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateDecoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeDecoder]
]);

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
   * @param {Map} options.keywordsTable -A map of JSON-LD keywords
   *  and their associated CBOR-LD integer values.
   * @param {Map} options.stringTable - A map of string values and
   *  their associated CBOR-LD integer values.
   * @param {Map} options.urlSchemeTable - A map of URL schemes to
   *  their associated CBOR-LD integer values.
   * @param {Map} options.typedLiteralTable - A map of JSON-LD types
   *  to maps that map values of that type to their associated CBOR-LD
   *  integer values.
   */
  constructor({
    documentLoader,
    keywordsTable,
    urlSchemeTable,
    stringTable,
    typedLiteralTable
  } = {}) {
    super({
      documentLoader,
      keywordsTable,
      urlSchemeTable,
      stringTable,
      typedLiteralTable
    });
    this.keywordsTable = new Map(keywordsTable);
    // build reverse compression tables
    this.idToTerm = _reverseMap(keywordsTable);
    this.reverseStringTable = _reverseMap(stringTable);
    this.reverseUrlSchemeTable = _reverseMap(urlSchemeTable);

    // typed literal table is map of maps, process inner map not outer
    this.reverseTypedLiteralTable = new Map();
    if(typedLiteralTable) {
      for(const [k, map] of typedLiteralTable) {
        this.reverseTypedLiteralTable.set(k, _reverseMap(map));
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
    this.contextMap = new Map();
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
      obj['@context'] = decoder ?
        decoder.decode({value: encodedContext}) : encodedContext;
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

  _beforeTypeScopedContexts({activeCtx, obj, transformMap}) {
    // decode object types
    const {termToId} = this;
    const typeTerms = ['@type', ...activeCtx.aliases.type];
    for(const term of typeTerms) {
      // check both singular and plural term IDs
      // check keywords table as well
      let termId;
      if(termToId.has(term)) {
        termId = termToId.get(term);
      }
      let value = transformMap.get(termId);
      if(value === undefined) {
        value = transformMap.get(termId + 1);
      }
      if(value !== undefined) {
        if(Array.isArray(value)) {
          obj[term] = value.map(value => {
            const decoder = VocabTermDecoder.createDecoder(
              {value, transformer: this});
            return decoder ? decoder.decode({value}) : value;
          });
        } else {
          const decoder = VocabTermDecoder.createDecoder(
            {value, transformer: this});
          obj[term] = decoder ? decoder.decode({value}) : value;
        }
      }
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
    this.nextTermId = FIRST_CUSTOM_TERM_ID;
    this.idToTerm = _reverseMap(this.keywordsTable);
  }

  _transformObjectId({obj, termInfo, value}) {
    const decoder = UriDecoder.createDecoder({value, transformer: this});
    obj[termInfo.term] = decoder ? decoder.decode({value}) : value;
  }

  _transformObjectType({obj, termInfo, value}) {
    const {term, plural} = termInfo;
    const values = plural ? value : [value];
    const entries = [];
    for(const value of values) {
      const decoder = VocabTermDecoder.createDecoder(
        {value, transformer: this});
      entries.push(decoder ? decoder.decode({value}) : value);
    }
    obj[term] = plural ? entries : entries[0];
  }

  _transformTypedValue({entries, termType, value}) {
    const decoder = TypedLiteralDecoder.createDecoder({
      value,
      transformer: this,
      termType
    }) || TYPE_DECODERS.get(termType)?.createDecoder({
      value,
      transformer: this
    });

    if(decoder) {
      entries.push(decoder.decode({value}));
      return true;
    }
  }

  async _transformArray({entries, contextStack, value}) {
    // recurse into array
    const children = [];
    for(const transformMap of value) {
      const obj = {};
      children.push(obj);
      await this._transform({obj, transformMap, contextStack});
    }
    entries.push(children);
  }

  async _transformUntypedValue({entries, value}) {
    const decoder = UntypedLiteralDecoder.createDecoder({
      value,
      transformer: this
    });
    entries.push(decoder.decode({value}));
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

function _reverseMap(m) {
  return new Map(Array.from(m, e => e.reverse()));
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
