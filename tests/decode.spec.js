/*!
* Copyright (c) 2020-2024 Digital Bazaar, Inc. All rights reserved.
*/
import {
  default as chai,
  expect
} from 'chai';
import {default as chaiBytes} from 'chai-bytes';
chai.use(chaiBytes);

import {decode, encode} from '../lib/index.js';
import {
  STRING_TABLE,
  TYPE_TABLE,
} from '../lib/tables.js';

describe('cborld decode', () => {
  it('should decode empty document CBOR-LD bytes', async () => {
    const cborldBytes = new Uint8Array([0xd9, 0x06, 0x01, 0xa0]);
    const jsonldDocument = await decode({cborldBytes});
    expect(jsonldDocument).deep.equal({});
  });

  it('should decode empty JSON-LD document bytes with varint', async () => {
    const cborldBytes = new Uint8Array([0xd9, 0x06, 0x10, 0xa0]);
    const jsonldDocument = await decode({cborldBytes});
    expect(jsonldDocument).deep.equal({});
  });

  it('should decode empty JSON-LD document bytes with varint >1 byte',
    async () => {
      const cborldBytes = new Uint8Array(
        [0xd9, 0x06, 0x80, 0x81, 0x01, 0xa0]);
      const jsonldDocument = await decode({cborldBytes});
      expect(jsonldDocument).deep.equal({});
    });

  it('should decompress multibase-typed values', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'https://w3id.org/security#multibase'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      foo: ['MAQID', 'zLdp', 'uAQID']
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

    const cborldBytes = _hexToUint8Array(
      'd90601a200198000186583444d010203447a0102034475010203');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decompress multibase-typed values using type table',
    async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: ['MAQID', 'zLdp', 'uAQID']
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

      const cborldBytes = _hexToUint8Array(
        'd90601a200198000186583198001198002198003');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const multibaseTable = new Map();
      multibaseTable.set('MAQID', 0x8001);
      multibaseTable.set('zLdp', 0x8002);
      multibaseTable.set('uAQID', 0x8003);
      typeTable.set(
        'https://w3id.org/security#multibase',
        multibaseTable);

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });
  it(
    'should round trip multibase-typed values using type table if possible',
    async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          foo: {
            '@id': 'ex:foo',
            '@type': 'https://w3id.org/security#multibase'
          }
        }
      };
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: 'MAQID'
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

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      const multibaseTable = new Map();
      multibaseTable.set('MAQID', 0x8001);
      typeTable.set(
        'https://w3id.org/security#multibase',
        multibaseTable);

      const cborldBytes = await encode({
        jsonldDocument,
        registryEntryId: 1,
        documentLoader,
        typeTable
      });

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

  it('should decompress cryptosuite strings', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        foo: {
          '@id': 'ex:foo',
          '@type': 'https://w3id.org/security#cryptosuiteString'
        }
      }
    };
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      foo: [
        'ecdsa-rdfc-2019',
        'ecdsa-sd-2023',
        'eddsa-rdfc-2022'
      ]
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

    const cborldBytes = _hexToUint8Array('d90601a200198000186583010203');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decompress xsd date', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:date'
        }
      }
    };
    const date = '2021-04-09';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      foo: date
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

    const cborldBytes = _hexToUint8Array('d90601a20019800018661a606f9900');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decompress xsd dateTime', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      foo: date
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

    const cborldBytes = _hexToUint8Array('d90601a20019800018661a6070bb5f');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decompress xsd dateTime with type table when possible',
    async () => {
      const CONTEXT_URL = 'urn:foo';
      const CONTEXT = {
        '@context': {
          arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
          foo: {
            '@id': 'ex:foo',
            '@type': 'arbitraryPrefix:dateTime'
          }
        }
      };
      const date = '2021-04-09T20:38:55Z';
      const jsonldDocument = {
        '@context': CONTEXT_URL,
        foo: date
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

      const cborldBytes = _hexToUint8Array('d90601a2001980001866428001');

      const typeTable = new Map(TYPE_TABLE);

      const contextTable = new Map(STRING_TABLE);
      contextTable.set(CONTEXT_URL, 0x8000);
      typeTable.set('context', contextTable);

      typeTable.set(
        'http://www.w3.org/2001/XMLSchema#dateTime',
        new Map([['2021-04-09T20:38:55Z', 0x8001]]));

      const decodedDocument = await decode({
        cborldBytes,
        documentLoader,
        typeTable
      });
      expect(decodedDocument).to.eql(jsonldDocument);
    });

  it('should decode lowercase urn:uuid', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        id: '@id',
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      id: 'urn:uuid:75ef3fcc-9ae3-11eb-8e3e-10bf48838a41',
      foo: date
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

    const cborldBytes = _hexToUint8Array(
      'd90601a30019800018661a6070bb5f186882035075ef3fcc9ae311eb8e3e' +
      '10bf48838a41');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decode uppercase urn:uuid', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        id: '@id',
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      id: 'urn:uuid:75EF3FCC-9AE3-11EB-8E3E-10BF48838A41',
      foo: date
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

    const cborldBytes = _hexToUint8Array(
      'd90601a30019800018661a6070bb5f1868820378243735454633464343' +
      '2d394145332d313145422d384533452d313042463438383338413431');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decode https URL', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        id: '@id',
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      id: 'https://test.example',
      foo: date
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

    const cborldBytes = _hexToUint8Array(
      'd90601a30019800018661a6070bb5f186882026c746573742e6578616d706c65');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decode http URL', async () => {
    const CONTEXT_URL = 'urn:foo';
    const CONTEXT = {
      '@context': {
        id: '@id',
        arbitraryPrefix: 'http://www.w3.org/2001/XMLSchema#',
        foo: {
          '@id': 'ex:foo',
          '@type': 'arbitraryPrefix:dateTime'
        }
      }
    };
    const date = '2021-04-09T20:38:55Z';
    const jsonldDocument = {
      '@context': CONTEXT_URL,
      id: 'http://test.example',
      foo: date
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

    const cborldBytes = _hexToUint8Array(
      'd90601a30019800018661a6070bb5f186882016c746573742e6578616d706c65');

    const typeTable = new Map(TYPE_TABLE);

    const contextTable = new Map(STRING_TABLE);
    contextTable.set(CONTEXT_URL, 0x8000);
    typeTable.set('context', contextTable);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });
    expect(decodedDocument).to.eql(jsonldDocument);
  });

  it('should decode a CIT type token', async () => {
    const cborldBytes = _hexToUint8Array(
      'd90601a40015186c1864186e4c7ad90501a2011987430518411870583b7a' +
      '0000e190818fdd92908425370e0b5dad9ad92dc956b5ec2ab41ce76b8c70' +
      'cb859a7c88ca6ba68b1ff238a70ed674999b6ff5179b0ebb10140b23');

    const CONTEXT_URL = 'https://w3id.org/cit/v1';
    /* eslint-disable max-len */
    const CONTEXT = {
      '@context': {
        '@protected': true,
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
    /* eslint-enable max-len */

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

    const jsonldDocument = {
      '@context': 'https://w3id.org/cit/v1',
      type: 'ConcealedIdToken',
      meta: 'zvpJ2L5sbowrJPdA',
      // eslint-disable-next-line max-len
      payload: 'z1177JK4h25dHEAXAVMUMpn2zWcxLCeMLP3oVFQFQ11xHFtE9BhyoU2g47D6Xod1Mu99JR9YJdY184HY'
    };

    const typeTable = new Map(TYPE_TABLE);

    const decodedDocument = await decode({
      cborldBytes,
      documentLoader,
      typeTable
    });

    expect(decodedDocument).to.eql(jsonldDocument);
  });
});

function _hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// eslint-disable-next-line no-unused-vars
function _uint8ArrayToHex(bytes) {
  return [...bytes].map(d => d.toString(16).padStart(2, '0')).join('');
}
