/*!
 * Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
 */
import {CborldError} from './error';

/**
* Gets a list of JSON-LD Contexts given a JSON-LD Document.
*
* @param {object} [args] - The arguments to the function.
* @param {Array} [args.jsonldDocument] - The JSON-LD Document to scan for
*   simple JSON-LD Context URL strings.
*
* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getJsonldContextUrls({jsonldDocument}) {
  const contextUrls = [];

  for(const [key, value] of Object.entries(jsonldDocument)) {
    if(key === '@context') {
      const contexts = Array.isArray(value) ? value : [value];
      if(contexts.every(element => typeof element === 'string')) {
        contextUrls.push(...contexts);
      } else {
        throw new CborldError('ERR_EMBEDDED_JSONLD_CONTEXT_DETECTED',
          'An embedded JSON-LD Context was detected in ' +
          JSON.stringify(contexts, null) + '. ');
      }
    } else if(typeof value === 'object') {
      contextUrls.push(
        ...getJsonldContextUrls({jsonldDocument: value}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(...getJsonldContextUrls(
            {jsonldDocument: element}));
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
* @param {object} [args] - The arguments to the function.
* @param {Array} [args.cborldMap] - The CBOR-decoded CBOR-LD Map to scan for
*   JSON-LD Context URL declarations.
*
* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getCborldContextUrls({cborldMap, appContextMap}) {
  const contextUrls = [];

  for(const [key, value] of Map.entries(cborldMap)) {
    if(key === 1) {
      const contexts = Array.isArray(value) ? value : [value];
      contexts.forEach(element => {
        console.log('GCCU', element);
      });
    } else if(typeof value === 'object') {
      contextUrls.push(
        ...getCborldContextUrls({jsonldDocument: value}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(...getCborldContextUrls(
            {jsonldDocument: element}));
        }
      });
    }
  }

  console.log("CONTEXTURLS", contextUrls);

  // remove duplicates before returning array
  return Array.from(new Set(contextUrls));
}
