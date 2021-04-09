/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
export const KEYWORDS = new Map([
  // ordered is important, do not change
  // FIXME: should we alphabetize these after `@context, @type, @id`?
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
export const FIRST_CUSTOM_TERM_ID = 100;
