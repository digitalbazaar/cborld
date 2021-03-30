/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';
import {CborldEncoder} from './codecs/CborldEncoder.js';
import {CodecMapCodec} from './codecs/CodecMapCodec.js';
import {CompressedCborldCodec} from './codecs/CompressedCborldCodec.js';
import * as cbor from '@digitalbazaar/cbor';
import * as cborg from 'cborg';
import {UncompressedCborldCodec} from './codecs/UncompressedCborldCodec.js';
import {getJsonldContextUrls} from './context.js';
import {getTermCodecMap} from './codec.js';
import {inspect} from './util.js';

const COMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x01]);
const UNCOMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x00]);
const MAX_CONTEXTS = 50;

// FIXME: move elsewhere
const KEYWORDS = new Map([
  // ordered is important, do not change
  // FIXME: can we alphabetize these? do they all fit into whatever varint max
  // size thing is applied?
  ['@context', 0],
  ['@type', 1],
  ['@id', 2],
  ['@value', 3],
  ['@base', 4],
  ['@language', 5],
  ['@direction', 6],
  ['@graph', 7],
  ['@included', 8],
  ['@json', 9],
  ['@list', 10],
  ['@set', 11],
  ['@index', 12],
  ['@nest', 13],
  ['@reverse', 14],
  // FIXME: remove these? these only appear in frames and contexts
  ['@container', 15],
  ['@default', 16],
  ['@embed', 17],
  ['@explicit', 18],
  ['@none', 19],
  ['@omitDefault', 20],
  ['@prefix', 21],
  ['@preserve', 22],
  ['@protected', 23],
  ['@requireAll', 24],
  ['@version', 25],
  ['@vocab', 26]
]);

/**
 * Encodes a given JSON-LD document into a CBOR-LD byte array.
 *
 * @param {object} options - The options to use when encoding to CBOR-LD.
 * @param {object} options.jsonldDocument - The JSON-LD Document to convert to
 *   CBOR-LD bytes.
 * @param {documentLoaderFunction} options.documentLoader -The document loader
 *   to use when resolving JSON-LD Context URLs.
 * @param {Map} [options.appContextMap] - A map of JSON-LD Context URLs and
 *   their encoded CBOR-LD values (must be values greater than 32767 (0x7FFF)).
 * @param {Map} [options.appTermMap] - A map of JSON-LD terms and
 *   their associated CBOR-LD term codecs.
 * @param {diagnosticFunction} [options.diagnose] - A function that, if
 * provided, is called with diagnostic information.
 *
 * @returns {Promise<Uint8Array>} - The encoded CBOR-LD bytes.
 */
