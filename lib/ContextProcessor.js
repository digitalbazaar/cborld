/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {FIRST_CUSTOM_TERM_ID, KEYWORDS_TABLE, reverseMap} from './tables.js';

// FIXME: consider merging with ActiveContext
export class ContextProcessor {
  /**
   * Creates a new ContextProcessor.
   *
   * @param {object} options - The options to use.
   * @param {boolean} [options.buildReverseMap=false] - `true` to build a
   *   reverse map, `false` not to.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   */
  constructor({buildReverseMap = false, documentLoader} = {}) {
    this.documentLoader = documentLoader;
    this.contextMap = new Map();
    this.nextTermId = FIRST_CUSTOM_TERM_ID;
    this.termToId = new Map(KEYWORDS_TABLE);
    if(buildReverseMap) {
      this.idToTerm = reverseMap(KEYWORDS_TABLE);
    }
  }

  /**
   * Apply the embedded contexts in the given object to produce an
   * active context.
   *
   * @param {object} options - The options to use.
   * @param {object} options.obj - The object to get the active context for.
   * @param {Array} [options.contextStack] - The stack of active contexts.
   *
   * @returns {Promise<object>} - The active context instance.
   */
  async applyEmbeddedContexts({obj, contextStack}) {
    const stackTop = contextStack.length;

    // push any local embedded contexts onto the context stack
    const localContexts = obj['@context'];
    await this._updateContextStack({contextStack, contexts: localContexts});

    // get `@type` aliases for the active context
    let active = contextStack[contextStack.length - 1];
    if(!active) {
      // empty initial context
      active = _createNewActiveContext();
    }

    // FIXME: remove `revert()`
    return {
      ...active,
      revert() {
        contextStack.length = stackTop;
      }
    };
  }

  async applyTypeScopedContexts({objectTypes, contextStack}) {
    const stackTop = contextStack.length;

    // get `@type` aliases for the active context
    let active = contextStack[contextStack.length - 1];
    if(!active) {
      // empty initial context
      active = _createNewActiveContext();
    }

    // apply types in lexicographically sorted order (per JSON-LD spec)
    objectTypes = [...objectTypes].sort();

    // apply any type-scoped contexts
    let {scopedContextMap} = active;
    for(const type of objectTypes) {
      const contexts = scopedContextMap.get(type);
      if(contexts) {
        await this._updateContextStack({contextStack, contexts});
        active = contextStack[contextStack.length - 1];
        ({scopedContextMap} = active);
      }
    }

    // FIXME: remove `revert()`
    return {
      ...active,
      revert() {
        contextStack.length = stackTop;
      }
    };
  }

  getIdForTerm({term, plural}) {
    // check term to id table
    const id = this.termToId.get(term);
    if(id === undefined) {
      /*
      throw new CborldError(
        'ERR_UNDEFINED_TERM',
        'CBOR-LD compression requires all terms to be defined in a JSON-LD ' +
        'context.');
      */
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
    return {term, plural};
  }

  async _addContext({context, contextUrl}) {
    const {contextMap, termToId, idToTerm} = this;

    // handle `@import`
    const importUrl = context['@import'];
    if(importUrl) {
      let importEntry = contextMap.get(importUrl);
      if(!importEntry) {
        const {'@context': importCtx} = await this._getDocument(
          {url: importUrl});
        importEntry = await this._addContext(
          {context: importCtx, contextUrl: importUrl});
      }
      context = {...importEntry.context, ...context};
    }

    // precompute any `@type` aliases, scoped contexts, and terms
    const scopedContextMap = new Map();
    const termMap = new Map();
    const entry = {
      typeAliases: new Set(),
      context,
      scopedContextMap,
      termMap
    };

    // process context keys in sorted order to ensure term IDs are assigned
    // consistently
    const keys = Object.keys(context).sort();
    for(const key of keys) {
      const def = context[key];
      if(!def) {
        continue;
      }

      // add new `@type` alias
      const _id = typeof def === 'string' ? def : def?.['@id'];
      if(_id === '@type') {
        entry.typeAliases.add(key);
      }

      if(KEYWORDS_TABLE.has(key)) {
        // skip `KEYWORDS_TABLE` to avoid adding unnecessary term defns
        continue;
      }

      termMap.set(key, def);
      const scopedContext = def['@context'];
      if(scopedContext) {
        scopedContextMap.set(key, scopedContext);
      }

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

  async _loadContext({context, transformer}) {
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
    return this._addContext({context: ctx, contextUrl, transformer});
  }

  async _updateContextStack({contextStack, contexts, transformer}) {
    // push any localized contexts onto the context stack
    if(!contexts) {
      return;
    }
    if(!Array.isArray(contexts)) {
      contexts = [contexts];
    }

    for(const context of contexts) {
      const entry = await this._loadContext({context, transformer});

      // clone entry to create new active context entry for context stack
      const newActive = {
        typeAliases: new Set(entry.typeAliases),
        context,
        scopedContextMap: new Map(entry.scopedContextMap),
        termMap: new Map(entry.termMap)
      };

      // push new active context and get old one
      const oldActive = contextStack[contextStack.length - 1];
      contextStack.push(newActive);
      if(!oldActive) {
        continue;
      }

      // compute `@type` aliases by including any previous aliases that
      // have not been replaced by the new context
      const {typeAliases, termMap} = newActive;
      for(const alias of oldActive.typeAliases) {
        if(!(context[alias] === null || termMap.has(alias))) {
          typeAliases.add(alias);
        }
      }

      // compute new terms map
      for(const [key, value] of oldActive.termMap) {
        // FIXME: pass `allowOverrideProtected` and if it isn't set and
        // `termMap.has(key)`, then throw an error for invalid protected
        // term override
        if(termMap.has(key)) {
          // FIXME: throw if `!allowOverrideProtected`
        } else if(context[key] !== null) {
          termMap.set(key, value);
        }
      }

      // compute scoped context map by including any scoped contexts that have
      // not been replaced by the new context
      const {scopedContextMap} = newActive;
      for(const [key, value] of oldActive.scopedContextMap) {
        if(!(context[key] === null || scopedContextMap.has(key))) {
          scopedContextMap.set(key, value);
        }
      }
    }
  }
}

function _createNewActiveContext() {
  return {
    typeAliases: new Set(),
    context: {},
    scopedContextMap: new Map(),
    termMap: new Map()
  };
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
