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
* @param {string} [options.contextUrl] - If the `jsonldDocument` is itself
*   a context, then this represents its URL.
*
* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getJsonldContextUrls({jsonldDocument, contextUrl} = {}) {
  const contextUrls = [];

  for(const [key, value] of Object.entries(jsonldDocument)) {
    if(key === '@import') {
      if(typeof value !== 'string') {
        // FIXME: use CborldError
        throw new Error(`Invalid JSON-LD "@import" value "${value}".`);
      }
      contextUrls.push(value);
      continue;
    }

    if(key === '@context') {
      // contexts retrieved via a URL MUST have single object values
      if(contextUrl &&
        !(value && typeof value === 'object' && !Array.isArray(value))) {
        // FIXME: use CborldError
        throw new Error(
          'Invalid or unsupported JSON-LD context retrieved from ' +
          `"${contextUrl}". CBOR-LD only supports "@context" values ` +
          '(including for scoped contexts) that are single objects.');
      }

      const contexts = Array.isArray(value) ? value : [value];
      for(const context of contexts) {
        if(context === null) {
          continue;
        }
        if(typeof context !== 'string') {
          // if `jsonldDocument` is not itself a context, i.e., it is the
          // top-level document, then embedded contexts are not permitted
          if(!contextUrl) {
            throw new CborldError(
              'ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED',
              'An embedded JSON-LD Context was detected in ' +
              `"${JSON.stringify(contexts)}".`);
          }
          contextUrls.push(...getJsonldContextUrls(
            {jsonldDocument: context, contextUrl}));
        } else {
          contextUrls.push(context);
        }
      }
    } else if(typeof value === 'object') {
      contextUrls.push(...getJsonldContextUrls(
        {jsonldDocument: value, contextUrl}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(...getJsonldContextUrls(
            {jsonldDocument: element, contextUrl}));
        }
      });
    }
  }

  // remove duplicates before returning array
  return [...new Set(contextUrls)];
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
  return [...new Set(contextUrls)];
}
