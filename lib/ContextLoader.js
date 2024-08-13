/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {FIRST_CUSTOM_TERM_ID, KEYWORDS_TABLE, reverseMap} from './tables.js';
import {CborldError} from './CborldError.js';

export class ContextLoader {
  /**
   * Creates a new ContextLoader.
   *
   * @param {object} options - The options to use.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {boolean} [options.buildReverseMap=false] - `true` to build a
   *   reverse map, `false` not to.
   */
  constructor({documentLoader, buildReverseMap = false} = {}) {
    this.documentLoader = documentLoader;
    this.contextMap = new Map();
    this.nextTermId = FIRST_CUSTOM_TERM_ID;
    this.termToId = new Map(KEYWORDS_TABLE);
    if(buildReverseMap) {
      this.idToTerm = reverseMap(KEYWORDS_TABLE);
    }
  }

  getIdForTerm({term, plural = false}) {
    // check `termToId` table
    const id = this.termToId.get(term);
    if(id === undefined) {
      // return uncompressed `term` as-is
      return term;
    }
    return plural ? id + 1 : id;
  }

  getTermForId({id}) {
    if(typeof id === 'string') {
      // dynamically generate term info for uncompressed term; `plural`
      // as `false` will cause the associated value to pass through
      // without any valence-related modifications
      return {term: id, plural: false};
    }
    const plural = (id & 1) === 1;
    const term = this.idToTerm.get(plural ? id - 1 : id);
    if(term === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM_ID',
        `Unknown term ID "${id}" was detected in the CBOR-LD input.`);
    }
    return {term, plural};
  }

  hasTermId({id}) {
    return this.idToTerm.has(id);
  }

  async load({context}) {
    const entry = this.contextMap.get(context);
    if(entry) {
      // already loaded, return it
      return entry;
    }
    let ctx = context;
    let contextUrl;
    if(typeof context === 'string') {
      // fetch context
      contextUrl = context;
      ({'@context': ctx} = await this._getDocument({url: contextUrl}));
    }
    // FIXME: validate `ctx` to ensure its a valid JSON-LD context value
    // add context
    return this._addContext({context: ctx, contextUrl});
  }

  async _addContext({context, contextUrl}) {
    const {contextMap, termToId, idToTerm} = this;

    // handle `@import`
    const importUrl = context['@import'];
    if(importUrl) {
      let importEntry = contextMap.get(importUrl);
      if(!importEntry) {
        const {'@context': importCtx} = await this._getDocument({
          url: importUrl
        });
        importEntry = await this._addContext({
          context: importCtx, contextUrl: importUrl
        });
      }
      context = {...importEntry.context, ...context};
    }

    // create context entry
    const termMap = new Map();
    const entry = {context, termMap};

    // process context keys in sorted order to ensure term IDs are assigned
    // consistently
    const keys = Object.keys(context).sort();
    const isProtected = !!context['@protected'];
    for(const key of keys) {
      if(KEYWORDS_TABLE.has(key)) {
        // skip `KEYWORDS_TABLE` to avoid adding unnecessary term defns
        continue;
      }

      let def = context[key];
      if(def === null) {
        // no term definition
        continue;
      }

      // normalize definition to an object
      if(typeof def === 'string') {
        def = {'@id': def};
      } else if(!(typeof def === 'object' && typeof def['@id'] === 'string')) {
        throw new CborldError(
          'ERR_INVALID_TERM_DEFINITION',
          `Invalid JSON-LD term definition for "${key}"; it must be ` +
          'a string or an object with "@id".');
      }

      // set term definition
      termMap.set(key, {...def, protected: isProtected});

      // ensure the term has been assigned an ID
      if(!termToId.has(key)) {
        const id = this.nextTermId;
        this.nextTermId += 2;
        termToId.set(key, id);
        if(idToTerm) {
          idToTerm.set(id, key);
        }
      }
    }

    // add entry for context URL or context object
    contextMap.set(contextUrl || context, entry);

    return entry;
  }

  async _getDocument({url}) {
    const {document} = await this.documentLoader(url);
    if(typeof document === 'string') {
      return JSON.parse(document);
    }
    return document;
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
