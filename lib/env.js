/*!
 * Copyright (c) 2018-2020 Digital Bazaar, Inc. All rights reserved.
 */

export const nodejs = (
  typeof process !== 'undefined' && process.versions && process.versions.node);
