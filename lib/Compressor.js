/*!
 * Copyright (c) 2021-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as cborg from 'cborg';
import {FIRST_CUSTOM_TERM_ID, KEYWORDS_TABLE} from './tables.js';
import {CborldEncoder} from './codecs/CborldEncoder.js';
import {CborldError} from './CborldError.js';
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {CryptosuiteEncoder} from './codecs/CryptosuiteEncoder.js';
import {inspect} from './util.js';
import {MultibaseEncoder} from './codecs/MultibaseEncoder.js';
import {Transformer} from './Transformer.js';
import {TypedLiteralEncoder} from './codecs/TypedLiteralEncoder.js';
import {UriEncoder} from './codecs/UriEncoder.js';
import {VocabTermEncoder} from './codecs/VocabTermEncoder.js';
import {XsdDateEncoder} from './codecs/XsdDateEncoder.js';
import {XsdDateTimeEncoder} from './codecs/XsdDateTimeEncoder.js';

export const TYPE_ENCODERS = new Map([
  ['@id', UriEncoder],
  ['@vocab', VocabTermEncoder],
  ['https://w3id.org/security#cryptosuiteString', CryptosuiteEncoder],
  ['https://w3id.org/security#multibase', MultibaseEncoder],
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateEncoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeEncoder]
]);

const CONTEXT_TERM_ID = KEYWORDS_TABLE.get('@context');
const CONTEXT_TERM_ID_PLURAL = CONTEXT_TERM_ID + 1;

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
   * @param {Map} [options.compressionMap] - A map of strings and their
   * associated CBOR-LD integer values.
   */
  constructor({
    documentLoader,
    keywordsTable,
    stringTable,
    urlSchemeTable,
    typedLiteralTable
  } = {}) {
    super({
      documentLoader,
      keywordsTable,
      stringTable,
      urlSchemeTable,
      typedLiteralTable
    });
  }

  /**
   * Compresses the given JSON-LD document into a CBOR-LD byte array of
   * compressed bytes that should follow the compressed CBOR-LD CBOR tag.
   *
   * @param {object} options - The options to use.
   * @param {object} options.jsonldDocument - The JSON-LD Document to convert
   *   to CBOR-LD bytes.
   * @param {diagnosticFunction} [options.diagnose] - A function that, if
   *   provided, is called with diagnostic information.
   *
   * @returns {Promise<Uint8Array>} - The compressed CBOR-LD bytes.
   */
  async compress({jsonldDocument, diagnose} = {}) {
    const transformMaps = await this._createTransformMaps({jsonldDocument});
    if(diagnose) {
      diagnose('Diagnostic CBOR-LD compression transform map(s):');
      diagnose(inspect(transformMaps, {depth: null, colors: true}));
    }
    return cborg.encode(transformMaps, {typeEncoders});
  }

  async _createTransformMaps({jsonldDocument}) {
    // initialize state
    this.contextMap = new Map();
    this.tableFromContexts = new Map();
    // TODO: fix
    this.nextTermId = 100;
    //this._getFirstCustomId({compressionMap: this.compressionMap});

    // handle single or multiple JSON-LD docs
    const transformMaps = [];
    const isArray = Array.isArray(jsonldDocument);
    const docs = isArray ? jsonldDocument : [jsonldDocument];
    for(const obj of docs) {
      const transformMap = new Map();
      await this._transform({obj, transformMap});
      transformMaps.push(transformMap);
    }

    return isArray ? transformMaps : transformMaps[0];
  }

  _afterObjectContexts({obj, transformMap}) {
    // if `@context` is present in the object, encode it
    const context = obj['@context'];
    if(!context) {
      return;
    }

    const entries = [];
    const isArray = Array.isArray(context);
    const contexts = isArray ? context : [context];
    for(const value of contexts) {
      const encoder = ContextEncoder.createEncoder(
        {value, transformer: this});
      entries.push(encoder || value);
    }
    const id = isArray ? CONTEXT_TERM_ID_PLURAL : CONTEXT_TERM_ID;
    transformMap.set(id, isArray ? entries : entries[0]);
  }

  _getEntries({obj, termMap}) {
    // get term entries to be transformed and sort by *term* to ensure term
    // IDs will be assigned in the same order that the decompressor will
    const entries = [];
    const keys = Object.keys(obj).sort();
    for(const key of keys) {
      // skip `@context`; not a term entry
      if(key === '@context') {
        continue;
      }

      // check for undefined terms
      let def = termMap.get(key);
      if(def === undefined) {
        if(!(key.startsWith('@') && KEYWORDS_TABLE.has(key))) {
          throw new CborldError(
            'ERR_UNKNOWN_CBORLD_TERM',
            `Unknown term '${key}' was detected in the JSON-LD input.`);
        }
        def = {};
      }

      const value = obj[key];
      const plural = Array.isArray(value);
      const termId = this._getIdForTerm({term: key, plural});
      entries.push([{term: key, termId, plural, def}, value]);
    }
    return entries;
  }

  _transformObjectId({transformMap, termInfo, value}) {
    const {termId} = termInfo;
    const encoder = UriEncoder.createEncoder(
      {value, transformer: this, termInfo});
    transformMap.set(termId, encoder || value);
  }

  _transformObjectType({transformMap, termInfo, value}) {
    const {termId, plural} = termInfo;
    const values = plural ? value : [value];
    const entries = [];
    for(const value of values) {
      const encoder = VocabTermEncoder.createEncoder(
        {value, transformer: this, termInfo});
      entries.push(encoder || value);
    }
    transformMap.set(termId, plural ? entries : entries[0]);
  }

  _transformTypedValue({entries, termType, value, termInfo}) {
    let encoder;

    if(this.typedLiteralTable.has(termType)){
      encoder = TypedLiteralEncoder.createEncoder(
        {value, compressionMap: this.typedLiteralTable.get(termType)}
      )
    }
    
    // check context table
    /*
    else if(this.tableFromContexts.has(value)){
      encoder = VocabTermEncoder.createEncoder(
        {value, transformer: this, termInfo}
      )
    }
    */
    
    else{
      const EncoderClass = TYPE_ENCODERS.get(termType);
      encoder = EncoderClass && EncoderClass.createEncoder(
        {value, transformer: this, termInfo});
      }
    if(encoder !== undefined && encoder !== false) {
      entries.push(encoder);
      return true;
    }
  }

  async _transformArray({entries, contextStack, value}) {
    // recurse into array
    const children = [];
    for(const obj of value) {
      const childMap = new Map();
      children.push(childMap);
      await this._transform({obj, transformMap: childMap, contextStack});
    }
    entries.push(children);
  }

  async _transformObject({entries, contextStack, value}) {
    // recurse into object
    const transformMap = new Map();
    entries.push(transformMap);
    await this._transform({obj: value, transformMap, contextStack});
  }

  async _transformUntypedValue({entries, contextStack, value, termInfo}) {
    entries.push(value);
  }


  _assignEntries({entries, transformMap, termInfo}) {
    const {termId, plural} = termInfo;
    transformMap.set(termId, plural ? entries : entries[0]);
  }

  _getFirstCustomId({compressionMap}) {
   return 100;
    /*
    let maxValue = 0;
    for(const item of compressionMap) {
      if(maxValue < item[1]){
        maxValue = item[1];
      }
    }
    // TODO: behavior here?
    return maxValue + 50;
  */  
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
