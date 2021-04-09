/*!
* Copyright (c) 2020 Digital Bazaar, Inc. All rights reserved.
*/
import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
chai.use(chaiBytes);
global.should = chai.should();

import {
  encode,
  decode,
  documentLoader
} from '..';

describe('cborld', () => {
  describe('encode', () => {
    it('should encode an empty JSON-LD Document', async () => {
      const jsonldDocument = {};
      const cborldBytes = await encode({jsonldDocument, documentLoader});
      expect(cborldBytes).instanceof(Uint8Array);
      expect(cborldBytes).equalBytes('d90501a0');
    });
    it.skip('should encode a simple JSON-LD Document', async () => {
    });
  });

  describe('decode', () => {
    it('should decode empty document CBOR-LD bytes', async () => {
      const cborldBytes = new Uint8Array([0xd9, 0x05, 0x01, 0xa0]);
      const jsonldDocument = await decode({cborldBytes, documentLoader});
      expect(jsonldDocument).deep.equal({});
    });
    it.skip('should decode simple CBOR-LD bytes', async () => {
    });

    it.skip('should round trip with embedded context', async () => {
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        foo: 1
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const encodedBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip with remote context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip with compressed remote context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: 'ex:foo'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader,
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip with embedded scoped context', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo'
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: 1
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const encodedBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip with compressed scoped context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo'
            }
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: 1
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader,
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip w/ embedded nested scoped context', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: 'ex:bar'
                }
              }
            }
          },
          foo: 'ex:override_this'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: 1
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const encodedBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip w/ nested compressed scoped context',
      async () => {
        const CONTEXT_URL = 'urn:foo';
        const CONTEXT = {
          '@context': {
            Foo: {
              '@id': 'ex:Foo',
              '@context': {
                foo: {
                  '@id': 'ex:foo',
                  '@context': {
                    bar: 'ex:bar'
                  }
                }
              }
            },
            foo: 'ex:override_this'
          }
        };
        const jsonldDocument = {
          '@context': CONTEXT_URL,
          '@type': 'Foo',
          foo: {
            bar: 1
          }
        };

        const documentLoader = url => {
          if(url === CONTEXT_URL) {
            return {
              contextUrl: null,
              document: CONTEXT,
              documentUrl: url
            };
          }
          throw new Error(`Refused to load URL "${url}".`);
        };

        const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
        const encodedBytes = await encode({
          jsonldDocument,
          documentLoader,
          appContextMap
        });

        const decodedDocument = await decode({
          cborldBytes: encodedBytes,
          documentLoader,
          appContextMap
        });
        expect(decodedDocument).to.eql(jsonldDocument);
      });

    it.skip('should round trip w/ revert embedded type-scope', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo',
              bar: null
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:should_exist'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          foo: {
            bar: 1
          }
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const encodedBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should round trip w/ revert remote type-scope', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: 'ex:foo',
              bar: null
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:should_exist'
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          foo: {
            bar: 1
          }
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader,
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.only('should round trip w/ embedded scoped override', async () => {
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: {
                    '@id': 'ex:bar',
                    // FIXME: add `xsd` prefix and other random prefix
                    // tests both of which should also work
                    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
                  }
                }
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        throw new Error(`Refused to load URL "${url}".`);
      };
      const encodedBytes = await encode({jsonldDocument, documentLoader});

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.only('should round trip w/ remote scoped override', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': {
                  bar: {
                    '@id': 'ex:bar',
                    // FIXME: add `xsd` prefix and other random prefix
                    // tests both of which should also work
                    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
                  }
                }
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader,
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.only('should round trip w/ 2x remote scoped context', async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT_2_URL = 'urn:foo-scope';
      const CONTEXT_2 = {
        '@context': {
          bar: {
            '@id': 'ex:bar',
            // FIXME: add `xsd` prefix and other random prefix
            // tests both of which should also work
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime'
          }
        }
      };
      const CONTEXT = {
        '@context': {
          Foo: {
            '@id': 'ex:Foo',
            '@context': {
              foo: {
                '@id': 'ex:foo',
                '@context': CONTEXT_2_URL
              }
            }
          },
          foo: 'ex:override_this',
          bar: 'ex:not_a_date'
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT['@context'],
        '@type': 'Foo',
        foo: {
          bar: date
        }
      };

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        if(url === CONTEXT_2_URL) {
          return {
            contextUrl: null,
            document: CONTEXT_2,
            documentUrl: url
          };
        }
        throw new Error(`Refused to load URL "${url}".`);
      };

      const appContextMap = new Map([[CONTEXT_URL, 0x8000]]);
      const encodedBytes = await encode({
        jsonldDocument,
        documentLoader,
        appContextMap
      });

      const decodedDocument = await decode({
        cborldBytes: encodedBytes,
        documentLoader,
        appContextMap
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

    it.skip('should decode a CIT type token', async () => {
      const cborldBytes = [
        217, 5, 1, 164, 1, 25, 128, 0, 21, 4, 15, 75,
        122, 217, 5, 1, 162, 1, 25, 135, 67, 4, 21, 17,
        88, 59, 122, 0, 0, 218, 254, 86, 110, 99, 95, 229,
        103, 219, 131, 235, 12, 30, 200, 156, 4, 245, 17, 239,
        118, 94, 144, 171, 32, 2, 125, 159, 180, 66, 225, 77,
        98, 179, 185, 245, 142, 170, 210, 219, 16, 27, 49, 87,
        164, 22, 249, 197, 111, 77, 40, 23, 250, 147, 45, 164,
        171
      ];

      const CONTEXT_URL = 'https://w3id.org/cit/v1';
      /* eslint-disable max-len */
      const CONTEXT = {
        '@context': {
          '@protected': 'true',
          type: '@type',
          ConcealedIdTokenCredential: 'https://w3id.org/cit#ConcealedIdTokenCredential',
          concealedIdToken: {
            '@id': 'https://w3id.org/cit#concealedIdToken',
            '@type': '@id'
          },
          ConcealedIdToken: {
            '@id': 'https://w3id.org/cit#ConcealedIdToken',
            '@context': {
              '@protected': true,
              meta: {'@id': 'https://w3id.org/cit#meta', '@type': 'https://w3id.org/security#multibase'},
              payload: {'@id': 'https://w3id.org/cit#payload', '@type': 'https://w3id.org/security#multibase'}
            }
          },
          Ed25519Signature2020: {
            '@id': 'https://w3id.org/security#Ed25519Signature2020',
            '@context': {
              '@protected': true,

              id: '@id',
              type: '@type',

              sec: 'https://w3id.org/security#',
              xsd: 'http://www.w3.org/2001/XMLSchema#',

              challenge: 'sec:challenge',
              created: {'@id': 'http://purl.org/dc/terms/created', '@type': 'xsd:dateTime'},
              domain: 'sec:domain',
              expires: {'@id': 'sec:expiration', '@type': 'xsd:dateTime'},
              nonce: 'sec:nonce',
              proofPurpose: {
                '@id': 'sec:proofPurpose',
                '@type': '@vocab',
                '@context': {
                  '@protected': true,

                  id: '@id',
                  type: '@type',

                  sec: 'https://w3id.org/security#',

                  assertionMethod: {'@id': 'sec:assertionMethod', '@type': '@id', '@container': '@set'},
                  authentication: {'@id': 'sec:authenticationMethod', '@type': '@id', '@container': '@set'}
                }
              },
              proofValue: {
                '@id': 'https://w3id.org/security#proofValue',
                '@type': 'https://w3id.org/security#multibase'
              },
              verificationMethod: {'@id': 'sec:verificationMethod', '@type': '@id'}
            }
          }
        }
      };

      const appContextMap = new Map();
      appContextMap.set('https://w3id.org/cit/v1', 0x8000);

      const documentLoader = url => {
        if(url === CONTEXT_URL) {
          return {
            contextUrl: null,
            document: CONTEXT,
            documentUrl: url
          };
        }
        throw new Error('Invalid context url, cannot load!');
      };

      const decodedDocument = await decode({
        appContextMap,
        cborldBytes,
        documentLoader
      });

      //console.log(decodedDocument);
      expect(decodedDocument).to.eql({
        '@context': 'https://w3id.org/cit/v1',
        type: 'ConcealedIdToken',
        meta: 'zDCAkMBcw775ppL',
        payload: 'z116vygiRSkybL9nN6Sq2yYZzsBkRkySbzf4qKG7LfrvViCRC7qQTECxMGxnLLZ16DEr2zytkK7c2mnr'
      });
    });

    it.skip('should round trip sample Age context', async () => {
      const AGE_CONTEXT_URL = 'https://w3id.org/age/v1';
      const AGE_CONTEXT = {
        '@context': {
          '@protected': 'true',
          id: '@id',
          type: '@type',
          overAge: {
            '@id': 'https://w3id.org/age#overAge',
            '@type': 'http://www.w3.org/2001/XMLSchema#positiveInteger'
          }
        }
      };
      const jsonldDocument = {
        '@context': 'https://w3id.org/age/v1',
        overAge: 21
      };
      const appContextMap = new Map();
      appContextMap.set('https://w3id.org/age/v1', 0x8743);

      const documentLoader = url => {
        if(url === AGE_CONTEXT_URL) {
          return {
            contextUrl: null,
            document: AGE_CONTEXT,
            documentUrl: url
          };
        }
        throw new Error('Invalid context url, cannot load!');
      };

      const encodedBytes = await encode({
        jsonldDocument,
        appContextMap,
        documentLoader
      });

      const decodedDocument = await decode({
        appContextMap,
        cborldBytes: encodedBytes,
        documentLoader
      });

      expect(decodedDocument).to.eql({
        '@context': 'https://w3id.org/age/v1', overAge: 21
      });
    });

    it.skip('should round trip sample DID document', async () => {
      const SAMPLE_CONTEXT_URL = 'https://w3id.org/did/v0.11';
      const SAMPLE_CONTEXT = {
        '@context': {
          '@protected': 'true',
          id: '@id',
          type: '@type',
          authentication: {
            '@id': 'https://w3id.org/security#authenticationMethod',
            '@type': '@id',
            '@container': '@set'
          }
        }
      };
      // NOTE: not a real DID example, just a test for did:key encode/decode
      const jsonldDocument = {
        '@context': 'https://w3id.org/did/v0.11',
        id: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        authentication: [
          'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH' +
            '#z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH'
        ]
      };
      const appContextMap = new Map();
      appContextMap.set('https://w3id.org/did/v0.11', 0x8744);

      const documentLoader = url => {
        if(url === SAMPLE_CONTEXT_URL) {
          return {
            contextUrl: null,
            document: SAMPLE_CONTEXT,
            documentUrl: url
          };
        }
        throw new Error('Invalid context url, cannot load!');
      };

      const encodedBytes = await encode({
        jsonldDocument,
        appContextMap,
        documentLoader
      });

      expect(encodedBytes).equalBytes(
        'd90501a30119874405821904015822ed0194966b7c08e405775' +
        'f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5b20481' +
        '831904015822ed0194966b7c08e405775f8de6cc1c4508f6eb2' +
        '27403e1025b2c8ad2d7477398c5b25822ed0194966b7c08e405' +
        '775f8de6cc1c4508f6eb227403e1025b2c8ad2d7477398c5b2');
      console.log(Buffer.from(encodedBytes).toString('hex'));

      // FIXME: check bytes to ensure proper codec use for all URLs
      // can use to verify fix for id to @id alias not yet being supported

      const decodedDocument = await decode({
        appContextMap,
        cborldBytes: encodedBytes,
        documentLoader
      });

      expect(decodedDocument).to.eql(jsonldDocument);
    });
  });
});
