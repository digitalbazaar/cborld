/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';

export class ActiveContext {
  constructor({
    activeCtx = _createNewActiveContext(),
    parent,
    contextLoader = parent?.contextLoader,
  } = {}) {
    this.parent = parent;
    // FIXME: merge properties of `_activeCtx` into this object or rename
    // it to something like `state`
    this._activeCtx = activeCtx;
    this.contextLoader = contextLoader;
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
    // add any local embedded contexts
    const activeCtx = await this._updateActiveContext({
      activeCtx: this._activeCtx, contexts: obj['@context']
    });
    return new ActiveContext({activeCtx, parent: this});
  }

  // FIXME: current implementation only works with default
  // `@propagate: false`, ensure coverage with `@propagate: true`
  // FIXME: until then, throw error if `@propagate: false`
  async applyPropertyScopedContext({term}) {
    const propertyScopedContext = this._activeCtx.scopedContextMap.get(term);
    if(!propertyScopedContext) {
      // no scoped context, return current context
      return this;
    }

    const activeCtx = await this._updateActiveContext({
      // FIXME: if `activeCtx.propagate`, use it, otherwise use `parent`
      activeCtx: this.parent._activeCtx,
      contexts: propertyScopedContext,
      allowProtectedOverride: true
    });
    return new ActiveContext({activeCtx, parent: this});
  }

  // FIXME: current implementation only works with default
  // `@propagate: true`, ensure coverage with `@propagate: false`
  // FIXME: until then, throw error if `@propagate: true`
  async applyTypeScopedContexts({objectTypes}) {
    // apply type-scoped contexts in lexicographically type-sorted order
    // (per JSON-LD spec)
    objectTypes = [...objectTypes].sort();
    let activeCtx = this._activeCtx;
    let {scopedContextMap} = activeCtx;
    for(const type of objectTypes) {
      const contexts = scopedContextMap.get(type);
      if(contexts) {
        activeCtx = await this._updateActiveContext({activeCtx, contexts});
        ({scopedContextMap} = activeCtx);
      }
    }
    return new ActiveContext({activeCtx, parent: this});
  }

  getTypeTerms() {
    // FIXME: store once, don't duplicate?
    return ['@type', ...this._activeCtx.typeAliases];
  }

  getIdForTerm({term, plural}) {
    return this.contextLoader.getIdForTerm({term, plural});
  }

  getTermInfo({id}) {
    // get term and term definition
    const {term, plural} = this.contextLoader.getTermForId({id});
    const def = this._activeCtx.termMap.get(term) ?? {};
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

  async _updateActiveContext({
    activeCtx, contexts, allowProtectedOverride = false
  }) {
    // no new contexts
    if(!contexts) {
      return activeCtx;
    }

    // normalize new local contexts to an array
    if(!Array.isArray(contexts)) {
      contexts = [contexts];
    }

    // push any local contexts onto the context stack
    const {contextLoader} = this;
    for(const context of contexts) {
      const entry = await contextLoader.load({context});

      // clone entry to create new active context entry for context stack
      const newActive = {
        typeAliases: new Set(entry.typeAliases),
        context,
        scopedContextMap: new Map(entry.scopedContextMap),
        termMap: new Map(entry.termMap)
      };

      // compute `@type` aliases by including any previous aliases that
      // have not been replaced by the new context
      const {typeAliases, termMap} = newActive;
      for(const alias of activeCtx.typeAliases) {
        if(!(context[alias] === null || termMap.has(alias))) {
          typeAliases.add(alias);
        }
      }

      // compute new terms map
      for(const [key, value] of activeCtx.termMap) {
        let def = termMap.get(key);
        if(def !== undefined) {
          // disallow overriding of protected terms unless explicitly permitted
          if(value.protected) {
            if(!allowProtectedOverride && !_deepEqual(def, value, true)) {
              throw new CborldError(
                'ERR_PROTECTED_TERM_REDEFINITION',
                `Unexpected redefinition of protected term "${key}".`);
            }
            // ensure `def` remains protected
            def = {...value};
          }
        } else if(context[key] !== null) {
          termMap.set(key, value);
        }
      }

      // compute scoped context map by including any scoped contexts that have
      // not been replaced by the new context
      const {scopedContextMap} = newActive;
      for(const [key, value] of activeCtx.scopedContextMap) {
        if(!(context[key] === null || scopedContextMap.has(key))) {
          scopedContextMap.set(key, value);
        }
      }

      // update active context
      activeCtx = newActive;
    }

    return activeCtx;
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

function _deepEqual(obj1, obj2, top = false) {
  const isObject1 = obj1 && typeof obj1 === 'object';
  const isObject2 = obj2 && typeof obj2 === 'object';
  if(isObject1 !== isObject2) {
    return false;
  }
  if(!isObject1) {
    return obj1 === obj2;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if(keys1.length !== keys2.length) {
    return false;
  }
  for(const k of keys1) {
    if(top && k === 'protected') {
      continue;
    }
    if(!_deepEqual(obj1[k], obj2[k])) {
      return false;
    }
  }
  return true;
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
