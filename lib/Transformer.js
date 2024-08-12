/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  LEGACY_TYPE_TABLE_ENCODED_AS_BYTES,
  TYPE_TABLE_ENCODED_AS_BYTES
} from './helpers.js';
import {CborldError} from './CborldError.js';
import {ContextProcessor} from './ContextProcessor.js';

export class Transformer {
  /**
   * Creates a new Transformer for transforming CBOR-LD <=> JSON-LD.
   *
   * @param {object} options - The options to use.
   * @param {object} options.strategy - The transformation strategy to use,
   *   e.g., a compressor or decompressor.
   * @param {ContextProcessor} options.contextProcessor - The context
   *   processor to use to process JSON-LD contexts.
   * @param {Map} options.typeTable - A map of possible value types, including
   *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
   *   another map of values of that type to their associated CBOR-LD integer
   *   values.
   * @param {boolean} [options.legacy=false] - True if legacy mode is in
   *   effect, false if not.
   */
  constructor({
    strategy, contextProcessor, typeTable, legacy = false
  } = {}) {
    this.strategy = strategy;
    this.legacy = legacy;
    this.contextProcessor = contextProcessor;

    this.typeTableEncodedAsBytes = legacy ?
      LEGACY_TYPE_TABLE_ENCODED_AS_BYTES : TYPE_TABLE_ENCODED_AS_BYTES;

    // ensure `typeTable` has empty maps for core types
    this.typeTable = new Map(typeTable);
    if(!this.typeTable.has('context')) {
      this.typeTable.set('context', new Map());
    }
    if(!this.typeTable.has('url')) {
      this.typeTable.set('url', new Map());
    }
    if(!this.typeTable.has('none')) {
      this.typeTable.set('none', new Map());
    }
  }

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
    // FIXME: rename `obj` and `transformMap`, first is JSON-LD element,
    // second is CBOR-LD element
    // FIXME: consider renaming `Tranformer` to `Converter`, it is only
    // ever used for JSON-LD <=> CBOR-LD, and it converts using abstract
    // data model elements (JSON-LD element <=> CBOR-LD element)

    // transform contexts according to strategy
    const {strategy} = this;
    strategy._transformContexts?.({obj, transformMap});

    // FIXME: move context processing behind context processor API

    // apply embedded contexts in the object
    const {contextProcessor} = this;
    let activeCtx = await contextProcessor.applyEmbeddedContexts({
      obj, contextStack
    });

    // get unique `@type` (and alias) values for the object
    const objectTypes = strategy._getObjectTypes({
      obj, transformMap, activeCtx
    });

    // preserve context stack before applying type-scoped contexts
    const childContextStack = contextStack.slice();

    // apply type-scoped contexts
    activeCtx = await contextProcessor.applyTypeScopedContexts({
      objectTypes, contextStack
    });

    // walk term entries to transform
    const termEntries = strategy._getEntries({
      obj, transformMap, transformer: this, termMap: activeCtx.termMap
    });
    for(const [termInfo, value] of termEntries) {
      const {term} = termInfo;

      // apply any property-scoped context
      const {
        newActiveCtx, propertyContextStack
      } = await contextProcessor.applyPropertyScopedContext({
        // use `childContextStack` when processing properties type-scoped
        // contexts will not be applicable to children of this object
        // FIXME: based on default `@propagate: false`, if `@propagate: true`,
        // then `contextStack` should be used instead
        activeCtx, contextStack: childContextStack, term
      });

      // TODO: support `@propagate: false` on property-scoped contexts by
      // cloning context stack and reverting it when recursing; until
      // then throw an error if it is set

      // iterate through all values for the current transform entry
      const {plural, def} = termInfo;
      const termType = this._getTermType({
        activeCtx: newActiveCtx || activeCtx, def
      });
      const values = plural ? value : [value];
      const entries = [];
      for(const value of values) {
        // `null` is never transformed
        if(value === null) {
          entries.push(null);
          continue;
        }

        // try to transform value
        if(strategy._transformValue({entries, termType, value, termInfo})) {
          continue;
        }

        // transform array
        if(Array.isArray(value)) {
          await strategy._transformArray({
            entries, contextStack: propertyContextStack, value
          });
          continue;
        }

        // transform object
        await strategy._transformObject({
          entries, contextStack: propertyContextStack, value
        });
      }

      // revert property-scoped active context if one was created
      if(newActiveCtx) {
        newActiveCtx.revert();
      }

      strategy._assignEntries({entries, obj, transformMap, termInfo});
    }

    // revert active context for this object
    activeCtx.revert();
  }

  _getTermType({activeCtx, def}) {
    // FIXME: consider making `def` hold keyword value for any keyword and
    // handle that here; consider always returning a termType from here instead
    // of using a helper
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
}
