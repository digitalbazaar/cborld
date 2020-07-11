// browser support
/* eslint-env browser */
const crypto = (self.crypto || self.msCrypto);

export async function getRandomBytes(buf) {
  return crypto.getRandomValues(buf);
}
