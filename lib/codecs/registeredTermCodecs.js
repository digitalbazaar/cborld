/*!
 * Copyright (c) 2021-2024 Digital Bazaar, Inc. All rights reserved.
 */
// known CBOR-LD global term registry values
export const ID_TO_STRING = new Map();
export const STRING_TO_ID = new Map();

// known CBOR-LD cryptosuite string registry values
export const CRYPTOSUITE_ID_TO_STRING = new Map();
export const CRYPTOSUITE_STRING_TO_ID = new Map();

/**
 * @see https://digitalbazaar.github.io/cbor-ld-spec/#term-codec-registry
 */
// 0x00 - 0x0F: reserved
_addRegistration(0x10, 'https://www.w3.org/ns/activitystreams');
_addRegistration(0x11, 'https://www.w3.org/2018/credentials/v1');
_addRegistration(0x12, 'https://www.w3.org/ns/did/v1');
_addRegistration(0x13, 'https://w3id.org/security/suites/ed25519-2018/v1');
_addRegistration(0x14, 'https://w3id.org/security/suites/ed25519-2020/v1');
_addRegistration(0x15, 'https://w3id.org/cit/v1');
_addRegistration(0x16, 'https://w3id.org/age/v1');
_addRegistration(0x17, 'https://w3id.org/security/suites/x25519-2020/v1');
_addRegistration(0x18, 'https://w3id.org/veres-one/v1');
_addRegistration(0x19, 'https://w3id.org/webkms/v1');
_addRegistration(0x1A, 'https://w3id.org/zcap/v1');
_addRegistration(0x1B, 'https://w3id.org/security/suites/hmac-2019/v1');
_addRegistration(0x1C, 'https://w3id.org/security/suites/aes-2019/v1');
_addRegistration(0x1D, 'https://w3id.org/vaccination/v1');
_addRegistration(0x1E, 'https://w3id.org/vc-revocation-list-2020/v1');
_addRegistration(0x1F, 'https://w3id.org/dcc/v1');
_addRegistration(0x20, 'https://w3id.org/vc/status-list/v1');
// 0x21 - 0x2F: available
_addRegistration(0x30, 'https://w3id.org/security/data-integrity/v1');
_addRegistration(0x31, 'https://w3id.org/security/multikey/v1');
// 0x32: reserved (in spec)
// FIXME: Unclear on how to handle the openbadges URLs and versioning.
// This value was never in the spec, but was added here, and potentially
// elsewhere.
_addRegistration(0x32, 'https://purl.imsglobal.org/spec/ob/v3p0/context.json');
_addRegistration(0x33, 'https://w3id.org/security/data-integrity/v2');
// 0x34 - 0x36: reserved
// these cryptosuite registrations were experimental and are now reserved
//_addRegistration(0x34, 'ecdsa-rdfc-2019');
//_addRegistration(0x35, 'ecdsa-sd-2023');
//_addRegistration(0x36, 'eddsa-rdfc-2022');

// FIXME: add link to CBOR-LD spec for cryptosuite string sub-registry once
// it is available
// 0x00 is reserved
_addCryptosuiteRegistration(0x01, 'ecdsa-rdfc-2019');
_addCryptosuiteRegistration(0x02, 'ecdsa-sd-2023');
_addCryptosuiteRegistration(0x03, 'eddsa-rdfc-2022');
_addCryptosuiteRegistration(0x04, 'ecdsa-xi-2023');

function _addRegistration(id, string) {
  STRING_TO_ID.set(string, id);
  ID_TO_STRING.set(id, string);
}

function _addCryptosuiteRegistration(id, string) {
  CRYPTOSUITE_STRING_TO_ID.set(string, id);
  CRYPTOSUITE_ID_TO_STRING.set(id, string);
}
