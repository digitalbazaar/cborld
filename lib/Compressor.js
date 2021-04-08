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

    // handle single or multiple JSON-LD docs
    const encoders = [];
    const isArray = Array.isArray(jsonldDocument);
    const docs = isArray ? jsonldDocument : [jsonldDocument];
    for(const obj of docs) {
      const transformMap = new Map();
      await this._transform({obj, transformMap});
      encoders.push(transformMap);
    }

    return isArray ? encoders : encoders[0];
  }

  _afterObjectContexts({obj, transformMap}) {
    // if `@context` is present in the object, encode it
    const context = obj['@context'];
    if(!context) {
      return;
    }

    const {appContextMap} = this;
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
    transformMap.set(id, isArray ? entries : entries[0]);
  }

  _getEntries({obj}) {
    // return entries in the object skipping `@context`
    return Object.entries(obj).filter(([k]) => k !== '@context');
  }

  _getTermInfo({termMap, key, value}) {
    // check for undefined terms
    const def = termMap.get(key);
    if(def === undefined && !(key.startsWith('@') && KEYWORDS.has(key))) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }
    const plural = Array.isArray(value);
    const termId = this._getIdForTerm({term: key, plural});
    return {term: key, termId, plural, def};
  }

  _handleObjectId({transformMap, termInfo, value}) {
    const {termToId} = this;
    const {termId, def} = termInfo;
    const encoder = UriEncoder.createEncoder({value, def, termToId});
    transformMap.set(termId, encoder || value);
  }

  _handleObjectType({transformMap, termInfo, value}) {
    const {termToId} = this;
    const {termId, plural, def} = termInfo;
    const values = plural ? value : [value];
    const entries = [];
    for(const value of values) {
      const encoder = VocabTermEncoder.createEncoder({value, def, termToId});
      entries.push(encoder || value);
    }
    transformMap.set(termId, plural ? entries : entries[0]);
  }

  _handleTypedValue({entries, termType, value, termInfo}) {
    const {termToId} = this;
    const {def} = termInfo;
    const EncoderClass = TYPE_ENCODERS.get(termType);
    const encoder = EncoderClass && EncoderClass.createEncoder(
      {value, def, termToId});
    console.log('encoder', encoder);
    if(encoder) {
      entries.push(encoder);
      return true;
    }
  }

  async _handleArray({entries, childContextStack, value}) {
    // recurse into array
    const children = [];
    for(const obj of value) {
      const childMap = new Map();
      children.push(childMap);
      await this._transform({
        obj, transformMap: childMap, contextStack: childContextStack
      });
    }
    entries.push(children);
  }

  async _handleObject({entries, contextStack, value}) {
    // recurse into object
    const transformMap = new Map();
    entries.push(transformMap);
    console.log('recursing into', value);
    await this._transform({obj: value, transformMap, contextStack});
  }

  _assignEntries({entries, transformMap, termInfo}) {
    const {termId, plural} = termInfo;
    transformMap.set(termId, plural ? entries : entries[0]);
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
