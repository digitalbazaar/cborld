/*!
 * Copyright (c) 2020-2021 Digital Bazaar, Inc. All rights reserved.
 */
import * as cbor from '@digitalbazaar/cbor';
import * as cborg from 'cborg';
import {CborldError} from './CborldError.js';
import {CborldEncoder} from './codecs/CborldEncoder.js';
import {ContextEncoder} from './codecs/ContextEncoder.js';
import {ContextDecoder} from './codecs/ContextDecoder.js';
import {CodecMapCodec} from './codecs/CodecMapCodec.js';
import {CompressedCborldCodec} from './codecs/CompressedCborldCodec.js';
import {UncompressedCborldCodec} from './codecs/UncompressedCborldCodec.js';
import {UriEncoder} from './codecs/UriEncoder.js';
import {UriDecoder} from './codecs/UriDecoder.js';
import {VocabTermEncoder} from './codecs/VocabTermEncoder.js';
import {VocabTermDecoder} from './codecs/VocabTermDecoder.js';
import {XsdDateEncoder} from './codecs/XsdDateEncoder.js';
import {XsdDateDecoder} from './codecs/XsdDateDecoder.js';
import {XsdDateTimeEncoder} from './codecs/XsdDateTimeEncoder.js';
import {XsdDateTimeDecoder} from './codecs/XsdDateTimeDecoder.js';
import {getJsonldContextUrls} from './context.js';
import {getTermCodecMap} from './codec.js';
import {inspect} from './util.js';
import {getActiveContext} from './context2.js';

const COMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x01]);
const UNCOMPRESSED_PREFIX = new Uint8Array([0xd9, 0x05, 0x00]);

// FIXME: move elsewhere
const TYPE_ENCODERS = new Map([
  ['@id', UriEncoder],
  ['@vocab', VocabTermEncoder],
  // FIXME: ['https://w3id.org/security#multibase', MultibaseEncoder]
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateEncoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeEncoder]
]);
const TYPE_DECODERS = new Map([
  ['@id', UriDecoder],
  ['@vocab', VocabTermDecoder],
  // FIXME: ['https://w3id.org/security#multibase', MultibaseDecoder]
  ['http://www.w3.org/2001/XMLSchema#date', XsdDateDecoder],
  ['http://www.w3.org/2001/XMLSchema#dateTime', XsdDateTimeDecoder]
]);

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

  // TODO: encodes encodingMap2
  {
    const suffix = cborg.encode(encodingMap2, {typeEncoders});
    const length = COMPRESSED_PREFIX.length + suffix.length;
    const bytes = new Uint8Array(length);
    bytes.set(COMPRESSED_PREFIX);
    bytes.set(suffix, COMPRESSED_PREFIX.length);
    console.log('encodingMap2 suffix', new Uint8Array(suffix));//bytes);
    console.log('encodingMap2 encoded bytes', bytes);
    console.log('encodingMap2 hex', Buffer.from(bytes).toString('hex'));

    const encodedMap = cborg.decode(suffix, {useMaps: true});
    console.log('decoded encodedMap', encodedMap);
    const appContextMap2 = new Map();
    if(appContextMap) {
      for(const [k, v] of appContextMap) {
        appContextMap2.set(v, k);
      }
    }
    const decoded = await _decode(
      {encodedMap, appContextMap: appContextMap2, appTermMap, documentLoader});
    console.log('decoded', decoded);
  }

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
  jsonldDocument, documentLoader, appContextMap, appTermMap
}) {
  const encodingMap = new Map();
  // FIXME: create Encoder class with this state information so it
  // doesn't need to be passed to every function
  const contextMap = new Map();
  const termToId = new Map(KEYWORDS);
  // FIXME: do not pass `idToTerm` during encoding, not needed
  const idToTerm = new Map();
  for(const [term, id] of termToId) {
    idToTerm.set(id, term);
  }

  // recursively walk the JSON-LD document, building the encoding map
  await _recursiveGenerateEncodingMap({
    obj: jsonldDocument, encodingMap, contextMap, termToId, idToTerm,
    appContextMap, appTermMap, documentLoader
  });
  return encodingMap;
}

