/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {ContextProcessor} from './ContextProcessor.js';
import {KEYWORDS_TABLE} from './tables.js';
import {Transformer} from './Transformer.js';
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
    this.transformer = new Transformer({
      strategy: this,
      contextProcessor: new ContextProcessor({documentLoader}),
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
    // handle single or multiple JSON-LD docs
    const elements = [];
    const isArray = Array.isArray(jsonldDocument);
    const docs = isArray ? jsonldDocument : [jsonldDocument];
    for(const obj of docs) {
      const element = new Map();
      await this.transformer._transform({obj, transformMap: element});
      elements.push(element);
    }
    return isArray ? elements : elements[0];
  }

  _getEntries({obj, termMap}) {
    const {transformer: {contextProcessor}} = this;

    // get term entries to be transformed and sort by *term* to ensure term
    // IDs will be assigned in the same order that the decompressor will
    const entries = [];
    const keys = Object.keys(obj).sort();
    for(const key of keys) {
      // skip `@context`; not a term entry
      if(key === '@context') {
        continue;
      }

      // check for undefined terms
      let def = termMap.get(key);
      if(def === undefined) {
        /* DO NOT DELETE - might want to re-add for debug purposes
        if(!(key.startsWith('@') && KEYWORDS_TABLE.has(key))) {
          throw new CborldError(
            'ERR_UNKNOWN_CBORLD_TERM',
            `Unknown term '${key}' was detected in the JSON-LD input.`);
        }
        */
        def = {};
      }

      const value = obj[key];
      const plural = Array.isArray(value);
      // FIXME: note: this is the only place this is called
      const termId = contextProcessor.getIdForTerm({term: key, plural});
      entries.push([{term: key, termId, plural, def}, value]);
    }
    return entries;
  }

  _getObjectTypes({obj, typeTerms}) {
    const objectTypes = new Set();
    for(const term of typeTerms) {
      const types = obj[term];
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

  _transformContexts({obj, transformMap}) {
    // if `@context` is present in the object, encode it
    const context = obj['@context'];
    if(!context) {
      return;
    }

    const {transformer} = this;
    const entries = [];
    const isArray = Array.isArray(context);
    const contexts = isArray ? context : [context];
    for(const value of contexts) {
      const encoder = ContextEncoder.createEncoder({value, transformer});
      entries.push(encoder || value);
    }
    const id = isArray ? CONTEXT_TERM_ID_PLURAL : CONTEXT_TERM_ID;
    transformMap.set(id, isArray ? entries : entries[0]);
  }

  _transformValue({entries, termType, value, termInfo}) {
    if(typeof value === 'object') {
      return;
    }
    const {transformer} = this;
    const encoder = ValueEncoder.createEncoder({
      value, transformer, termInfo, termType
    });
    entries.push(encoder ?? value);
    return true;
  }

  async _transformArray({entries, contextStack, value}) {
    // recurse into array
    const children = [];
    for(const obj of value) {
      if(Array.isArray(obj)) {
        // recurse into array of arrays
        await this._transformArray(
          {entries: children, contextStack, value: obj});
        continue;
      }
      // handle non-object
      if(!(obj && typeof obj === 'object')) {
        children.push(obj);
        continue;
      }
      // handle object
      const childMap = new Map();
      children.push(childMap);
      await this.transformer._transform({
        obj, transformMap: childMap, contextStack
      });
    }
    entries.push(children);
  }

  async _transformObject({entries, contextStack, value}) {
    // recurse into object
    const transformMap = new Map();
    entries.push(transformMap);
    await this.transformer._transform({
      obj: value, transformMap, contextStack
    });
  }

  _assignEntries({entries, transformMap, termInfo}) {
    const {termId, plural} = termInfo;
    transformMap.set(termId, plural ? entries : entries[0]);
  }
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
