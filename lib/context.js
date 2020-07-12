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
* @param {object} [args.options] - The options to use.
*
* @returns {Array} - A list of JSON-LD Context URLs.
*/
export function getContextUrls({jsonldDocument, options}) {
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
        ...getContextUrls({jsonldDocument: value, options}));
    } else if(Array.isArray(value)) {
      value.forEach(element => {
        if(typeof element === 'object') {
          contextUrls.push(...getContextUrls(
            {jsonldDocument: element, options}));
        }
      });
    }
  }

  // remove duplicates before returning array
  return Array.from(new Set(contextUrls));
}