export async function toCborld(
  {jsonldDocument, documentLoader, appContextMap, appTermMap = new Map(),
    diagnose}) {

  let termEncodingMap;

  // get the term encoding map by processing the JSON-LD Contexts
  try {
    const contextUrls = getJsonldContextUrls({jsonldDocument});
    termEncodingMap = await getTermCodecMap(
      {contextUrls, appTermMap, documentLoader, encode: true});
  } catch(e) {
    // quietly ignore embedded context errors, generate uncompressed CBOR-LD
    if(e.value !== 'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED') {
      throw e;
    }
  }

  // generate the encoded CBOR Map
  const encodingMap = _generateEncodingMap({
    jsonldDocument, appContextMap, appTermMap, termEncodingMap});

  // determine the appropriate codec
  const cborldObject = termEncodingMap ?
    new CompressedCborldCodec() :
    new UncompressedCborldCodec();
  cborldObject.set({value: encodingMap});

  // encode as CBOR
  const cborldBytes = cbor.encode(cborldObject);

  // FIXME: go through `jsonldDocument` and generate map for cborg
  // FIXME: when looking at each value, run the codec's `.match` function
  // over it ... and if there is no match, do not wrap the value in the
  // codec... let it be default encoded... would that work for any decoder
  // implementation? would it always be the case that compressed values will
  // be Uint8Arrays ... and uncompressed will be something else, having
  // already been decoded?
  const encodingMap2 = await _generateEncodingMap2({
    jsonldDocument, documentLoader, appContextMap, appTermMap
  });
  console.log('encodingMap2', encodingMap2);

  // override object encoder to use cborld codecs
  const typeEncoders = {
    Object(obj) {
      if(obj instanceof CborldEncoder) {
        return obj.encode({obj});
      }
    }
  };
  const newCborldObject = new Map();
  newCborldObject.set('test', 1);
  const suffix = cborg.encode(newCborldObject, {typeEncoders});
  const length = COMPRESSED_PREFIX.length + suffix.length;
  const newCborldBytes = new Uint8Array(length);
  newCborldBytes.set(COMPRESSED_PREFIX);
  newCborldBytes.set(suffix, COMPRESSED_PREFIX.length);
  console.log('encoded', newCborldBytes);

  const tags = [];
  tags[0x0501] = function(obj) {
    // FIXME: ensure `obj` is a map
    // FIXME: go through the map and for each key, get the decoder and
    // apply it to decompress the values
    console.log('decode obj', obj);
    return obj;
  };
  tags[0x0500] = function(obj) {
    // FIXME: ensure `obj` is a map
    console.log('decode obj', obj);
    // FIXME: figure out what to do with the map... anything?
    return obj;
  };
  console.log('decoded', cborg.decode(newCborldBytes, {tags, useMaps: true}));

  // FIXME: when to convert the map into JSON-LD? do it within the tag
  // decoders above or as a final step after `cborg.decode`?

  // // FIXME: cborg
  // const typeEncoders = {
  //   Object(obj, typ, options, refStack) {
  //     // FIXME: if object instance of CborldCodec, then call its encode
  //     // function to get its tokens, otherwise return null to let standard
  //     // take over... will need to wrap all values (including strings, etc.
  //     // that work with a codec in a codec object)
  //     console.log('typ', typ);
  //     if(!(obj instanceof CompressedCborldCodec)) {
  //       // do it the standard way
  //       return null;
  //     }
  //     // FIXME: problem is that we want to add a tag and then call the
  //     // standard stuff on objects/maps after that ...
  //     console.log('cborld obj', obj);
  //     //return null;
  //     //return null;
  //     return [
  //       new cborg.Token(cborg.Type.tag, 0x0501),
  //       // FIXME: should use [new Token(Type.map, length), entries] next
  //       new cborg.Token(cborg.Type.bytes, new Uint8Array([1, 2, 3]))
  //       //new cborg.Token(cborg.Type.map, 4, 1)//new Uint8Array([1, 2, 3]))
  //     ];

  //     /*
  //       // could be an Object or a Map
  //       const isMap = typ !== 'Object'
  //       // it's slightly quicker to use Object.keys() than Object.entries()
  //       const keys = isMap ? obj.keys() : Object.keys(obj)
  //       const length = isMap ? obj.size : keys.length
  //       if (!length) {
  //         return simpleTokens.emptyMap
  //       }
  //       refStack = Ref.createCheck(refStack, obj)
  //       const entries = []
  //       let i = 0
  //       for (const key of keys) {
  //         entries[i++] = [
  //           objectToTokens(key, options, refStack),
  //           objectToTokens(isMap ? obj.get(key) : obj[key], options, refStack)
  //         ]
  //       }
  //       entries.sort(mapSorter)
  //       return [new Token(Type.map, length), entries]
  //     }*/
  //   }/*,
  //   Map(obj) {
  //     // do it the standard way
  //     console.log('obj', obj);
  //     //return null;
  //     //return null;
  //     return [
  //       new cborg.Token(cborg.Type.tag, 3),
  //       new cborg.Token(cborg.Type.bytes, new Uint8Array([1,2,3]))
  //     ];
  //   }*/
  // };
  // //const foo = cborg.encode(new Map(), {typeEncoders});
  // const foo1 = cborg.encode({}, {typeEncoders});
  // console.log('foo1', foo1);
  // const foo2 = cborg.encode(cborldObject, {typeEncoders});
  // console.log('foo2', foo2);
  // const foo3 = cborg.encode(new Map([['a', 1]]), {typeEncoders});
  // console.log('foo3', foo3);

  // const tags = [];
  // tags[0x501] = function(obj) {
  //   // expected conversion to base16
  //   if(!(obj instanceof Uint8Array)) {
  //     throw new Error('expected byte array');
  //   }
  //   return 'foo';
  // };
  // console.log('decode', cborg.decode(foo2, {tags}));

  if(diagnose) {
    // throw new Error('"diagnose" not implemented.');
    diagnose(inspect(cborldObject, {depth: null, colors: true}));
    /*diagnose('CBOR Encoding Map:');
    diagnose(await cbor.Diagnose.diagnose(cborldBytes));
    diagnose('CBOR Diagnostic Mode:');
    diagnose(await cbor.Commented.comment(cborldBytes, {max_depth: 10}));*/
  }

  return cborldBytes;
}

