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
    const jsonldDocument = {};

    this.contextMap = new Map();
    // FIXME: don't need `termToId` for decompression, only the reverse map
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
    const encodedMap = cborg.decode(cborldBytes, {useMaps: true});
    console.log('decoded encodedMap', encodedMap);

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
    await this._recursiveDecode({encodedMap, obj: jsonldDocument});
    console.log('decoded', jsonldDocument);

    return jsonldDocument;
  }

  async _recursiveDecode({encodedMap, obj, contextStack = []}) {
    // FIXME: clean up
    const {idToTerm, appContextMap} = this;

    // FIXME: this is specific to decode, could abstract into a function
    // decode `@context` for `encodedMap`, if any
    const encodedContext = encodedMap.get(CONTEXT_TERM_ID);
    if(encodedContext) {
      const decoder = ContextDecoder.createDecoder(
        {encoded: encodedContext, appContextMap});
      obj['@context'] = decoder ?
        decoder.decode({encoded: encodedContext}) : encodedContext;
    }
    const encodedContexts = encodedMap.get(CONTEXT_TERM_ID + 1);
    if(encodedContexts) {
      if(encodedContext) {
        // FIXME: change to CBOR-LD error
        throw new Error('invalid encoded context');
      }
      const entries = [];
      for(const encoded of encodedContexts) {
        const decoder = ContextDecoder.createDecoder({encoded, appContextMap});
        entries.push(decoder ? decoder.decode({encoded}) : encoded);
      }
      obj['@context'] = entries;
    }

    // apply embedded contexts in the object
    let activeCtx = await this._applyEmbeddedContexts({obj, contextStack});

    // TODO: support `@propagate: true` on type-scoped contexts; until then
    // add an error if it is set

    // preserve context stack before applying type-scoped contexts
    const childContextStack = contextStack.slice();

    // FIXME: specific to decoding transformation
    // decode object types
    const {termToId} = this;
    const typeTerms = ['@type', ...activeCtx.aliases.type];
    for(const term of typeTerms) {
      const encodedTypes = encodedMap.get(termToId.get(term));
      if(encodedTypes !== undefined) {
        const decoder = new VocabTermDecoder();
        if(Array.isArray(encodedTypes)) {
          obj[term] = encodedTypes.map(
            encoded => decoder.decode({encoded, termToId}));
        } else {
          obj[term] = decoder.decode({encoded: encodedTypes, termToId});
        }
      }
    }

    // apply type-scoped contexts
    activeCtx = await this._applyTypeScopedContexts({obj, contextStack});

    // FIXME: during compression we walk the object in sorted order; here
    // we just walk the encoded map... can we abstract? btw, does sorted
    // order even matter (i don't think so)... so it could just be a
    // subclass that asks for the entries to iterate over

    // walk the encoded map
    const {aliases, scopedContextMap, termMap} = activeCtx;
    for(const [key, encoded] of encodedMap) {
      // FIXME: both encode and decode skip `@context` processing... but
      // how they determine the key is a context is different
      if(key === CONTEXT_TERM_ID || key === (CONTEXT_TERM_ID + 1)) {
        // context already processed first
        continue;
      }

      // FIXME: both encode/decode check for undefined terms
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

      // handle `@id`, which must have a single value
      if(term === '@id' || aliases.id.has(term)) {
        const decoder = UriDecoder.createDecoder({encoded});
        obj[term] = decoder ? decoder.decode({encoded}) : encoded;
        continue;
      }

      const encodedValues = plural ? encoded : [encoded];
      const entries = [];

      // handle `@type`
      if(term === '@type' || aliases.type.has(term)) {
        for(const encoded of encodedValues) {
          const decoder = VocabTermDecoder.createDecoder(
            {encoded, def, idToTerm});
          entries.push(decoder ? decoder.decode({encoded, idToTerm}) : encoded);
        }
        obj[term] = plural ? entries : entries[0];
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

      for(const encodedValue of encodedValues) {
        // `null` already decoded
        if(encodedValue === null) {
          entries.push(null);
          continue;
        }

        // try to get a type-based decoder for the value
        const termType = this._getTermType(
          {activeCtx: newActiveCtx || activeCtx, def});
        console.log('termType', termType);
        const DecoderClass = TYPE_DECODERS.get(termType);
        const decoder = DecoderClass && DecoderClass.createDecoder(
          {encoded: encodedValue, def, idToTerm});
        console.log('decoder', decoder);
        if(decoder) {
          entries.push(decoder.decode({encoded: encodedValue, idToTerm}));
          continue;
        }

        if(typeof encodedValue !== 'object') {
          // no matching decoder available and cannot recurse
          entries.push(encodedValue);
          continue;
        }

        // recurse into each element of an array
        if(Array.isArray(encodedValue)) {
          const children = [];
          for(const ev of encodedValue) {
            const child = {};
            children.push(child);
            await this._recursiveDecode({
              encodedMap: ev, obj: child, contextStack: childContextStack
            });
          }
          entries.push(children);
          continue;
        }

        // recurse into object
        const child = {};
        entries.push(child);
        console.log('recursing into', encodedValue);
        await this._recursiveDecode({
          encodedMap: encodedValue, obj: child, contextStack: childContextStack
        });
      }

      // revert property-scoped active context if one was created
      if(newActiveCtx) {
        newActiveCtx.revert();
      }

      obj[term] = plural ? entries : entries[0];
    }

    // revert active context for this object
    activeCtx.revert();
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
