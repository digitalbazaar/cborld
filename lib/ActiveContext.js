/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';

export class ActiveContext {
  constructor({
    contextProcessor,
    activeCtx = _createNewActiveContext(),
    parent
  } = {}) {
    this.contextProcessor = contextProcessor;

    // FIXME: merge properties of `_activeCtx` into this object or rename
    // it to something like `state`
    this._activeCtx = activeCtx;
    this.parent = parent;
  }

  /**
   * Apply the embedded contexts in the given object to produce a new
   * active context.
   *
   * @param {object} options - The options to use.
   * @param {object} options.obj - The object to get the active context for.
   *
   * @returns {Promise<object>} - The active context instance.
   */
  async applyEmbeddedContexts({obj}) {
    const {contextProcessor} = this;
    // FIXME: pass `allowOverrideProtected`, default to `false`
    const activeCtx = await contextProcessor.applyEmbeddedContexts({
      activeCtx: this._activeCtx, obj
    });
    return new ActiveContext({contextProcessor, activeCtx});
  }

  // FIXME: current implementation only works with default
  // `@propagate: false`, ensure coverage with `@propagate: true`
  // FIXME: until then, throw error if `@propagate: false`
  async applyPropertyScopedContext({term}) {
    const propertyScopedContext = this._activeCtx.scopedContextMap.get(term);
    if(!propertyScopedContext) {
      // no scoped context, return current context
      // FIXME: determine if a clone is necessary or not
      return this;
    }

    const {contextProcessor} = this;
    // FIXME: pass `allowOverrideProtected=true`
    const activeCtx = await contextProcessor.applyEmbeddedContexts({
      // FIXME: if `activeCtx.propagate`, use it, otherwise use `parent`
      activeCtx: this.parent._activeCtx,
      obj: {'@context': propertyScopedContext}
    });
    return new ActiveContext({contextProcessor, activeCtx, parent: this});
  }

  // FIXME: current implementation only works with default
  // `@propagate: true`, ensure coverage with `@propagate: false`
  // FIXME: until then, throw error if `@propagate: true`
  async applyTypeScopedContexts({objectTypes}) {
    const {contextProcessor} = this;
    const activeCtx = await contextProcessor.applyTypeScopedContexts({
      activeCtx: this._activeCtx, objectTypes
    });
    return new ActiveContext({contextProcessor, activeCtx, parent: this});
  }

  getTypeTerms() {
    // FIXME: store once, don't duplicate?
    return ['@type', ...this._activeCtx.typeAliases];
  }

  getIdForTerm({term, plural}) {
    // check term to id table
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
    return {term, plural};
  }

  getTermInfo({id}) {
    // check for undefined term IDs
    const {contextProcessor, _activeCtx: {termMap}} = this;
    const {term, plural} = contextProcessor.getTermForId({id});
    if(term === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM_ID',
        `Unknown term ID '${id}' was detected in the CBOR-LD input.`);
    }

    // get term definition
    const def = termMap.get(term) ?? {};
    return {term, termId: id, plural, def};
  }

  getTermType({def}) {
    // FIXME: consider making `def` hold keyword value for any keyword and
    // handle that here
    const {'@type': type} = def;
    if(!type) {
      // no term type
      return;
    }

    // check for potential CURIE value
    const [prefix, ...suffix] = type.split(':');
    const prefixDef = this._activeCtx.termMap.get(prefix);
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
