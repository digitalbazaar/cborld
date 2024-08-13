/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  LEGACY_TYPE_TABLE_ENCODED_AS_BYTES,
  TYPE_TABLE_ENCODED_AS_BYTES
} from './helpers.js';
import {ActiveContext} from './ActiveContext.js';
import {ContextLoader} from './ContextLoader.js';

export class Transformer {
  /**
   * Creates a new Transformer for transforming CBOR-LD <=> JSON-LD.
   *
   * @param {object} options - The options to use.
   * @param {object} options.strategy - The transformation strategy to use,
   *   e.g., a compressor or decompressor.
   * @param {ContextLoader} options.contextLoader - The interface used to
   *   load JSON-LD contexts.
   * @param {Map} options.typeTable - A map of possible value types, including
   *  `context`, `url`, `none`, and any JSON-LD type, each of which maps to
   *   another map of values of that type to their associated CBOR-LD integer
   *   values.
   * @param {boolean} [options.legacy=false] - True if legacy mode is in
   *   effect, false if not.
   */
  constructor({
    strategy, contextLoader, typeTable, legacy = false
  } = {}) {
    this.strategy = strategy;
    this.legacy = legacy;
    this.contextLoader = contextLoader;
    this.initialActiveCtx = new ActiveContext({contextLoader});

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

  async convert({input} = {}) {
    // handle single or multiple inputs
    const isArray = Array.isArray(input);
    const inputs = isArray ? input : [input];
    const outputs = [];
    for(const input of inputs) {
      const output = this.strategy._createNewOutput();
      await this._transform({input, output});
      outputs.push(output);
    }
    return isArray ? outputs : outputs[0];
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
   * FIXME: Update as needed according to new implementation.
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
   * @param {ActiveContext} [options.activeCtx] - The current active context.
   * @param {Map|object} options.input - The input to transform.
   * @param {Map|object} options.output - The output to populate.
   */
  async _transform({
    activeCtx = this.initialActiveCtx, input, output
  }) {
    // FIXME: rename `obj` and `transformMap`, first is JSON-LD element,
    // second is CBOR-LD element
    // FIXME: consider renaming `Tranformer` to `Converter`, it is only
    // ever used for JSON-LD <=> CBOR-LD, and it converts using abstract
    // data model elements (JSON-LD element <=> CBOR-LD element)

    // transform contexts according to strategy
    const {strategy} = this;
    activeCtx = await strategy._transformContexts({activeCtx, input, output});

    // get unique `@type` (and alias) values for the input
    const objectTypes = strategy._getObjectTypes({activeCtx, input, output});

    // apply type-scoped contexts
    const typeActiveCtx = await activeCtx.applyTypeScopedContexts({
      objectTypes
    });

    // walk term entries to transform
    const termEntries = strategy._getEntries({
      activeCtx: typeActiveCtx, input, output, transformer: this
    });
    for(const [termInfo, value] of termEntries) {
      const {term} = termInfo;

      // apply any property-scoped context
      const propertyActiveCtx = await typeActiveCtx.applyPropertyScopedContext({
        term
      });

      // FIXME: improve obscure "transform entry" language
      // iterate through all values for the current transform entry
      const {plural, def} = termInfo;
      const termType = def['@type'];
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

        if(Array.isArray(value)) {
          // recurse into array
          await this._transformArray({
            activeCtx: propertyActiveCtx, entries, termType, value, termInfo
          });
          continue;
        }

        // recurse into object and populate new output
        const newOutput = strategy._createNewOutput();
        entries.push(newOutput);
        await this._transform({
          activeCtx: propertyActiveCtx, input: value, output: newOutput
        });
      }

      strategy._assignEntries({
        entries: plural ? entries : entries[0],
        termInfo, input, output
      });
    }
  }

  async _transformArray({activeCtx, entries, termType, value, termInfo}) {
    // recurse into array
    const {strategy} = this;
    const outputs = [];
    for(const input of value) {
      // `null` is never transformed
      if(input === null) {
        outputs.push(null);
        continue;
      }
      // try to transform value
      if(strategy._transformValue({
        entries: outputs, termType, value: input, termInfo
      })) {
        continue;
      }
      if(Array.isArray(input)) {
        // recurse into array of arrays
        await this._transformArray({
          activeCtx, entries: outputs, termType, value: input, termInfo
        });
        continue;
      }
      // recurse into object and populate new output
      const output = strategy._createNewOutput();
      outputs.push(output);
      await this._transform({activeCtx, input, output});
    }
    entries.push(outputs);
  }
}
