// browser support
/* eslint-env browser */
/* eslint-disable-next-line no-unused-vars */
export function inspect(data, options) {
  return JSON.stringify(data, null, 2);
}

export function matchAll(string, regEx) { 
  return Array.from(string.matchAll(regEx));
};