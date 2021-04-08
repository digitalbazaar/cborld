/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {getActiveContext} from './context2.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
// FIXME: make extensible
import {UriDecoder} from './codecs/UriDecoder.js';
import {VocabTermDecoder} from './codecs/VocabTermDecoder.js';
import {XsdDateDecoder} from './codecs/XsdDateDecoder.js';
import {XsdDateTimeDecoder} from './codecs/XsdDateTimeDecoder.js';

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

// FIXME: move elsewhere
const KEYWORDS = new Map([
  // ordered is important, do not change
  // FIXME: can we alphabetize these? do they all fit into whatever varint max
  // size thing is applied?
  ['@context', 0],
  ['@type', 2],
  ['@id', 4],
  ['@value', 6],
  ['@base', 8],
  ['@language', 10],
  ['@direction', 12],
  ['@graph', 14],
  ['@included', 16],
  ['@json', 18],
  ['@list', 20],
  ['@set', 22],
  ['@index', 24],
  ['@nest', 26],
  ['@reverse', 28],
  // FIXME: remove these? these only appear in frames and contexts
  ['@container', 30],
  ['@default', 32],
  ['@embed', 34],
  ['@explicit', 36],
  ['@none', 38],
  ['@omitDefault', 40],
  ['@prefix', 42],
  ['@preserve', 44],
  ['@protected', 46],
  ['@requireAll', 48],
  ['@version', 50],
  ['@vocab', 52]
]);

export class Decompressor {
  /**
   * Creates a new Decompressor for generating a JSON-LD document from
   * compressed CBOR-LD. The created instance may only be used on a single
   * CBOR-LD input at a time.
   *
   * @param {object} options - The options to use when encoding to CBOR-LD.
   * @param {documentLoaderFunction} options.documentLoader -The document
   *   loader to use when resolving JSON-LD Context URLs.
   * // FIXME: this needs to be a reverse map... or we need to build it
   * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
   *   their encoded CBOR-LD values (must be values greater than 32767
   *   (0x7FFF)).
   */
  constructor({appContextMap, documentLoader} = {}) {
    // FIXME: rename `appContextMap`
    this.appContextMap = new Map();
    if(appContextMap) {
      for(const [k, v] of appContextMap) {
        this.appContextMap.set(v, k);
      }
    }
    this.documentLoader = documentLoader;
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

    // get active context for this object
    const activeCtx = await getActiveContext(
      {obj, encodedMap, contextStack, transformer: this});
    const {childContextStack} = activeCtx;

    // walk the encoded map
    const {aliases, scopedContextMap, termMap} = activeCtx;
    for(const [key, encoded] of encodedMap) {
      if(key === CONTEXT_TERM_ID || key === (CONTEXT_TERM_ID + 1)) {
        // context already processed first
        continue;
      }

      // check for undefined term IDs
      const {term, plural} = _getTermForId({id: key, idToTerm});
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
          if(decoder) {
            entries.push(decoder.decode({encoded, idToTerm}));
          } else {
            entries.push(encoded);
          }
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
        newActiveCtx = await getActiveContext({
          obj: {'@context': propertyScopedContext},
          contextStack: childContextStack, transformer: this, scoped: true
        });
      }

      for(const encodedValue of encodedValues) {
        // `null` already decoded
        if(encodedValue === null) {
          entries.push(null);
          continue;
        }

        // try to get a type-based decoder for the value
        const termType = _getTermType(
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

function _getTermType({activeCtx, def}) {
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
    // FIXME: use CborldError
    throw new Error('Invalid term definition');
  }
  return prefixDef['@id'] + suffix.join(':');
}

function _getTermForId({id, idToTerm}) {
  const plural = (id & 1) === 1;
  const term = idToTerm.get(plural ? id - 1 : id);
  return {term, plural};
}

/**
 * Fetches a resource given a URL and returns it as a string.
 *
 * @callback documentLoaderFunction
 * @param {string} url - The URL to retrieve.
 *
 * @returns {string} The resource associated with the URL as a string.
 */
