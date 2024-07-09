/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';
import {KEYWORDS_TABLE, STRING_TABLE, TYPED_LITERAL_TABLE} from './tables.js';

export class Transformer {
  /**
   * Creates a new Transformer for transforming CBOR-LD <=> JSON-LD.
   *
   * @param {object} options - The options to use when encoding to CBOR-LD.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {Map} [options.compressionMap] - A map of strings to CBOR-LD
   * integers.
   */
  constructor({
    documentLoader,
    keywordsTable,
    stringTable,
    urlTable,
    typedLiteralTable} = {}) {
    this.documentLoader = documentLoader;
    this.keywordsTable = keywordsTable;
    this.stringTable = stringTable;
    this.urlTable = urlTable;
    this.typedLiteralTable = typedLiteralTable;
  }

  // default no-op hook functions
  _beforeObjectContexts() {}
  _afterObjectContexts() {}
  _beforeTypeScopedContexts() {}

  /**
   * CBOR-LD is a semantic compression format; it uses the contextual
   * information provided by JSON-LD contexts to compress JSON-LD objects
   * to CBOR-LD (and vice versa).
   *
   * The purpose of this internal transform function is to either enable
   * transformation of a JSON-LD object to CBOR-LD (compression) or vice versa
   * (decompression). It does this by:
   *
   * 1. Finding the matching term definition from the active JSON-LD
   *    context for each encountered term in the data that is being
   *    transformed.
   * 2. Mapping each term to the target format (compressed / decompressed) and
   *    creating value codec (encoder / decoder) for each value associate with
   *    the term.
   *
   * When compressing, the transform function maps JSON keys (strings)
   * encountered in the JSON-LD object to term IDs (integers) and value
   * encoders.
   *
   * When decompressing, the transform function maps term IDs (integers) to
   * JSON keys (strings) and value decoders.
   *
   * The transform process will populate the given `transformMap` (a `Map`)
   * with keys (strings or IDs based on compression / decompression) and values
   * (the associated encoders / decoders). This `transformMap` can then be
   * passed to the `cborg` library to output JSON or CBOR.
   *
   * In order to match each JSON key / term ID with the right term
   * definition, it's important to understand how context is applied in
   * JSON-LD, i.e., which context is "active" at a certain place in the
   * object. There are three ways contexts become active to consider in
   * JSON-LD:
   *
   * 1. Embedded contexts. An embedded context is expressed by using the
   *    `@context` keyword in a JSON-LD object. It is active on the object
   *    where it appears and propagates to any nested objects.
   * 2. Type-scoped contexts. Such a context is defined in another context
   *    and bound to a particular type. It will become active based on the
   *    presence of the `@type` property (or an alias of it) and a matching
   *    type value. By default, it *does not* propagate to nested objects,
   *    i.e., it becomes inactive when a nested object does not have a matching
   *    type.
   * 3. Property-scoped contexts. Such a context is defined in another context
   *    and bound to a particular property. It will become active based on the
   *    presence of a particular term, i.e., JSON key. By default, it
   *    propagates, i.e., all terms defined by the context will be applicable
   *    to the whole subtree associated with the property in the JSON object.
   *
   * The transform function maintains a stack of active contexts based on the
   * above rules to ensure that the right term definitions are matched up with
   * each JSON key in the JSON-LD object (when compressing) and each term ID in
   * the CBOR-LD object (when decompressing).
   *
   * @param {object} options - The options to use.
   * @param {object} options.obj - The object to transform.
   * @param {Map} options.transformMap - The transformation map to populate.
   * @param {Array} [options.contextStack] - The current context stack.
   */
  async _transform({obj, transformMap, contextStack = []}) {
    // hook before object contexts are applied
    this._beforeObjectContexts({obj, transformMap});

    // apply embedded contexts in the object
    let activeCtx = await this._applyEmbeddedContexts({obj, contextStack});

    // hook after object contexts are applied
    this._afterObjectContexts({obj, transformMap});

    // TODO: support `@propagate: true` on type-scoped contexts; until then
    // throw an error if it is set

    // preserve context stack before applying type-scoped contexts
    const childContextStack = contextStack.slice();

    // hook before type-scoped contexts are applied
    this._beforeTypeScopedContexts({activeCtx, obj, transformMap});

    // apply type-scoped contexts
    activeCtx = await this._applyTypeScopedContexts({obj, contextStack});

    // walk term entries to transform
    const {aliases, scopedContextMap, termMap} = activeCtx;
    const termEntries = this._getEntries(
      {obj, transformMap, transformer: this, termMap});
    for(const [termInfo, value] of termEntries) {
      const {term} = termInfo;

      // transform `@id`
      if(term === '@id' || aliases.id.has(term)) {
        this._transformObjectId({obj, transformMap, termInfo, value});
        continue;
      }

      // transform `@type`
      if(term === '@type' || aliases.type.has(term)) {
        this._transformObjectType({obj, transformMap, termInfo, value});
        continue;
      }

      // use `childContextStack` when processing properties as it will remove
      // type-scoped contexts unless a property-scoped context is applied
      let propertyContextStack = childContextStack;

      // apply any property-scoped context
      let newActiveCtx;
      const propertyScopedContext = scopedContextMap.get(term);
      if(propertyScopedContext) {
        // TODO: support `@propagate: false` on property-scoped contexts; until
        // then throw an error if it is set
        newActiveCtx = await this._applyEmbeddedContexts({
          obj: {'@context': propertyScopedContext},
          contextStack
        });
        propertyContextStack = contextStack.slice();
      }

      // iterate through all values for the current transform entry
      const {plural, def} = termInfo;
      const termType = this._getTermType(
        {activeCtx: newActiveCtx || activeCtx, def});
      const values = plural ? value : [value];
      const entries = [];
      for(const value of values) {
        // `null` is never transformed
        if(value === null) {
          entries.push(null);
          continue;
        }

        // try to transform typed value
        if(this._transformTypedValue({entries, termType, value, termInfo})) {
          continue;
        }

        if(typeof value !== 'object') {
          // value not transformed and cannot recurse, so do not transform
          entries.push(value);
          continue;
        }

        // transform array
        if(Array.isArray(value)) {
          await this._transformArray(
            {entries, contextStack: propertyContextStack, value});
          continue;
        }

        // transform object
        await this._transformObject({
          entries, contextStack: propertyContextStack, value});
      }

      // revert property-scoped active context if one was created
      if(newActiveCtx) {
        newActiveCtx.revert();
      }

      this._assignEntries({entries, obj, transformMap, termInfo});
    }

    // revert active context for this object
    activeCtx.revert();
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
  async _applyEmbeddedContexts({obj, contextStack}) {
    const stackTop = contextStack.length;

    // push any local embedded contexts onto the context stack
    const localContexts = obj['@context'];
    await this._updateContextStack({contextStack, contexts: localContexts});

    // get `id` and `type` aliases for the active context
    let active = contextStack[contextStack.length - 1];
    if(!active) {
      // empty initial context
      active = {
        aliases: {
          id: new Set(),
          type: new Set()
        },
        context: {},
        scopedContextMap: new Map(),
        termMap: new Map()
      };
    }

    return {
      ...active,
      revert() {
        contextStack.length = stackTop;
      }
    };
  }

  async _applyTypeScopedContexts({obj, contextStack}) {
    const stackTop = contextStack.length;

    // get `id` and `type` aliases for the active context
    let active = contextStack[contextStack.length - 1];
    if(!active) {
      // empty initial context
      active = {
        aliases: {
          id: new Set(),
          type: new Set()
        },
        context: {},
        scopedContextMap: new Map(),
        termMap: new Map()
      };
    }
    const {aliases} = active;

    // get unique object type(s)
    let totalTypes = [];
    const typeTerms = ['@type', ...aliases.type];
    for(const term of typeTerms) {
      const types = obj[term];
      if(Array.isArray(types)) {
        totalTypes.push(...types);
      } else {
        totalTypes.push(types);
      }
    }
    // apply types in lexicographically sorted order (per JSON-LD spec)
    totalTypes = [...new Set(totalTypes)].sort();

    // apply any type-scoped contexts
    let {scopedContextMap} = active;
    for(const type of totalTypes) {
      const contexts = scopedContextMap.get(type);
      if(contexts) {
        await this._updateContextStack({contextStack, contexts});
        active = contextStack[contextStack.length - 1];
        ({scopedContextMap} = active);
      }
    }

    return {
      ...active,
      revert() {
        contextStack.length = stackTop;
      }
    };
  }

  async _updateContextStack({contextStack, contexts, transformer}) {
    // push any localized contexts onto the context stack
    if(!contexts) {
      return;
    }
    if(!Array.isArray(contexts)) {
      contexts = [contexts];
    }

    const {contextMap} = this;
    for(const context of contexts) {
      let entry = contextMap.get(context);
      if(!entry) {
        let ctx = context;
        let contextUrl;
        if(typeof context === 'string') {
          // fetch context
          contextUrl = context;
          ({'@context': ctx} = await this._getDocument({url: contextUrl}));
        }
        // FIXME: validate `ctx` to ensure its a valid JSON-LD context value
        // add context
        entry = await this._addContext({context: ctx, contextUrl, transformer});
      }

      // clone entry to create new active context entry for context stack
      const newActive = {
        aliases: {
          id: new Set(entry.aliases.id),
          type: new Set(entry.aliases.type)
        },
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

      // compute `id` and `type` aliases by including any previous aliases that
      // have not been replaced by the new context
      const {aliases, termMap} = newActive;
      for(const key of ['id', 'type']) {
        for(const alias of oldActive.aliases[key]) {
          if(!(context[alias] === null || newActive.termMap.has(alias))) {
            aliases[key].add(alias);
          }
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

      // compute new terms map
      for(const [key, value] of oldActive.termMap) {
        if(!(context[key] === null || termMap.has(key))) {
          termMap.set(key, value);
        }
      }
    }
  }

  async _addContext({context, contextUrl}) {
    const {contextMap, tableFromContexts, reverseTableFromContexts} = this;

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

    // precompute any `@id` and `@type` aliases, scoped contexts, and terms
    const scopedContextMap = new Map();
    const termMap = new Map();
    const entry = {
      aliases: {id: new Set(), type: new Set()},
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
      if(def === '@id' || def.id === '@id') {
        entry.aliases.id.add(key);
      } else if(def === '@type' || def.id === '@type') {
        entry.aliases.type.add(key);
      }
      if(this.keywordsTable.has(key)) {
        // skip KEYWORDS_TABLE
        continue;
      }
      if(this.stringTable.has(key)) {
        // skip STRING_TABLE
        continue;
      }
      if(this.urlTable.has(key)) {
        // skip STRING_TABLE
        continue;
      }
      let isInTypedTable = false
      for(let [type, table] of this.typedLiteralTable){
        if(table.has(key)){
          isInTypedTable = true;
        }
      }
      if(isInTypedTable){
        continue;
      }
      // ensure the term has been assigned an ID
      if(!tableFromContexts.has(key)) {
        const id = this.nextTermId;
        this.nextTermId += 2;
        tableFromContexts.set(key, id);
        if(reverseTableFromContexts) {
          reverseTableFromContexts.set(id, key);
        }
      }
      termMap.set(key, def);
      const scopedContext = def['@context'];
      if(scopedContext) {
        scopedContextMap.set(key, scopedContext);
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

  _getTermType({activeCtx, def}) {
    const {'@type': type} = def;
    if(!type) {
      // no term type
      return;
    }

    // check for potential CURIE value
    const [prefix, ...suffix] = type.split(':');
    const prefixDef = activeCtx.termMap.get(prefix);
    if(prefixDef === undefined) {
      // no CURIE
      return type;
    }

    // handle CURIE
    if(typeof prefixDef === 'string') {
      return prefixDef + suffix.join(':');
    }

    // prefix definition must be an object
    if(!(typeof prefixDef === 'object' &&
      typeof prefixDef['@id'] === 'string')) {
      throw new CborldError(
        'ERR_INVALID_TERM_DEFINITION',
        'JSON-LD term definitions must be strings or objects with "@id".');
    }
    return prefixDef['@id'] + suffix.join(':');
  }

  _getIdForTerm({term, plural}) {
    let id;
    // check keywords table
    if(this.keywordsTable.has(term)){
      id = this.keywordsTable.get(term);
    }

    if(this.tableFromContexts.has(term)){
      id = this.tableFromContexts.get(term);
    }

    
    if(id === undefined) {
      throw new CborldError(
        'ERR_UNDEFINED_TERM',
        'CBOR-LD compression requires all terms to be defined in a JSON-LD ' +
        'context.');
    }
    return plural ? id + 1 : id;
  }

  _getTermForId({id}) {
    const plural = (id & 1) === 1;
    const term = this.reverseTableFromContexts.get(plural ? id - 1 : id);
    return {term, plural};
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
