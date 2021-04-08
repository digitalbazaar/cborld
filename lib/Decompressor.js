/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {Transformer} from './Transformer.js';
// FIXME: make extensible
import {UriDecoder} from './codecs/UriDecoder.js';
import {VocabTermDecoder} from './codecs/VocabTermDecoder.js';
import {XsdDateDecoder} from './codecs/XsdDateDecoder.js';
import {XsdDateTimeDecoder} from './codecs/XsdDateTimeDecoder.js';
import {KEYWORDS} from './keywords.js';

// FIXME: move elsewhere
// const COMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x01]);
// const UNCOMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x00]);

// FIXME: move elsewhere
const TYPE_DECODERS = new Map([
  ['@id', UriDecoder],
  ['@vocab', VocabTermDecoder],
  // FIXME: ['https://w3id.org/security#multibase', MultibaseDecoder]
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateDecoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeDecoder]
]);

// FIXME: move elsewhere
const CONTEXT_TERM_ID = 0;

export class Decompressor extends Transformer {
  /**
   * Creates a new Decompressor for generating a JSON-LD document from
   * compressed CBOR-LD. The created instance may only be used on a single
   * CBOR-LD input at a time.
   *
   * @param {object} options - The options to use when encoding to CBOR-LD.
   * @param {documentLoaderFunction} options.documentLoader - The document
   *   loader to use when resolving JSON-LD Context URLs.
   * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
   *   their encoded CBOR-LD values (must be values greater than 32767
   *   (0x7FFF)).
   */
  constructor({appContextMap, documentLoader} = {}) {
    super({appContextMap, documentLoader});
    // FIXME: rename `appContextMap`
    this.appContextMap = new Map();
    // FIXME: we need to pass a reverse map... or we need to build it
    if(appContextMap) {
      for(const [k, v] of appContextMap) {
        this.appContextMap.set(v, k);
      }
    }
  }

  /**
   * Decompresses the given CBOR-LD byte array to a JSON-LD document.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.cborldBytes - The CBOR-LD bytes.
   *
   * @returns {Promise<object>} - The JSON-LD document.
   */
  async decompress({cborldBytes} = {}) {
    this.contextMap = new Map();
    this.termToId = new Map(KEYWORDS);
    this.idToTerm = new Map();
    for(const [term, id] of this.termToId) {
      this.idToTerm.set(id, term);
    }

    // const tags = [];
    // tags[0x0501] = function(obj) {
    //   // FIXME: ensure `obj` is a map
    //   // FIXME: go through the map and for each key, get the decoder and
    //   // apply it to decompress the values
    //   console.log('decode obj', obj);
    //   return obj;
    // };
    // tags[0x0500] = function(obj) {
    //   // FIXME: ensure `obj` is a map
    //   console.log('decode obj', obj);
    //   // FIXME: figure out what to do with the map... anything?
    //   return obj;
    // };
    //console.log(
    //  'decoded', cborg.decode(newCborldBytes, {tags, useMaps: true}));

    // FIXME: may be an array or a map; if array, loop and decode each one
    const transformMap = cborg.decode(cborldBytes, {useMaps: true});
    console.log('decoded transformMap', transformMap);

    // // handle single or multiple JSON-LD docs
    // const encoders = [];
    // const isArray = Array.isArray(jsonldDocument);
    // const docs = isArray ? jsonldDocument : [jsonldDocument];
    // for(const obj of docs) {
    //   // FIXME: change to return `encoderMap` instead of passing it in
    //   // recursively walk the JSON-LD document, building the encoding map
    //   const encodingMap = new Map();
    //   await this._buildEncoderMap({obj, encodingMap});
    //   encoders.push(encodingMap);
    // }
    // return isArray ? encoders : encoders[0];

    // recursively walk the map, building the JSON-LD document
    const obj = {};
    await this._transform({obj, transformMap});
    console.log('decoded', obj);

    return obj;
  }

