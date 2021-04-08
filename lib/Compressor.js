/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {CborldEncoder} from './codecs/CborldEncoder.js';
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {Transformer} from './Transformer.js';
import {UriEncoder} from './codecs/UriEncoder.js';
// FIXME: make extensible
import {VocabTermEncoder} from './codecs/VocabTermEncoder.js';
import {XsdDateEncoder} from './codecs/XsdDateEncoder.js';
import {XsdDateTimeEncoder} from './codecs/XsdDateTimeEncoder.js';
import {inspect} from './util.js';
import {KEYWORDS} from './keywords.js';

// FIXME: move elsewhere
const TYPE_ENCODERS = new Map([
  ['@id', UriEncoder],
  ['@vocab', VocabTermEncoder],
  // FIXME: ['https://w3id.org/security#multibase', MultibaseEncoder]
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateEncoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeEncoder]
]);

const CONTEXT_TERM_ID = 0;

const COMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x01]);

// override cborg object encoder to use cborld encoders
const typeEncoders = {
  Object(obj) {
    if(obj instanceof CborldEncoder) {
      return obj.encode({obj});
    }
  }
};

export class Compressor extends Transformer {
  /**
   * Creates a new Compressor for generating compressed CBOR-LD from a
   * JSON-LD document. The created instance may only be used on a single
   * JSON-LD document at a time.
   *
   * @param {object} options - The options to use when encoding to CBOR-LD.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
   *   their encoded CBOR-LD values (must be values greater than 32767
   *   (0x7FFF)).
   */
  constructor({appContextMap, documentLoader} = {}) {
    super({appContextMap, documentLoader});
  }

  /**
   * Compresses the given JSON-LD document into a CBOR-LD byte array.
   *
   * @param {object} options - The options to use.
   * @param {object} options.jsonldDocument - The JSON-LD Document to convert
   *   to CBOR-LD bytes.
   * @param {diagnosticFunction} [options.diagnose] - A function that, if
   * provided, is called with diagnostic information.
   *
   * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
   */
  async compress({jsonldDocument, diagnose} = {}) {
    const encoders = await this._createEncoders({jsonldDocument});
    console.log('encoders', encoders);

    const suffix = cborg.encode(encoders, {typeEncoders});
    const length = COMPRESSED_PREFIX.length + suffix.length;
    const bytes = new Uint8Array(length);
    bytes.set(COMPRESSED_PREFIX);
    bytes.set(suffix, COMPRESSED_PREFIX.length);
    console.log('compressed suffix', new Uint8Array(suffix));
    console.log('total compressed bytes', bytes);
    console.log('total compressed hex', Buffer.from(bytes).toString('hex'));

    if(diagnose) {
      diagnose(inspect(encoders, {depth: null, colors: true}));
    }

    // FIXME: return bytes instead
    //return bytes;
    return suffix;
  }

  async _createEncoders({jsonldDocument}) {
    // initialize state
    this.contextMap = new Map();
    this.termToId = new Map(KEYWORDS);
    // FIXME: do not calculate this, not needed for compression
    this.idToTerm = new Map();
    for(const [term, id] of this.termToId) {
      this.idToTerm.set(id, term);
    }

    // handle single or multiple JSON-LD docs
    const encoders = [];
    const isArray = Array.isArray(jsonldDocument);
    const docs = isArray ? jsonldDocument : [jsonldDocument];
    for(const obj of docs) {
      // FIXME: change to return `encoderMap` instead of passing it in
      // recursively walk the JSON-LD document, building the encoding map
      const encodingMap = new Map();
      await this._buildEncoderMap({obj, encodingMap});
      encoders.push(encodingMap);
    }

    return isArray ? encoders : encoders[0];
  }

