/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './CborldError.js';
import {ContextCodec} from './codecs/ContextCodec.js';

/**
* Gets a list of JSON-LD Contexts given a JSON-LD Document.
*
* @param {object} options - The arguments to the function.
* @param {Array} options.jsonldDocument - The JSON-LD Document to scan for
*   simple JSON-LD Context URL strings.
*
* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getJsonldContextUrls({jsonldDocument}) {
  const contextUrls = [];

  for(const [key, value] of Object.entries(jsonldDocument)) {
    if(key === '@context') {
      const contexts = Array.isArray(value) ? value : [value];
      if(contexts.some(element => typeof element !== 'string')) {
        throw new CborldError(
          'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED',
          'An embedded JSON-LD Context was detected in ' +
          `"${JSON.stringify(contexts)}".`);
      }
      contextUrls.push(...contexts);
    } else if(typeof value === 'object') {
      contextUrls.push(...getJsonldContextUrls({jsonldDocument: value}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(...getJsonldContextUrls({jsonldDocument: element}));
        }
      });
    }
  }

  // remove duplicates before returning array
  return Array.from(new Set(contextUrls));
}

/**
* Gets a list of JSON-LD Contexts given a JSON-LD Document.
*
* @param {object} options - The arguments to the function.
* @param {Array} options.cborMap - The CBOR-decoded CBOR-LD Map to scan for
*   JSON-LD Context URL declarations.
* @param {object} [options.appContextMap] - A map of JSON-LD Context URLs and
*   their associated CBOR-LD codec values (must be values greater than
*   32767 (0x7FFF)).

* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getCborldContextUrls({cborMap, appContextMap}) {
  const contextUrls = [];

  const _entries =
    cborMap instanceof Map ? cborMap.entries() : Object.entries(cborMap);
  for(const [key, value] of _entries) {
    if(key === 1) {
      const contexts = Array.isArray(value) ? value : [value];
      contexts.forEach(element => {
        const encodedContext = new ContextCodec();
        encodedContext.set({value: element, appContextMap});
        const decodedValue = encodedContext.decodeCBOR();
        if(typeof decodedValue === 'string') {
          contextUrls.push(encodedContext.decodeCBOR());
        }
      });
    } else if(typeof value === 'object') {
      contextUrls.push(
        ...getCborldContextUrls({cborMap: value, appContextMap}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(
            ...getCborldContextUrls({cborMap: element, appContextMap}));
        }
      });
    }
  }

  // remove duplicates before returning array
  return Array.from(new Set(contextUrls));
}