// `jsonldDocument` will be treated as a simple object
async function _generateEncodingMap2({
  jsonldDocument, documentLoader, appContextMap, appTermMap,
  maxContexts = MAX_CONTEXTS
}) {
  const encodingMap = new Map();
  // FIXME: have getContexts fetch all contexts, including embedded ones
  // and `@import`
  const contextMap = await _getContexts(
    {jsonldDocument, documentLoader, maxContexts});

  // recursively walk the JSON-LD document, building the encoding map
  await _recursiveGenerateEncodingMap(
    {obj: jsonldDocument, encodingMap, contextMap, appContextMap, appTermMap});

  return encodingMap;
}

async function _recursiveGenerateEncodingMap({
  obj, encodingMap, contextMap, appContextMap, appTermMap, contextStack = []
}) {
  // get active context for this object
  const activeCtx = _getActiveContext({contextStack, contextMap, obj});
  const {childContextStack} = activeCtx;

  // walk all the keys in the object
  const {aliases, scopedContextMap, termMap} = activeCtx;
  for(const key in obj) {
    // check for undefined terms
    const termEntry = termMap.get(key);
    if(termEntry === undefined && !(key.startsWith('@') && KEYWORDS.has(key))) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get term ID (integer value) based on the context from which the term
    // definition originally came
    const {def, contextUrl} = termEntry || {};
    // FIXME: this can result in conflicts between different contexts ...
    // i think we need the order to be based on the contexts that are in
    // play ... or based on a total term ordering determined from the outset
    // which will probably be more performant; the actual term ID doesn't
    // matter ... as long as there are no local conflicts; because where it
    // occurs in the hierarchy will determine how it is interpreted
    const termId = _getLocalTermId({term: key, contextUrl, contextMap});

    // set codecs for this term ID
    const codecs = [];
    encodingMap.set(termId, codecs);

    if(key === '@context') {
      // FIXME: indicate which contexts are present here
      codecs.push('context');
      continue;
    }

    // handle `@id`
    if(key === '@id' || aliases.id.has(key)) {
      // FIXME: implement
      codecs.push('id:' + obj[key]);
      continue;
    }

    // handle `@type`
    if(key === '@type' || aliases.type.has(key)) {
      // FIXME: implement
      codecs.push('type:' + obj[key]);
      continue;
    }

    // get values for the given key
    let values = obj[key];
    if(!Array.isArray(values)) {
      values = [values];
    }

    // apply any property-scoped context; use `childContextStack` when
    // recursing as it properly preserves/reverts the current object's
    // type-scoped contexts
    let newActiveCtx;
    const propertyScopedContext = scopedContextMap.get(key);
    if(propertyScopedContext) {
      // TODO: support `@propagate: false` on property-scoped contexts
      newActiveCtx = _getActiveContext({
        contextStack: childContextStack,
        contextMap,
        obj: {'@context': propertyScopedContext}
      });
    }

    for(const value of values) {
      if(typeof value !== 'object' || Array.isArray(value)) {
        // FIXME: determine codec based on `def`
        codecs.push(typeof value);
        continue;
      }

      // recurse into value
      const childMap = new Map();
      codecs.push(childMap);
      await _recursiveGenerateEncodingMap({
        obj: value, encodingMap: childMap, contextMap,
        appContextMap, appTermMap, contextStack: childContextStack
      });
    }

    // revert property-scoped active context if one was created
    if(newActiveCtx) {
      newActiveCtx.revert();
    }
  }

  // revert active context for this object
  activeCtx.revert();
}

function _getLocalTermId({term, contextUrl, contextMap}) {
  if(contextUrl) {
    return contextMap.get(contextUrl).termIdMap.get(term);
  }
  return KEYWORDS.get(term);
}