  _beforeObjectContexts({obj, transformMap}) {
    const {appContextMap} = this;

    // decode `@context` for `transformMap`, if any
    const encodedContext = transformMap.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      const decoder = ContextDecoder.createDecoder(
        {value: encodedContext, appContextMap});
      obj['@context'] = decoder ?
        decoder.decode({value: encodedContext}) : encodedContext;
    }
    const encodedContexts = transformMap.get(CONTEXT_TERM_ID + 1);
    if(encodedContexts) {
      if(encodedContext) {
        // FIXME: change to CBOR-LD error
        throw new Error('invalid encoded context');
      }
      const entries = [];
      for(const value of encodedContexts) {
        const decoder = ContextDecoder.createDecoder({value, appContextMap});
        entries.push(decoder ? decoder.decode({value}) : value);
      }
      obj['@context'] = entries;
    }
  }

  _beforeTypeScopedContexts({activeCtx, obj, transformMap}) {
    // decode object types
    const {termToId} = this;
    const typeTerms = ['@type', ...activeCtx.aliases.type];
    for(const term of typeTerms) {
      const encodedTypes = transformMap.get(termToId.get(term));
      if(encodedTypes !== undefined) {
        const decoder = new VocabTermDecoder();
        if(Array.isArray(encodedTypes)) {
          obj[term] = encodedTypes.map(
            value => decoder.decode({value, termToId}));
        } else {
          obj[term] = decoder.decode({value: encodedTypes, termToId});
        }
      }
    }
  }

  _getEntries({transformMap}) {
    // return entries in the transform map skipping `@context`
    const pluralId = CONTEXT_TERM_ID + 1;
    return [...transformMap.entries()].filter(
      ([k]) => k !== CONTEXT_TERM_ID && k !== pluralId);
  }

  _getTermInfo({termMap, key}) {
    // check for undefined term IDs
    const {term, plural} = this._getTermForId({id: key});
    if(term === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM_ID',
        `Unknown term ID '${key}' was detected in JSON-LD input.`);
    }

    // check for undefined term
    const def = termMap.get(term);
    if(def === undefined && !(term.startsWith('@') && KEYWORDS.has(term))) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    return {term, termId: key, plural, def};
  }

  _handleObjectId({obj, termInfo, value}) {
    const decoder = UriDecoder.createDecoder({value});
    obj[termInfo.term] = decoder ? decoder.decode({value}) : value;
  }

  _handleObjectType({obj, termInfo, value}) {
    const {idToTerm} = this;
    const {term, plural, def} = termInfo;
    const values = plural ? value : [value];
    const entries = [];
    for(const value of values) {
      const decoder = VocabTermDecoder.createDecoder({value, def, idToTerm});
      entries.push(decoder ? decoder.decode({value, idToTerm}) : value);
    }
    obj[term] = plural ? entries : entries[0];
  }

  _handleTypedValue({entries, termType, value, termInfo}) {
    const {idToTerm} = this;
    const {def} = termInfo;
    const DecoderClass = TYPE_DECODERS.get(termType);
    const decoder = DecoderClass && DecoderClass.createDecoder(
      {value, def, idToTerm});
    console.log('decoder', decoder);
    if(decoder) {
      entries.push(decoder.decode({value, idToTerm}));
      return true;
    }
  }

  async _handleArray({entries, contextStack, value}) {
    // recurse into array
    const children = [];
    for(const transformMap of value) {
      const obj = {};
      children.push(obj);
      await this._transform({obj, transformMap, contextStack});
    }
    entries.push(children);
  }

  async _handleObject({entries, childContextStack, value}) {
    // recurse into object
    const child = {};
    entries.push(child);
    console.log('recursing into', value);
    return this._transform({
      obj: child, transformMap: value, contextStack: childContextStack
    });
  }

  _assignEntries({entries, obj, termInfo}) {
    const {term, plural} = termInfo;
    obj[term] = plural ? entries : entries[0];
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
