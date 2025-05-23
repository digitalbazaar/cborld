/*!
 * Copyright (c) 2021-2025 Digital Bazaar, Inc. All rights reserved.
 */
import {
  LEGACY_TYPE_TABLE_ENCODED_AS_BYTES,
  TYPE_TABLE_ENCODED_AS_BYTES
} from './helpers.js';
import {ActiveContext} from './ActiveContext.js';
import {ContextLoader} from './ContextLoader.js';

export class Converter {
  /**
   * Creates a new Converter for converting CBOR-LD <=> JSON-LD.
   *
   * @param {object} options - The options to use.
   * @param {object} options.strategy - The conversion strategy to use,
   *   e.g., a compressor or decompressor.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {boolean} [options.legacy=false] - True if legacy mode is in
   *   effect, false if not.
   */
  constructor({strategy, documentLoader, legacy = false} = {}) {
    this.strategy = strategy;
    this.legacy = legacy;
    const contextLoader = new ContextLoader({
      documentLoader, buildReverseMap: !!strategy.reverseTypeTable
    });
    this.contextLoader = contextLoader;
    this.initialActiveCtx = new ActiveContext({contextLoader});

    // FIXME: consider moving to strategies for better separation of concerns
    this.typeTableEncodedAsBytesSet = legacy ?
      LEGACY_TYPE_TABLE_ENCODED_AS_BYTES : TYPE_TABLE_ENCODED_AS_BYTES;
  }

  /**
   * CBOR-LD is a semantic compression format; it uses the contextual
   * information provided by JSON-LD contexts to compress JSON-LD objects
   * to CBOR-LD (and vice versa).
   *
   * This `convert()` function is used to either convert from JSON-LD to
   * CBOR-LD (compression) or vice versa (decompression). The type of
   * conversion (compression or decompression) is called a `strategy`; this
   * `strategy` is passed to the `Converter` constructor so it can be used
   * during conversion.
   *
   * When compressing, the conversion maps JSON keys (strings) encountered in
   * the JSON-LD object to CBOR-LD IDs (integers) and value encoders.
   *
   * When decompressing, the conversion maps CBOR-LD IDs (integers) and
   * decoded values from value decoders.
   *
   * A follow-on process can then serialize these abstract outputs to either
   * JSON or CBOR by using the `cborg` library.
   *
   * In order to match each JSON key / CBOR-LD ID with the right context term
   * definition, it's important to understand how context is applied in
   * JSON-LD, i.e., which context is "active" at a certain place in the input.
   *
   * There are three ways contexts become active:
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
   * The internal conversion process follows this basic algorithm, which takes
   * an input and an output (to be populated):
   *
   * 1. Converting any contexts in the input (i.e., "embedded contexts") and
   *    producing an active context for converting other elements in the input.
   *    Every term in the top-level contexts (excludes scoped-contexts) will be
   *    auto-assigned CBOR-LD IDs.
   * 2. Getting all type information associated with the input and using it
   *    to update the active context. Any terms from any type-scoped contexts
   *    will be auto-assigned CBOR-LD IDs.
   * 3. For every term => value(s) entry in the input:
   *    3.1. Update the active context using any property-scoped contextt
   *         associated with the term. Any terms in this property-scoped
   *         context will be auto-assigned CBOR-LD IDs.
   *    3.2. Create an array of outputs to be populated from converting
   *         all of the value(s).
   *    3.3. For every value in value(s), perform conversion:
   *         3.3.1. If the value is `null`, add it to the outputs as-is and
   *                continue.
   *         3.3.2. Try to use the strategy to convert the value; this involves
   *                checking the value type and using value-specific codecs,
   *                only values that must be recursed (e.g., objects and
   *                arrays) will not be converted by a strategy; add any
   *                successfully converted value to the outputs and continue.
   *         3.2.3. If the value is an array, create an output array and
   *                recursively convert each of its elements; add the output
   *                array to the outputs and continue.
   *         3.2.4. Create a new output according to the strategy, add it to
   *                the outputs and recurse with the value as the new input
   *                and the new output as the new output.
   *    3.4. Add an term => value(s) entry to the output using the current term
   *         information and the outputs as the value(s).
   *
   * @param {object} options - The options to use.
   * @param {Map|object} options.input - The input to convert.
   *
   * @returns {Promise<Map|object>} - The output.
   */
  async convert({input} = {}) {
    // handle single or multiple inputs
    const isArray = Array.isArray(input);
    const inputs = isArray ? input : [input];
    const outputs = [];
    // note: could be performed in parallel as long as order is preserved
    for(const input of inputs) {
      const output = this.strategy.createNewOutput();
      outputs.push(await this._convert({input, output}));
    }
    return isArray ? outputs : outputs[0];
  }

  async _convert({activeCtx = this.initialActiveCtx, input, output}) {
    // convert contexts according to strategy
    const {strategy} = this;
    activeCtx = await strategy.convertContexts({activeCtx, input, output});

    // get unique `@type` (and alias) values for the input
    const objectTypes = strategy.getObjectTypes({
      activeCtx, input, output, converter: this
    });

    // apply type-scoped contexts
    activeCtx = await activeCtx.applyTypeScopedContexts({objectTypes});

    // walk each term => value(s) input entry to convert them all
    const termEntries = strategy.getInputEntries({activeCtx, input});
    for(const [termInfo, value] of termEntries) {
      // apply any property-scoped context for `term` to get active context
      // to use with each value
      const {term} = termInfo;
      const valueActiveCtx = await activeCtx.applyPropertyScopedContext({term});

      // iterate through all values for the current term to produce new outputs
      const {plural, def: {'@type': termType}} = termInfo;
      const values = plural ? value : [value];
      const outputs = [];
      // note: could be performed in parallel as long as order is preserved
      for(const value of values) {
        outputs.push(await this._convertValue({
          activeCtx: valueActiveCtx, termType, value, termInfo
        }));
      }
      strategy.addOutputEntry({
        termInfo, values: plural ? outputs : outputs[0], output
      });
    }
    return output;
  }

  async _convertValue({activeCtx, termType, value, termInfo}) {
    // `null` is never converted
    if(value === null) {
      return null;
    }
    // convert value via strategy if possible
    let output = this.strategy.convertValue({
      termType, value, termInfo, converter: this
    });
    if(output !== undefined) {
      return output;
    }
    if(Array.isArray(value)) {
      // recurse into array
      const array = value;
      const outputs = [];
      // note: could be performed in parallel as long as order is preserved
      for(const value of array) {
        outputs.push(await this._convertValue({
          activeCtx, termType, value, termInfo
        }));
      }
      return outputs;
    }
    // recurse into object and populate new output
    output = this.strategy.createNewOutput();
    return this._convert({activeCtx, input: value, output});
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
