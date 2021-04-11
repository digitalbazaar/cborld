/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
// known CBOR-LD registry values
export const ID_TO_URL = new Map();
export const URL_TO_ID = new Map();

_addRegistration(0x10, 'https://www.w3.org/ns/activitystreams');
_addRegistration(0x11, 'https://www.w3.org/2018/credentials/v1');
_addRegistration(0x12, 'https://www.w3.org/ns/did/v1');
_addRegistration(0x13, 'https://w3id.org/security/ed25519-signature-2018/v1');
_addRegistration(0x14, 'https://w3id.org/security/ed25519-signature-2020/v1');
_addRegistration(0x15, 'https://w3id.org/cit/v1');
_addRegistration(0x16, 'https://w3id.org/age/v1');
_addRegistration(0x17, 'https://w3id.org/security/suites/x25519-2020/v1');
_addRegistration(0x18, 'https://w3id.org/veres-one/v1');

function _addRegistration(id, url) {
  URL_TO_ID.set(url, id);
  ID_TO_URL.set(id, url);
}
