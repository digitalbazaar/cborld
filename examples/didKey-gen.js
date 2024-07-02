// generate example did key document

import * as didMethodKey from '@digitalbazaar/did-method-key';
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey';

const didKeyDriver = didMethodKey.driver();
didKeyDriver.use({
  multibaseMultikeyHeader: 'z6Mk',
  fromMultibase: Ed25519Multikey.from
});

const verificationKeyPair = await Ed25519Multikey.generate();
const {didDocument} = await didKeyDriver.fromKeyPair({verificationKeyPair});
console.log(JSON.stringify(didDocument, null, 2));

