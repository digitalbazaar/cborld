/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
export const KEYWORDS_TABLE = new Map([
  // ordered is important, do not change
  ['@context', 0],
  ['@type', 2],
  ['@id', 4],
  ['@value', 6],
  // alphabetized after `@context`, `@type`, `@id`, `@value`
  // IDs <= 24 represented with 1 byte, IDs > 24 use 2+ bytes
  ['@direction', 8],
  ['@graph', 10],
  ['@included', 12],
  ['@index', 14],
  ['@json', 16],
  ['@language', 18],
  ['@list', 20],
  ['@nest', 22],
  ['@reverse', 24],
  // these only appear in frames and contexts, not docs
  ['@base', 26],
  ['@container', 28],
  ['@default', 30],
  ['@embed', 32],
  ['@explicit', 34],
  ['@none', 36],
  ['@omitDefault', 38],
  ['@prefix', 40],
  ['@preserve', 42],
  ['@protected', 44],
  ['@requireAll', 46],
  ['@set', 48],
  ['@version', 50],
  ['@vocab', 52]
]);

export const STRING_TABLE = new Map([
  ['https://www.w3.org/ns/activitystreams', 16],
  ['https://www.w3.org/2018/credentials/v1', 17],
  ['https://www.w3.org/ns/did/v1', 18],
  ['https://w3id.org/security/suites/ed25519-2018/v1', 19],
  ['https://w3id.org/security/suites/ed25519-2020/v1', 20],
  ['https://w3id.org/cit/v1', 21],
  ['https://w3id.org/age/v1', 22],
  ['https://w3id.org/security/suites/x25519-2020/v1', 23],
  ['https://w3id.org/veres-one/v1', 24],
  ['https://w3id.org/webkms/v1', 25],
  ['https://w3id.org/zcap/v1', 26],
  ['https://w3id.org/security/suites/hmac-2019/v1', 27],
  ['https://w3id.org/security/suites/aes-2019/v1', 28],
  ['https://w3id.org/vaccination/v1', 29],
  ['https://w3id.org/vc-revocation-list-2020/v1', 30],
  ['https://w3id.org/dcc/v1', 31],
  ['https://w3id.org/vc/status-list/v1', 32],
  ['https://www.w3.org/ns/credentials/v2', 33],
  ['https://w3id.org/security/data-integrity/v1', 48],
  ['https://w3id.org/security/multikey/v1', 49],
  ['https://purl.imsglobal.org/spec/ob/v3p0/context.json', 50],
  ['https://w3id.org/security/data-integrity/v2', 51]
]);

export const URL_SCHEME_TABLE = new Map([
  ['http://', 1],
  ['https://', 2],
  ['urn:uuid:', 3],
  ['data:', 4],
  ['did:v1:nym:', 1024],
  ['did:key:', 1025]
]);

const cryptosuiteTypedTable = new Map([
  ['ecdsa-rdfc-2019', 1],
  ['ecdsa-sd-2023', 2],
  ['eddsa-rdfc-2022', 3],
  ['ecdsa-xi-2023', 4]
]);

// FIXME: rename type to TYPE_TABLE
export const TYPED_LITERAL_TABLE = new Map([
  ['context', STRING_TABLE],
  ['url', STRING_TABLE],
  ['none', STRING_TABLE],
  ['https://w3id.org/security#cryptosuiteString', cryptosuiteTypedTable]
]);
export const FIRST_CUSTOM_TERM_ID = 100;