function _getActiveContext({contextStack, contextMap, obj}) {
  const stackTop = contextStack.length;

  // push any local embedded contexts onto the context stack
  const localContexts = obj['@context'];
  _updateContextStack({contextStack, contextMap, contexts: localContexts});

  // get `id` and `type` aliases for the active context
  let active = contextStack[contextStack.length - 1];
  if(!active) {
    // empty initial context
    active = {
      aliases: {
        id: new Set(),
        type: new Set()
      },
      context: {},
      scopedContextMap: new Map(),
      termMap: new Map()
    };
  }
  const {aliases} = active;

  // TODO: support `@propagate: true` on type-scoped contexts

  // save context stack prior to processing types
  const childContextStack = contextStack.slice();

  // get unique object type(s)
  let totalTypes = [];
  const typeTerms = ['@type', ...aliases.type];
  for(const term of typeTerms) {
    const types = obj[term];
    if(Array.isArray(types)) {
      totalTypes.push(...types);
    } else {
      totalTypes.push(types);
    }
  }
  totalTypes = [...new Set(totalTypes)].sort();

  // apply any type-scoped contexts
  let {scopedContextMap} = active;
  for(const type of totalTypes) {
    const contexts = scopedContextMap.get(type);
    if(contexts) {
      _updateContextStack({contextStack, contextMap, contexts});
      active = contextStack[contextStack.length - 1];
      ({scopedContextMap} = active);
    }
  }

  return {
    ...active,
    childContextStack,
    revert() {
      contextStack.length = stackTop;
    }
  };
}

function _updateContextStack({contextStack, contextMap, contexts}) {
  // push any localized contexts onto the context stack
  if(!contexts) {
    return;
  }
  if(!Array.isArray(contexts)) {
    contexts = [contexts];
  }

  for(const url of contexts) {
    const entry = contextMap.get(url);
    const {context} = entry;

    // clone entry to create new active context entry for context stack
    const newActive = {
      aliases: {
        id: new Set(entry.aliases.id),
        type: new Set(entry.aliases.type)
      },
      context,
      scopedContextMap: new Map(entry.scopedContextMap),
      termMap: new Map(entry.termMap)
    };

    // push new active context and get old one
    contextStack.push(newActive);
    const oldActive = contextStack[contextStack.length];
    if(!oldActive) {
      continue;
    }

    // compute `id` and `type` aliases by including any previous aliases that
    // have not been cleared by the new context
    const {aliases} = newActive;
    for(const key of ['id', 'type']) {
      for(const alias of oldActive.aliases[key]) {
        if(context[alias] !== null) {
          aliases[key].add(alias);
        }
      }
    }

    // compute scoped context map by including any scoped contexts that have
    // not been cleared by the new context
    const {scopedContextMap} = newActive;
    for(const [key, value] of oldActive.scopedContextMap) {
      if(context[key] !== null && !scopedContextMap.has(key)) {
        scopedContextMap.set(key, value);
      }
    }

    // compute new terms map
    const {termMap} = newActive;
    for(const [key, value] of oldActive.termMap) {
      if(context[key] !== null && !termMap.has(key)) {
        termMap.set(key, value);
      }
    }
  }
}

