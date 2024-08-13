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
  ['@vocab', 52],
  // `@propagate` added later
  ['@propagate', 54]
]);

/**
 * These are from the legacy registry.
 *
 * @see https://digitalbazaar.github.io/cbor-ld-spec/#term-codec-registry
 */
export const STRING_TABLE = new Map([
  // 0x00 - 0x0F: reserved
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
  // 0x22 - 0x2F (34-47): available
  ['https://w3id.org/security/data-integrity/v1', 48],
  ['https://w3id.org/security/multikey/v1', 49],
  // 0x32 (50): reserved (in legacy spec)
  // FIXME: Unclear on how to handle the openbadges URLs and versioning.
  // This value was never in the spec, but was added here, and potentially
  // elsewhere.
  ['https://purl.imsglobal.org/spec/ob/v3p0/context.json', 50],
  ['https://w3id.org/security/data-integrity/v2', 51]
  // 0x34 - 0x36 (52-54): reserved; removed experimental cryptosuite
  // registrations
]);

export const URL_SCHEME_TABLE = new Map([
  ['http://', 1],
  ['https://', 2],
  ['urn:uuid:', 3],
  ['data:', 4],
  ['did:v1:nym:', 1024],
  ['did:key:', 1025]
]);

export const REVERSE_URL_SCHEME_TABLE = reverseMap(URL_SCHEME_TABLE);

const cryptosuiteTypedTable = new Map([
  ['ecdsa-rdfc-2019', 1],
  ['ecdsa-sd-2023', 2],
  ['eddsa-rdfc-2022', 3],
  ['ecdsa-xi-2023', 4]
]);

export const TYPE_TABLE = new Map([
  ['context', STRING_TABLE],
  ['url', STRING_TABLE],
  ['none', STRING_TABLE],
  ['https://w3id.org/security#cryptosuiteString', cryptosuiteTypedTable]
]);
export const FIRST_CUSTOM_TERM_ID = 100;

export function createLegacyTypeTable({typeTable, appContextMap} = {}) {
  if(typeTable) {
    throw new TypeError(
      '"typeTable" must not be passed when using "legacy" mode.');
  }

  // generate legacy type table
  typeTable = new Map(TYPE_TABLE);

  if(appContextMap) {
    // add `appContextMap` to legacy mode combined string table
    const stringTable = new Map(STRING_TABLE);
    for(const [key, value] of appContextMap) {
      stringTable.set(key, value);
    }
    typeTable.set('context', stringTable);
    typeTable.set('url', stringTable);
    typeTable.set('none', stringTable);
  }

  return typeTable;
}

export function createTypeTable({typeTable} = {}) {
  // ensure `typeTable` has empty maps for core types
  typeTable = new Map(typeTable);
  if(!typeTable.has('context')) {
    typeTable.set('context', new Map());
  }
  if(!typeTable.has('url')) {
    typeTable.set('url', new Map());
  }
  if(!typeTable.has('none')) {
    typeTable.set('none', new Map());
  }
  return typeTable;
}

export function reverseMap(m) {
  return new Map(Array.from(m, e => e.reverse()));
}
