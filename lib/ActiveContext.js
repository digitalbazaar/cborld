/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';

export class ActiveContext {
  constructor({
    activeCtx = _createNewActiveContext(),
    previous,
    contextLoader = previous?.contextLoader,
  } = {}) {
    this.previous = previous;
    // FIXME: merge properties of `_activeCtx` into this object or rename
    // it to something like `state`
    this._activeCtx = activeCtx;
    this.contextLoader = contextLoader;

    // compute all type terms (`@type` and aliases)
    this.typeTerms = ['@type'];
    for(const [term, def] of activeCtx.termMap) {
      if(def['@id'] === '@type') {
        this.typeTerms.push(term);
      }
    }
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
    const activeCtx = await _updateActiveContext({
      activeCtx: this._activeCtx,
      contexts: obj['@context'],
      contextLoader: this.contextLoader
    });
    return new ActiveContext({activeCtx, previous: this});
  }

  async applyPropertyScopedContext({term}) {
    const activeCtx = await _updateActiveContext({
      // always revert active context when recursing into a property to remove
      // non-propagating terms
      activeCtx: _revertActiveContext({activeCtx: this}),
      contexts: this._activeCtx.termMap.get(term)?.['@context'],
      contextLoader: this.contextLoader,
      propertyScope: true
    });
    return new ActiveContext({activeCtx, previous: this});
  }

  async applyTypeScopedContexts({objectTypes}) {
    // apply type-scoped contexts in lexicographically type-sorted order
    // (per JSON-LD spec)
    objectTypes = [...objectTypes].sort();
    let activeCtx = this._activeCtx;
    for(const type of objectTypes) {
      activeCtx = await _updateActiveContext({
        activeCtx,
        contexts: activeCtx.termMap.get(type)?.['@context'],
        contextLoader: this.contextLoader,
        typeScope: true
      });
    }
    return new ActiveContext({activeCtx, previous: this});
  }

  getTypeTerms() {
    return this.typeTerms;
  }

  getIdForTerm({term, plural}) {
    return this.contextLoader.getIdForTerm({term, plural});
  }

  getTermDefinition({term}) {
    return this._activeCtx.termMap.get(term) ?? {};
  }

  getTermInfo({id}) {
    // get term and term definition
    const {term, plural} = this.contextLoader.getTermForId({id});
    const def = this._activeCtx.termMap.get(term) ?? {};
    return {term, termId: id, plural, def};
  }
}

function _createNewActiveContext() {
  return {
    // FIXME: determine if `context` is reliable after reverting, perhaps
    // remove entirely as unnecessary
    context: {},
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
    if(top && (k === 'protected' || k === 'propagate')) {
      continue;
    }
    if(!_deepEqual(obj1[k], obj2[k])) {
      return false;
    }
  }
  return true;
}

function _resolveCuries({activeCtx, context, termMap}) {
  for(const def of termMap.values()) {
    const id = def['@id'];
    const type = def['@type'];
    if(id !== undefined) {
      def['@id'] = _resolveCurie({activeCtx, context, possibleCurie: id});
    }
    if(type !== undefined) {
      def['@type'] = _resolveCurie({activeCtx, context, possibleCurie: type});
    }
  }
}

function _resolveCurie({activeCtx, context, possibleCurie}) {
  if(possibleCurie === undefined || !possibleCurie.includes(':')) {
    return possibleCurie;
  }
  // check for potential CURIE values
  const [prefix, ...suffix] = possibleCurie.split(':');
  const prefixDef = context[prefix] ?? activeCtx.termMap.get(prefix);
  if(prefixDef === undefined) {
    // no CURIE
    return possibleCurie;
  }
  // handle CURIE
  const id = typeof prefixDef === 'string' ? prefixDef : prefixDef['@id'];
  possibleCurie = id + suffix.join(':');
  return _resolveCurie({activeCtx, context, possibleCurie});
}

function _revertActiveContext({activeCtx}) {
  const newActiveCtx = {...activeCtx._activeCtx};
  const newTermMap = new Map();

  // keep every propagating term
  const {termMap} = activeCtx._activeCtx;
  const nonPropagating = [];
  for(const [term, def] of termMap) {
    if(!def.propagate) {
      nonPropagating.push(term);
      continue;
    }
    newTermMap.set(term, def);
  }

  // revert every non-propagating term
  for(const term of nonPropagating) {
    let currentCtx = activeCtx;
    let def;
    do {
      currentCtx = currentCtx.previous;
      def = currentCtx._activeCtx.termMap.get(term);
    } while(def !== undefined && !def.propagate);
    if(def !== undefined) {
      newTermMap.set(term, def);
    }
  }
  newActiveCtx.termMap = newTermMap;

  return newActiveCtx;
}

async function _updateActiveContext({
  activeCtx, contexts = [{}], contextLoader,
  propertyScope = false, typeScope = false
}) {
  // normalize new contexts to an array
  if(!Array.isArray(contexts)) {
    contexts = [contexts];
  }

  const allowProtectedOverride = propertyScope;
  const propagateDefault = typeScope ? false : true;

  // load each context
  for(let context of contexts) {
    // load and get newly resolved context
    const entry = await contextLoader.load({activeCtx, context});
    ({context} = entry);

    // clone entry to create new active context on top of active context
    const propagate = context['@propagate'] ?? propagateDefault;
    const newActiveCtx = {
      context,
      // shallow-copy term definitions and set `propagate` value
      termMap: new Map([...entry.termMap.entries()].map(
        ([k, v]) => [k, {...v, propagate}]))
    };

    // resolve any CURIE values in definitions
    const {termMap} = newActiveCtx;
    _resolveCuries({activeCtx, context, termMap});

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
          // ensure `def` remains protected, propagation can change as it
          // does not affect protection
          def = {...value, propagate: def.propagate};
        }
      } else if(context[key] !== null) {
        termMap.set(key, value);
      }
    }

    // update active context
    activeCtx = newActiveCtx;
  }

  return activeCtx;
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