async function _getContexts({jsonldDocument, documentLoader, maxContexts}) {
  const contextMap = new Map();

  // recursively find context URLs and load documents in parallel
  const queue = new Map();
  let allowEmbedded = false;
  let next = [jsonldDocument];
  while(next.length > 0) {
    const current = next;
    next = [];
    const promises = [];
    for(const jsonldDocument of current) {
      const contextUrls = getJsonldContextUrls({jsonldDocument, allowEmbedded});
      for(const url of contextUrls) {
        const promise = queue.get(url) || _getDocument({url, documentLoader});
        if(queue.size === maxContexts) {
          // FIXME: use CborldError
          throw new Error(`Maximum contexts (${maxContexts}) exceeded.`);
        }
        queue.set(url, promise);
      }
    }
    // Note: No max concurrency set here because there is a presumption that
    // the document loader should be loading static or pre-fetched documents.
    await Promise.all(promises);
    // once top-level document has been processed, embedded contexts are
    // permitted because they all map back to some URL
    allowEmbedded = true;
  }

  // load contexts into context map
  for(const [url, promise] of queue) {
    const {'@context': context} = await promise;
    if(!context) {
      // FIXME: use CborldError
      throw new Error(`Invalid JSON-LD context retrieved from "${url}."`);
    }
    // precompute any `@id` and `@type` aliases, scoped contexts, and terms
    const scopedContextMap = new Map();
    const termMap = new Map();
    const termIdMap = new Map();
    const terms = new Set();
    const entry = {
      aliases: {id: new Set(), type: new Set()},
      context,
      scopedContextMap,
      termMap,
      termIdMap
    };
    for(const key in context) {
      const def = context[key];
      if(!def) {
        continue;
      }
      if(!KEYWORDS.has(key)) {
        terms.add(key);
      }
      // FIXME: determine if we need `aliases` for `id`; we may only need
      // it for `type`
      if(def === '@id' || def.id === '@id') {
        entry.aliases.id.add(key);
      } else if(def === '@type' || def.id === '@type') {
        entry.aliases.type.add(key);
      }
      if(!key.startsWith('@')) {
        termMap.set(key, {def, contextUrl: url});
        const scopedContext = def['@context'];
        if(scopedContext !== undefined) {
          scopedContextMap.set(key, scopedContext);
          // recursively process any non-URL `scopedContext` to get terms
          _getContextTerms({contexts: scopedContext, terms});
        }
      }
    }

    // sort terms and setup termIdMap
    let id = KEYWORDS.size;
    const sortedTerms = [...terms].sort();
    for(const term of sortedTerms) {
      termIdMap.set(term, id++);
    }

    // add entry for context URL
    contextMap.set(url, entry);
  }

  return contextMap;
}

async function _getDocument({url, documentLoader}) {
  const {document} = await documentLoader(url);
  if(typeof document === 'string') {
    return JSON.parse(document);
  }
  return document;
}

function _getContextTerms({contexts, terms}) {
  // FIXME: add cycle detection?
  if(Array.isArray(contexts)) {
    for(const context of contexts) {
      _getContextTerms({contexts: context, terms});
    }
  } else if(typeof contexts === 'object') {
    for(const key in contexts) {
      if(!KEYWORDS.has(key)) {
        terms.add(key);
      }
    }
  }
}

// generate a CBOR encoding map given a JSON-LD document and term codec map
function _generateEncodingMap(
  {jsonldDocument, appContextMap, appTermMap, termEncodingMap}) {
  const encodingMap = new Map();

  // add the appTermMap under @codec if it exists
  if(appTermMap && appTermMap.size > 0 && termEncodingMap) {
    const codecValue = new CodecMapCodec();
    codecValue.set({value: appTermMap, termCodecMap: termEncodingMap});
    encodingMap.set(termEncodingMap.get('@codec').value, codecValue);
  }

  for(const [key, value] of Object.entries(jsonldDocument)) {
    // check for undefined term keys
    if(termEncodingMap && termEncodingMap.get(key) === undefined) {
      throw new CborldError(
        'ERR_UNKNOWN_CBORLD_TERM',
        `Unknown term '${key}' was detected in JSON-LD input.`);
    }

    // get the encoded term
    const term = termEncodingMap ?
      termEncodingMap.get(key).value : key;

    // set the encoded value
    let encodedValue = value;
    if(typeof value === 'object' && value.constructor === Object) {
      encodedValue = _generateEncodingMap(
        {jsonldDocument: value, appContextMap, termEncodingMap});
    } else if(Array.isArray(value)) {
      encodedValue = [];
      value.forEach(element => {
        let encodedSubvalue = element;
        // FIXME: Repetitive code, doesn't work for arrays of arrays?
        if(typeof element === 'object' && element.constructor === Object) {
          encodedSubvalue = _generateEncodingMap(
            {jsonldDocument: element, appContextMap, termEncodingMap});
        } else if(termEncodingMap) {
          const Codec = termEncodingMap.get(key).codec;
          encodedSubvalue = new Codec();
          encodedSubvalue.set({
            value: element, appContextMap,
            termCodecMap: termEncodingMap
          });
        }
        encodedValue.push(encodedSubvalue);
      });
    } else if(termEncodingMap) {
      const Codec = termEncodingMap.get(key).codec;
      encodedValue = new Codec();
      encodedValue.set({value, appContextMap, termCodecMap: termEncodingMap});
    }

    encodingMap.set(term, encodedValue);
  }

  return encodingMap;
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