async function _recursiveGenerateEncodingMap({
  obj, encodingMap, contextMap, termToId, idToTerm, appContextMap, appTermMap,
  contextStack = [], documentLoader
}) {
  // get active context for this object
  const activeCtx = await getActiveContext(
    {contextStack, contextMap, termToId, idToTerm, obj, documentLoader});
  const {childContextStack} = activeCtx;

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

    const termId = _getIdForTerm({term: key, termToId, plural: isArray});
    console.log('termId', termId);

    // handle `@id`, which must have a single value
    if(key === '@id' || aliases.id.has(key)) {
      const value = obj[key];
      const encoder = UriEncoder.createEncoder({value, def, termToId});
      if(encoder) {
        encodingMap.set(termId, encoder);
      } else {
        encodingMap.set(termId, value);
      }
      continue;
    }

    const entries = [];
    if(!isArray) {
      values = [values];
    }

    // handle `@type`
    if(key === '@type' || aliases.type.has(key)) {
      for(const value of values) {
        const encoder = VocabTermEncoder.createEncoder({value, def, termToId});
        if(encoder) {
          entries.push(encoder);
        } else {
          entries.push(value);
        }
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
      newActiveCtx = await getActiveContext({
        contextStack: childContextStack, contextMap, termToId, idToTerm,
        obj: {'@context': propertyScopedContext}, documentLoader, scoped: true
      });
    }

    for(const value of values) {
      // simple-encode `null`
      if(value === null) {
        entries.push(null);
        continue;
      }

      // try to get a type-based encoder for the value
      const termType = _getTermType(
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
          await _recursiveGenerateEncodingMap({
            obj, encodingMap: childMap, contextMap, termToId, idToTerm,
            appContextMap, appTermMap, contextStack: childContextStack,
            documentLoader
          });
        }
        entries.push(children);
        continue;
      }

      // recurse into object
      const childMap = new Map();
      entries.push(childMap);
      console.log('recursing into', value);
      await _recursiveGenerateEncodingMap({
        obj: value, encodingMap: childMap, contextMap, termToId, idToTerm,
        appContextMap, appTermMap, contextStack: childContextStack,
        documentLoader
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

// FIXME: move to decode
async function _decode({
  encodedMap, appContextMap, appTermMap, documentLoader
}) {
  const jsonldDocument = {};
  // FIXME: create Decoder class with this state information so it
  // doesn't need to be passed to every function
  const contextMap = new Map();
  const termToId = new Map(KEYWORDS);
  const idToTerm = new Map();
  for(const [term, id] of termToId) {
    idToTerm.set(id, term);
  }

  // recursively walk the map, building the JSON-LD document
  await _recursiveDecode({
    encodedMap, obj: jsonldDocument, contextMap, termToId, idToTerm,
    appContextMap, appTermMap, documentLoader
  });

  return jsonldDocument;
}

async function _recursiveDecode({
  encodedMap, obj, contextMap, termToId, idToTerm, appContextMap, appTermMap,
  contextStack = [], documentLoader
}) {
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
  const activeCtx = await getActiveContext({
    contextStack, contextMap, termToId, idToTerm, obj,
    documentLoader, encodedMap
  });
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
        contextStack: childContextStack, contextMap, termToId, idToTerm,
        obj: {'@context': propertyScopedContext}, documentLoader, scoped: true
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
          await _recursiveDecode({
            encodedMap: ev, obj: child, contextMap, appContextMap, appTermMap,
            termToId, idToTerm, contextStack: childContextStack,
            documentLoader
          });
        }
        entries.push(children);
        continue;
      }

      // recurse into object
      const child = {};
      entries.push(child);
      console.log('recursing into', encodedValue);
      await _recursiveDecode({
        encodedMap: encodedValue, obj: child, contextMap, termToId, idToTerm,
        appContextMap, appTermMap, contextStack: childContextStack,
        documentLoader
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

function _getIdForTerm({term, termToId, plural}) {
  const id = termToId.get(term);
  if(id === undefined) {
    // FIXME: use CBOR-LD error
    throw new Error('term not defined');
  }
  return plural ? id + 1 : id;
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