  async _buildEncoderMap({obj, encodingMap, contextStack = []}) {
    // FIXME: clean up
    const {termToId, appContextMap} = this;

    // apply embedded contexts in the object
    let activeCtx = await this._applyEmbeddedContexts({obj, contextStack});

    // preserve context stack before applying type-scoped contexts
    const childContextStack = contextStack.slice();

    // TODO: support `@propagate: true` on type-scoped contexts; until then
    // add an error if it is set

    // apply type-scoped contexts
    activeCtx = await this._applyTypeScopedContexts({obj, contextStack});

    // if `@context` is present in the object, encode it first
    const context = obj['@context'];
    if(context) {
      const entries = [];
      const isArray = Array.isArray(context);
      const contexts = isArray ? context : [context];
      for(const value of contexts) {
        // FIXME: create a class for the top-level encoder/processor and pass
        // it instead of `appContextMap`
        const encoder = ContextEncoder.createEncoder({value, appContextMap});
        entries.push(encoder || value);
      }
      const id = isArray ? CONTEXT_TERM_ID + 1 : CONTEXT_TERM_ID;
      encodingMap.set(id, isArray ? entries : entries[0]);
    }

    // walk all the keys in the object in sorted order
    const keys = Object.keys(obj).sort();
    const {aliases, scopedContextMap, termMap} = activeCtx;
    for(const key of keys) {
      if(key === '@context') {
        // context already processed first
        continue;
      }

      // check for undefined terms
      const def = termMap.get(key);
      if(def === undefined && !(key.startsWith('@') && KEYWORDS.has(key))) {
        throw new CborldError(
          'ERR_UNKNOWN_CBORLD_TERM',
          `Unknown term '${key}' was detected in JSON-LD input.`);
      }

      // get value(s) for the given key
      let values = obj[key];
      const isArray = Array.isArray(values);

      const termId = this._getIdForTerm({term: key, plural: isArray});
      console.log('termId', termId);

      // handle `@id`, which must have a single value
      if(key === '@id' || aliases.id.has(key)) {
        const value = obj[key];
        const encoder = UriEncoder.createEncoder({value, def, termToId});
        encodingMap.set(termId, encoder || value);
        continue;
      }

      const entries = [];
      if(!isArray) {
        values = [values];
      }

      // handle `@type`
      if(key === '@type' || aliases.type.has(key)) {
        for(const value of values) {
          const encoder = VocabTermEncoder.createEncoder(
            {value, def, termToId});
          entries.push(encoder || value);
        }
        encodingMap.set(termId, isArray ? entries : entries[0]);
        continue;
      }

      // apply any property-scoped context; use `childContextStack` when
      // recursing as it properly preserves/reverts the current object's
      // type-scoped contexts
      let newActiveCtx;
      const propertyScopedContext = scopedContextMap.get(key);
      if(propertyScopedContext) {
        // TODO: support `@propagate: false` on property-scoped contexts
        newActiveCtx = await this._applyEmbeddedContexts({
          obj: {'@context': propertyScopedContext},
          contextStack: childContextStack, scoped: true
        });
      }

      for(const value of values) {
        // simple-encode `null`
        if(value === null) {
          entries.push(null);
          continue;
        }

        // try to get a type-based encoder for the value
        const termType = this._getTermType(
          {activeCtx: newActiveCtx || activeCtx, def});
        console.log('termType', termType);
        const EncoderClass = TYPE_ENCODERS.get(termType);
        const encoder = EncoderClass && EncoderClass.createEncoder(
          {value, def, termToId});
        console.log('encoder', encoder);
        if(encoder) {
          entries.push(encoder);
          continue;
        }

        if(typeof value !== 'object') {
          // no matching encoder available and cannot recurse
          entries.push(value);
          continue;
        }

        // recurse into each element of an array
        if(Array.isArray(value)) {
          const children = [];
          for(const obj of value) {
            const childMap = new Map();
            children.push(childMap);
            await this._buildEncoderMap({
              obj, encodingMap: childMap, contextStack: childContextStack
            });
          }
          entries.push(children);
          continue;
        }

        // recurse into object
        const childMap = new Map();
        entries.push(childMap);
        console.log('recursing into', value);
        await this._buildEncoderMap({
          obj: value, encodingMap: childMap, contextStack: childContextStack
        });
      }

      // revert property-scoped active context if one was created
      if(newActiveCtx) {
        newActiveCtx.revert();
      }

      encodingMap.set(termId, isArray ? entries : entries[0]);
    }

    // revert active context for this object
    activeCtx.revert();
  }
}

/**
 * A diagnostic function that is called with diagnostic information. Typically
 * set to `console.log` when debugging.
 *
 * @callback diagnosticFunction
 * @param {string} message - The diagnostic message.
 */

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
