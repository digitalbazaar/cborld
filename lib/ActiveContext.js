/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';

export class ActiveContext {
  constructor({
    termMap = new Map(),
    previous,
    contextLoader = previous?.contextLoader,
  } = {}) {
    this.termMap = termMap;
    this.previous = previous;
    this.contextLoader = contextLoader;

    // compute all type terms (`@type` and aliases)
    this.typeTerms = ['@type'];
    for(const [term, def] of termMap) {
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
    // add any local embedded contexts to active term map
    const termMap = await _updateTermMap({
      activeTermMap: this.termMap,
      contexts: obj['@context'],
      contextLoader: this.contextLoader
    });
    return new ActiveContext({termMap, previous: this});
  }

  async applyPropertyScopedContext({term}) {
    // always revert active context's term map when recursing into a property
    // to remove any non-propagating terms
    const termMap = await _updateTermMap({
      activeTermMap: _revertTermMap({activeCtx: this}),
      // get context from current active context (not reverted one)
      contexts: this.termMap.get(term)?.['@context'],
      contextLoader: this.contextLoader,
      propertyScope: true
    });
    return new ActiveContext({termMap, previous: this});
  }

  async applyTypeScopedContexts({objectTypes}) {
    // apply type-scoped contexts in lexicographically type-sorted order
    // (per JSON-LD spec)
    objectTypes = [...objectTypes].sort();
    let {termMap} = this;
    for(const type of objectTypes) {
      termMap = await _updateTermMap({
        activeTermMap: termMap,
        contexts: termMap.get(type)?.['@context'],
        contextLoader: this.contextLoader,
        typeScope: true
      });
    }
    return new ActiveContext({termMap, previous: this});
  }

  getTypeTerms() {
    return this.typeTerms;
  }

  getIdForTerm({term, plural}) {
    return this.contextLoader.getIdForTerm({term, plural});
  }

  getTermDefinition({term}) {
    return this.termMap.get(term) ?? {};
  }

  getTermInfo({id}) {
    // get term and term definition
    const {term, plural} = this.contextLoader.getTermForId({id});
    const def = this.getTermDefinition({term});
    return {term, termId: id, plural, def};
  }
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

function _resolveCuries({activeTermMap, context, newTermMap}) {
  for(const def of newTermMap.values()) {
    const id = def['@id'];
    const type = def['@type'];
    if(id !== undefined) {
      def['@id'] = _resolveCurie({
        activeTermMap, context, possibleCurie: id
      });
    }
    if(type !== undefined) {
      def['@type'] = _resolveCurie({
        activeTermMap, context, possibleCurie: type
      });
    }
  }
}

function _resolveCurie({activeTermMap, context, possibleCurie}) {
  if(possibleCurie === undefined || !possibleCurie.includes(':')) {
    return possibleCurie;
  }
  // check for potential CURIE values
  const [prefix, ...suffix] = possibleCurie.split(':');
  const prefixDef = context[prefix] ?? activeTermMap.get(prefix);
  if(prefixDef === undefined) {
    // no CURIE
    return possibleCurie;
  }
  // handle CURIE
  const id = typeof prefixDef === 'string' ? prefixDef : prefixDef['@id'];
  possibleCurie = id + suffix.join(':');
  return _resolveCurie({activeTermMap, context, possibleCurie});
}

function _revertTermMap({activeCtx}) {
  const newTermMap = new Map();

  // keep every propagating term
  const {termMap} = activeCtx;
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
      def = currentCtx.termMap.get(term);
    } while(def !== undefined && !def.propagate);
    if(def !== undefined) {
      newTermMap.set(term, def);
    }
  }

  return newTermMap;
}

async function _updateTermMap({
  activeTermMap, contexts = [{}], contextLoader,
  propertyScope = false, typeScope = false
}) {
  // normalize new contexts to an array
  if(!Array.isArray(contexts)) {
    contexts = [contexts];
  }

  // set flags based on context scope
  const allowProtectedOverride = propertyScope;
  const propagateDefault = typeScope ? false : true;

  // load each context
  for(let context of contexts) {
    // load and get newly resolved context
    const entry = await contextLoader.load({context});
    ({context} = entry);

    // clone entry `termMap` for creating new active context
    const propagate = context['@propagate'] ?? propagateDefault;
    // shallow-copy term definitions and set `propagate` value
    const newTermMap = new Map([...entry.termMap.entries()].map(
      ([k, v]) => [k, {...v, propagate}]));

    // resolve any CURIE values in definitions
    _resolveCuries({activeTermMap, context, newTermMap});

    // update new terms map based on existing `activeTermMap`
    for(const [term, activeDef] of activeTermMap) {
      let def = newTermMap.get(term);
      if(def !== undefined) {
        // disallow overriding of protected terms unless explicitly permitted
        if(activeDef.protected) {
          if(!allowProtectedOverride && !_deepEqual(def, activeDef, true)) {
            throw new CborldError(
              'ERR_PROTECTED_TERM_REDEFINITION',
              `Unexpected redefinition of protected term "${term}".`);
          }
          // ensure `def` remains protected, propagation can change as it
          // does not affect protection
          def = {...activeDef, propagate: def.propagate};
        }
      } else if(context[term] !== null) {
        // since `context` does not explictly clear `key`, copy it
        newTermMap.set(term, {...activeDef});
      }
    }

    // update active term map
    activeTermMap = newTermMap;
  }

  return activeTermMap;
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
